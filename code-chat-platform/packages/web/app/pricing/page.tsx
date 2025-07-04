'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface SubscriptionPlan {
  id: string;
  name: string;
  stripe_price_id: string;
  amount: number;
  currency: string;
  features: {
    max_rooms?: number | string;
    max_participants_per_room?: number | string;
    storage_gb?: number;
    advanced_features?: boolean;
    priority_support?: boolean;
  };
}

interface UserSubscription {
  id: string;
  status: string;
  plan_id: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  subscription_plans: {
    name: string;
    amount: number;
    features: any;
  };
}

// フォールバック用の静的プランデータ
const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'ベーシック',
    stripe_price_id: 'price_basic_1000_jpy',
    amount: 1000,
    currency: 'jpy',
    features: {
      max_rooms: 5,
      max_participants_per_room: 10,
      storage_gb: 1
    }
  },
  {
    id: 'standard',
    name: 'スタンダード',
    stripe_price_id: 'price_standard_3000_jpy',
    amount: 3000,
    currency: 'jpy',
    features: {
      max_rooms: 20,
      max_participants_per_room: 50,
      storage_gb: 10,
      advanced_features: true
    }
  },
  {
    id: 'premium',
    name: 'プレミアム',
    stripe_price_id: 'price_premium_5000_jpy',
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
];

const PricingPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(FALLBACK_PLANS);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    if (isAuthenticated) {
      fetchCurrentSubscription();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchPlans = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kawazu.onrender.com';
      const response = await fetch(`${apiUrl}/api/subscriptions/plans`);
      
      if (!response.ok) {
        console.warn('Failed to fetch plans from API, using fallback data');
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error('Fetch plans error:', error);
      console.log('Using fallback plan data');
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kawazu.onrender.com';
      const response = await fetch(`${apiUrl}/api/subscriptions/current`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCurrentSubscription(data.data);
        }
      }
    } catch (error) {
      console.error('Fetch current subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    if (!isAuthenticated || !user) {
      toast.error('決済を開始するにはログインが必要です');
      router.push('/auth');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('認証トークンが見つかりません');
      router.push('/auth');
      return;
    }

    setProcessingPlan(priceId);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kawazu.onrender.com';
      console.log('Starting checkout process...', { priceId, apiUrl });
      
      const response = await fetch(`${apiUrl}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ price_id: priceId })
      });

      console.log('Checkout response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Checkout API error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Checkout response data:', data);

      if (data.success && data.data?.checkout_url) {
        console.log('Redirecting to checkout URL:', data.data.checkout_url);
        // 直接リダイレクトして#にならないようにする
        window.location.href = data.data.checkout_url;
      } else {
        throw new Error(data.error || 'チェックアウトURLが取得できませんでした');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(`決済の開始に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!isAuthenticated) {
      toast.error('ログインが必要です');
      router.push('/auth');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('認証トークンが見つかりません');
      router.push('/auth');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kawazu.onrender.com';
      const response = await fetch(`${apiUrl}/api/subscriptions/portal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data?.portal_url) {
        window.location.href = data.data.portal_url;
      } else {
        toast.error('管理ポータルの作成に失敗しました');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('管理ポータルの作成に失敗しました');
    }
  };

  const formatFeatureValue = (value: any) => {
    if (value === 'unlimited') return '無制限';
    if (typeof value === 'number') return value.toLocaleString();
    return value;
  };

  const getFeatureList = (features: any) => {
    const featureList = [];
    
    if (features.max_rooms) {
      featureList.push(`ルーム作成: ${formatFeatureValue(features.max_rooms)}個`);
    }
    if (features.max_participants_per_room) {
      featureList.push(`ルーム参加者: ${formatFeatureValue(features.max_participants_per_room)}人`);
    }
    if (features.storage_gb) {
      featureList.push(`ストレージ: ${features.storage_gb}GB`);
    }
    if (features.advanced_features) {
      featureList.push('高度な機能');
    }
    if (features.priority_support) {
      featureList.push('優先サポート');
    }
    
    return featureList;
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.plan_id === planId;
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            料金プラン
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            あなたのチームに最適なプランを選択してください
          </p>
          {!isAuthenticated && (
            <div className="mt-6 inline-flex items-center px-4 py-2 rounded-full bg-yellow-100 text-yellow-800">
              <span className="text-sm">サブスクリプションを開始するには、まず</span>
              <Link href="/auth" className="ml-1 font-semibold hover:underline">ログイン</Link>
              <span className="text-sm">が必要です</span>
            </div>
          )}
          {currentSubscription && (
            <div className="mt-6 inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800">
              <CheckIcon className="w-5 h-5 mr-2" />
              現在のプラン: {currentSubscription.subscription_plans.name}
            </div>
          )}
        </div>

        {/* 現在のサブスクリプション管理 */}
        {currentSubscription && (
          <div className="mt-8 max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                サブスクリプション管理
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                請求情報の確認、プラン変更、キャンセルが可能です
              </p>
              <button
                onClick={handleManageSubscription}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition duration-200"
              >
                管理ポータルを開く
              </button>
            </div>
          </div>
        )}

        {/* 料金プラン */}
        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {plans.map((plan) => {
            const features = getFeatureList(plan.features);
            const isCurrent = isCurrentPlan(plan.id);
            const isProcessing = processingPlan === plan.stripe_price_id;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                  plan.name === 'スタンダード' ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {plan.name === 'スタンダード' && (
                  <div className="bg-blue-500 text-white text-center py-2 text-sm font-medium">
                    おすすめ
                  </div>
                )}
                
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      ¥{plan.amount.toLocaleString()}
                    </span>
                    <span className="text-gray-600">/月</span>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-600">
                    7日間無料トライアル
                  </div>

                  <ul className="mt-6 space-y-3">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    {isCurrent ? (
                      <div className="w-full bg-green-100 text-green-800 py-2 px-4 rounded-md text-center font-medium">
                        現在のプラン
                      </div>
                    ) : (
                      <button
                        onClick={() => isAuthenticated ? handleSubscribe(plan.stripe_price_id) : router.push('/auth')}
                        disabled={isProcessing || !!currentSubscription}
                        className={`w-full py-2 px-4 rounded-md font-medium transition duration-200 ${
                          plan.name === 'スタンダード'
                            ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-300'
                        }`}
                      >
                        {isProcessing ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            処理中...
                          </div>
                        ) : currentSubscription ? (
                          'プラン変更は管理ポータルから'
                        ) : !isAuthenticated ? (
                          'ログインして開始'
                        ) : (
                          '開始する'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            よくある質問
          </h2>
          
          <div className="max-w-3xl mx-auto space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                無料トライアルはありますか？
              </h3>
              <p className="text-gray-600">
                はい、すべてのプランで7日間の無料トライアルをご利用いただけます。トライアル期間中はいつでもキャンセル可能で、料金は発生しません。
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                プランの変更は可能ですか？
              </h3>
              <p className="text-gray-600">
                はい、いつでもプランの変更が可能です。管理ポータルからアップグレードやダウングレードができます。
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                キャンセル方法を教えてください
              </h3>
              <p className="text-gray-600">
                管理ポータルからいつでもキャンセルできます。キャンセル後も、現在の請求期間が終了するまでサービスをご利用いただけます。
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                支払い方法は何が利用できますか？
              </h3>
              <p className="text-gray-600">
                クレジットカード（Visa、MasterCard、American Express、JCB）での支払いが可能です。
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default PricingPage;