import { Router, Request, Response } from 'express';
import { stripe } from '../lib/stripe';
import { supabase } from '../lib/supabase';
import { logSecurityEvent } from '../middleware/security';

const router = Router();

// Stripe Webhook エンドポイント
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('Stripe webhook secret not configured');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  let event;

  try {
    // Stripe Webhook署名検証
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    logSecurityEvent('stripe_webhook_verification_failed', {
      error: err.message,
      signature: sig
    }, req, 'high');
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  // 重複処理防止
  const { data: existingEvent } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existingEvent) {
    console.log(`Event ${event.id} already processed`);
    res.status(200).json({ received: true, status: 'already_processed' });
    return;
  }

  // イベントログ記録
  await supabase
    .from('stripe_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed: false
    });

  try {
    // イベントタイプ別処理
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // 処理完了マーク
    await supabase
      .from('stripe_events')
      .update({ processed: true })
      .eq('stripe_event_id', event.id);

    res.status(200).json({ received: true, processed: true });

  } catch (error: any) {
    console.error(`Error processing webhook ${event.type}:`, error);
    
    // エラー記録
    await supabase
      .from('stripe_events')
      .update({ 
        processed: false,
        error_message: error.message 
      })
      .eq('stripe_event_id', event.id);

    logSecurityEvent('stripe_webhook_processing_error', {
      eventType: event.type,
      eventId: event.id,
      error: error.message
    }, req, 'medium');

    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// サブスクリプション作成処理
async function handleSubscriptionCreated(event: any) {
  const subscription = event.data.object;
  const customerId = subscription.customer;
  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0].price.id;

  console.log(`Processing subscription created: ${subscriptionId}`);

  // プラン情報取得
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('stripe_price_id', priceId)
    .single();

  if (!plan) {
    throw new Error(`Plan not found for price ID: ${priceId}`);
  }

  // 既存のサブスクリプション確認
  const { data: existingSubscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();

  const subscriptionData = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan_id: plan.id,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  };

  if (existingSubscription) {
    // 既存サブスクリプション更新
    await supabase
      .from('user_subscriptions')
      .update(subscriptionData)
      .eq('id', existingSubscription.id);

    // 履歴記録
    await supabase
      .from('subscription_history')
      .insert({
        user_id: existingSubscription.user_id,
        subscription_id: existingSubscription.id,
        plan_id: plan.id,
        action: 'updated',
        stripe_event_id: event.id,
        metadata: { 
          event_type: 'subscription.created',
          new_status: subscription.status 
        }
      });
  } else {
    // Stripe CustomerからユーザーID取得
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer || customer.deleted) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    // メールアドレスからユーザー取得
    const { data: authUser } = await supabase.auth.admin.listUsers();

    if (!authUser.users || authUser.users.length === 0) {
      throw new Error(`User not found for email: ${(customer as any).email}`);
    }
    const user = authUser.users.find((u: any) => u.email === (customer as any).email);
    if (!user) {
      throw new Error(`User not found for email: ${(customer as any).email}`);
    }

    // 新規サブスクリプション作成
    const { data: newSubscription } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        ...subscriptionData
      })
      .select()
      .single();

    // 履歴記録
    await supabase
      .from('subscription_history')
      .insert({
        user_id: user.id,
        subscription_id: newSubscription.id,
        plan_id: plan.id,
        action: 'created',
        stripe_event_id: event.id,
        metadata: { 
          event_type: 'subscription.created',
          initial_status: subscription.status 
        }
      });
  }
}

// サブスクリプション更新処理
async function handleSubscriptionUpdated(event: any) {
  const subscription = event.data.object;
  const subscriptionId = subscription.id;

  console.log(`Processing subscription updated: ${subscriptionId}`);

  // 既存サブスクリプション取得
  const { data: existingSubscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!existingSubscription) {
    console.error(`Subscription not found in database: ${subscriptionId}`);
    return;
  }

  // サブスクリプション更新
  await supabase
    .from('user_subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString()
    })
    .eq('id', existingSubscription.id);

  // 履歴記録
  await supabase
    .from('subscription_history')
    .insert({
      user_id: existingSubscription.user_id,
      subscription_id: existingSubscription.id,
      plan_id: existingSubscription.plan_id,
      action: 'updated',
      stripe_event_id: event.id,
      metadata: { 
        event_type: 'subscription.updated',
        new_status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end
      }
    });
}

// サブスクリプション削除処理
async function handleSubscriptionDeleted(event: any) {
  const subscription = event.data.object;
  const subscriptionId = subscription.id;

  console.log(`Processing subscription deleted: ${subscriptionId}`);

  // 既存サブスクリプション取得
  const { data: existingSubscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!existingSubscription) {
    console.error(`Subscription not found in database: ${subscriptionId}`);
    return;
  }

  // サブスクリプション削除
  await supabase
    .from('user_subscriptions')
    .delete()
    .eq('id', existingSubscription.id);

  // 履歴記録
  await supabase
    .from('subscription_history')
    .insert({
      user_id: existingSubscription.user_id,
      subscription_id: null, // 削除されたので null
      plan_id: existingSubscription.plan_id,
      action: 'canceled',
      stripe_event_id: event.id,
      metadata: { 
        event_type: 'subscription.deleted',
        final_status: subscription.status
      }
    });
}

// 支払い成功処理
async function handlePaymentSucceeded(event: any) {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) return;

  console.log(`Processing payment succeeded for subscription: ${subscriptionId}`);

  // サブスクリプション取得
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!subscription) {
    console.error(`Subscription not found: ${subscriptionId}`);
    return;
  }

  // 履歴記録
  await supabase
    .from('subscription_history')
    .insert({
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      plan_id: subscription.plan_id,
      action: 'payment_succeeded',
      stripe_event_id: event.id,
      metadata: { 
        event_type: 'invoice.payment_succeeded',
        amount: invoice.amount_paid,
        currency: invoice.currency
      }
    });
}

// 支払い失敗処理
async function handlePaymentFailed(event: any) {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) return;

  console.log(`Processing payment failed for subscription: ${subscriptionId}`);

  // サブスクリプション取得
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!subscription) {
    console.error(`Subscription not found: ${subscriptionId}`);
    return;
  }

  // 履歴記録
  await supabase
    .from('subscription_history')
    .insert({
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      plan_id: subscription.plan_id,
      action: 'payment_failed',
      stripe_event_id: event.id,
      metadata: { 
        event_type: 'invoice.payment_failed',
        amount: invoice.amount_due,
        currency: invoice.currency,
        failure_reason: invoice.last_finalization_error?.message
      }
    });
}

export default router;