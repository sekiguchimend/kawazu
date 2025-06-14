import Stripe from 'stripe';

// テストモード設定 - モックキーまたはキーなしの場合はテストモード
export const IS_TEST_MODE = process.env.NODE_ENV === 'development' && 
  (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('mock'));

// デバッグログ追加
console.log('🔍 Stripe Configuration:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
console.log('STRIPE_SECRET_KEY value:', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 30) + '...' : 'undefined');
console.log('STRIPE_SECRET_KEY contains mock:', process.env.STRIPE_SECRET_KEY?.includes('mock'));
console.log('IS_TEST_MODE:', IS_TEST_MODE);

let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('mock')) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    typescript: true,
  });
} else if (!IS_TEST_MODE) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

export { stripe };

export const SUBSCRIPTION_PLANS = {
  BASIC: {
    name: 'ベーシック',
    priceId: 'price_basic_1000_jpy',
    amount: 1000,
    currency: 'jpy',
    features: {
      max_rooms: 5,
      max_participants_per_room: 10,
      storage_gb: 1
    }
  },
  STANDARD: {
    name: 'スタンダード',
    priceId: 'price_standard_3000_jpy',
    amount: 3000,
    currency: 'jpy',
    features: {
      max_rooms: 20,
      max_participants_per_room: 50,
      storage_gb: 10,
      advanced_features: true
    }
  },
  PREMIUM: {
    name: 'プレミアム',
    priceId: 'price_premium_5000_jpy',
    amount: 5000,
    currency: 'jpy',
    features: {
      max_rooms: 'unlimited',
      max_participants_per_room: 'unlimited',
      storage_gb: 100,
      advanced_features: true,
      priority_support: true
    }
  }
} as const;

// Stripe Customer作成
export const createStripeCustomer = async (email: string, name?: string) => {
  if (IS_TEST_MODE) {
    return {
      id: `cus_test_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
    };
  }
  
  const customer = await stripe!.customers.create({
    email,
    name,
  });
  return customer;
};

// Checkout Session作成
export const createCheckoutSession = async (
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) => {
  if (IS_TEST_MODE) {
    const sessionId = `cs_test_${Math.random().toString(36).substr(2, 9)}`;
    const testSuccessUrl = successUrl
      .replace('{CHECKOUT_SESSION_ID}', sessionId)
      + `&price_id=${priceId}`;
    
    return {
      id: sessionId,
      url: testSuccessUrl,
      customer: customerId,
      mode: 'subscription',
    };
  }
  
  const session = await stripe!.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 7, // 7日間無料トライアル
    },
  });
  return session;
};

// Customer Portal Session作成
export const createCustomerPortalSession = async (
  customerId: string,
  returnUrl: string
) => {
  if (IS_TEST_MODE) {
    return {
      id: `bps_test_${Math.random().toString(36).substr(2, 9)}`,
      url: returnUrl + '?test_portal=true',
      customer: customerId,
    };
  }
  
  const session = await stripe!.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session;
};

// サブスクリプション取得
export const getSubscription = async (subscriptionId: string) => {
  if (IS_TEST_MODE) {
    return {
      id: subscriptionId,
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30日後
      cancel_at_period_end: false,
    };
  }
  
  const subscription = await stripe!.subscriptions.retrieve(subscriptionId);
  return subscription;
};

// サブスクリプションキャンセル
export const cancelSubscription = async (subscriptionId: string) => {
  if (IS_TEST_MODE) {
    return {
      id: subscriptionId,
      status: 'active',
      cancel_at_period_end: true,
    };
  }
  
  const subscription = await stripe!.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
  return subscription;
};

// サブスクリプション再開
export const resumeSubscription = async (subscriptionId: string) => {
  if (IS_TEST_MODE) {
    return {
      id: subscriptionId,
      status: 'active',
      cancel_at_period_end: false,
    };
  }
  
  const subscription = await stripe!.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
  return subscription;
};