import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.warn('Stripe publishable key is not set - running in test mode');
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
};

export const SUBSCRIPTION_PLANS = {
  BASIC: {
    name: 'ベーシック',
    priceId: 'price_basic_1000_jpy',
    amount: 1000,
    currency: 'jpy',
    features: [
      'ルーム作成: 5個',
      'ルーム参加者: 10人',
      'ストレージ: 1GB'
    ]
  },
  STANDARD: {
    name: 'スタンダード',
    priceId: 'price_standard_3000_jpy',
    amount: 3000,
    currency: 'jpy',
    features: [
      'ルーム作成: 20個',
      'ルーム参加者: 50人',
      'ストレージ: 10GB',
      '高度な機能'
    ]
  },
  PREMIUM: {
    name: 'プレミアム',
    priceId: 'price_premium_5000_jpy',
    amount: 5000,
    currency: 'jpy',
    features: [
      'ルーム作成: 無制限',
      'ルーム参加者: 無制限',
      'ストレージ: 100GB',
      '高度な機能',
      '優先サポート'
    ]
  }
} as const;