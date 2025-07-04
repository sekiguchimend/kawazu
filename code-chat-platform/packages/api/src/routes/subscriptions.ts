import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { 
  stripe, 
  SUBSCRIPTION_PLANS, 
  createStripeCustomer, 
  createCheckoutSession,
  createCustomerPortalSession,
  getSubscription,
  cancelSubscription,
  resumeSubscription
} from '../lib/stripe';
import { logSecurityEvent } from '../middleware/security';

const router = Router();

// サブスクリプションプラン一覧取得
router.get('/plans', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Getting subscription plans...');
    
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('amount', { ascending: true });

    console.log('📋 Subscription plans query result:', { 
      plans: plans?.length || 0, 
      error: error?.message || 'none' 
    });

    if (error) {
      console.error('❌ Get subscription plans error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get subscription plans',
        details: error.message
      });
      return;
    }

    console.log('✅ Subscription plans retrieved successfully:', plans?.length || 0);
    res.json({
      success: true,
      data: plans || []
    });

  } catch (error) {
    console.error('💥 Get subscription plans catch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 現在のサブスクリプション取得
router.get('/current', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    console.log(`🔍 Getting current subscription for user: ${userId}`);

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          id,
          name,
          amount,
          currency,
          features
        )
      `)
      .eq('user_id', userId)
      .single();

    console.log('📋 Current subscription query result:', { 
      found: !!subscription, 
      error: error?.message || 'none',
      errorCode: error?.code
    });

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Get current subscription error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get subscription',
        details: error.message
      });
      return;
    }

    console.log('✅ Current subscription retrieved:', subscription ? 'found' : 'none');
    res.json({
      success: true,
      data: subscription
    });

  } catch (error) {
    console.error('💥 Get current subscription catch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// チェックアウトセッション作成
router.post('/checkout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const { price_id } = req.body;

    if (!price_id) {
      res.status(400).json({
        success: false,
        error: 'Price ID is required'
      });
      return;
    }

    // プラン存在確認
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('stripe_price_id', price_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      res.status(404).json({
        success: false,
        error: 'Invalid subscription plan'
      });
      return;
    }

    // 既存のサブスクリプション確認
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingSubscription && existingSubscription.status === 'active') {
      res.status(409).json({
        success: false,
        error: 'User already has an active subscription'
      });
      return;
    }

    // Stripe Customer作成または取得
    let customerId = existingSubscription?.stripe_customer_id;
    
    if (!customerId) {
      const customer = await createStripeCustomer(userEmail!, req.user?.username);
      customerId = customer.id;
    }

    // Checkout Session作成
    const frontendUrl = process.env.FRONTEND_URL || 'https://kawazu-web.vercel.app';
    const session = await createCheckoutSession(
      customerId,
      price_id,
      `${frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      `${frontendUrl}/pricing`
    );

    // セキュリティログ
    logSecurityEvent('subscription_checkout_created', {
      userId,
      priceId: price_id,
      planName: plan.name,
      sessionId: session.id
    }, req, 'low');

    res.json({
      success: true,
      data: {
        checkout_url: session.url,
        session_id: session.id
      }
    });

  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session'
    });
  }
});

// カスタマーポータル作成
router.post('/portal', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // ユーザーのサブスクリプション取得
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (error || !subscription?.stripe_customer_id) {
      res.status(404).json({
        success: false,
        error: 'No subscription found'
      });
      return;
    }

    // カスタマーポータルセッション作成
    const frontendUrl = process.env.FRONTEND_URL || 'https://kawazu-web.vercel.app';
    const portalSession = await createCustomerPortalSession(
      subscription.stripe_customer_id,
      `${frontendUrl}/dashboard`
    );

    logSecurityEvent('customer_portal_accessed', {
      userId,
      customerId: subscription.stripe_customer_id
    }, req, 'low');

    res.json({
      success: true,
      data: {
        portal_url: portalSession.url
      }
    });

  } catch (error) {
    console.error('Create customer portal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create customer portal session'
    });
  }
});

// サブスクリプションキャンセル
router.post('/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // ユーザーのサブスクリプション取得
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      res.status(404).json({
        success: false,
        error: 'No subscription found'
      });
      return;
    }

    if (subscription.status !== 'active') {
      res.status(400).json({
        success: false,
        error: 'Subscription is not active'
      });
      return;
    }

    // Stripeでサブスクリプションキャンセル
    await cancelSubscription(subscription.stripe_subscription_id);

    // データベース更新
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({ 
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Update subscription error:', updateError);
      res.status(500).json({
        success: false,
        error: 'Failed to update subscription'
      });
      return;
    }

    // 履歴記録
    await supabase
      .from('subscription_history')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        plan_id: subscription.plan_id,
        action: 'canceled',
        metadata: { 
          canceled_by: 'user',
          cancel_at_period_end: true 
        }
      });

    logSecurityEvent('subscription_canceled', {
      userId,
      subscriptionId: subscription.id
    }, req, 'low');

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current period'
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

// サブスクリプション再開
router.post('/resume', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // ユーザーのサブスクリプション取得
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      res.status(404).json({
        success: false,
        error: 'No subscription found'
      });
      return;
    }

    if (!subscription.cancel_at_period_end) {
      res.status(400).json({
        success: false,
        error: 'Subscription is not set to cancel'
      });
      return;
    }

    // Stripeでサブスクリプション再開
    await resumeSubscription(subscription.stripe_subscription_id);

    // データベース更新
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({ 
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Update subscription error:', updateError);
      res.status(500).json({
        success: false,
        error: 'Failed to update subscription'
      });
      return;
    }

    // 履歴記録
    await supabase
      .from('subscription_history')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        plan_id: subscription.plan_id,
        action: 'resumed',
        metadata: { 
          resumed_by: 'user'
        }
      });

    logSecurityEvent('subscription_resumed', {
      userId,
      subscriptionId: subscription.id
    }, req, 'low');

    res.json({
      success: true,
      message: 'Subscription has been resumed'
    });

  } catch (error) {
    console.error('Resume subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume subscription'
    });
  }
});

// サブスクリプション履歴取得
router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: history, error } = await supabase
      .from('subscription_history')
      .select(`
        *,
        subscription_plans (
          name,
          amount,
          currency
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Get subscription history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get subscription history'
      });
      return;
    }

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// テスト用サブスクリプション完了処理
router.post('/test/complete', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      res.status(403).json({
        success: false,
        error: 'Test endpoint only available in development'
      });
      return;
    }

    const userId = req.user?.id;
    const { session_id, price_id } = req.body;

    if (!session_id || !price_id) {
      res.status(400).json({
        success: false,
        error: 'Session ID and Price ID are required'
      });
      return;
    }

    console.log('Processing test subscription completion:', { userId, session_id, price_id });

    // プラン情報取得
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('stripe_price_id', price_id)
      .single();

    if (planError || !plan) {
      res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
      return;
    }

    // 既存のサブスクリプション確認
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    const testCustomerId = `cus_test_${userId}`;
    const testSubscriptionId = `sub_test_${Math.random().toString(36).substr(2, 9)}`;

    if (existingSubscription) {
      // 既存サブスクリプションを更新
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          plan_id: plan.id,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
          cancel_at_period_end: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubscription.id);

      if (updateError) {
        console.error('Update subscription error:', updateError);
        res.status(500).json({
          success: false,
          error: 'Failed to update subscription'
        });
        return;
      }
    } else {
      // 新しいサブスクリプションを作成
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          stripe_customer_id: testCustomerId,
          stripe_subscription_id: testSubscriptionId,
          plan_id: plan.id,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
          cancel_at_period_end: false
        });

      if (insertError) {
        console.error('Insert subscription error:', insertError);
        res.status(500).json({
          success: false,
          error: 'Failed to create subscription'
        });
        return;
      }
    }

    // 履歴記録
    await supabase
      .from('subscription_history')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        action: 'created',
        metadata: { 
          session_id,
          test_mode: true,
          plan_name: plan.name 
        }
      });

    console.log('Test subscription completed successfully');

    res.json({
      success: true,
      message: 'Test subscription completed'
    });

  } catch (error) {
    console.error('Test subscription completion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete test subscription'
    });
  }
});

export default router;