'use client';

import { useState, useEffect } from 'react';
import { 
  CreditCardIcon, 
  CalendarIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface UserSubscription {
  id: string;
  status: string;
  plan_id: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  subscription_plans: {
    name: string;
    amount: number;
    features: any;
  };
}

interface SubscriptionHistory {
  id: string;
  action: string;
  created_at: string;
  metadata: any;
  subscription_plans: {
    name: string;
    amount: number;
    currency: string;
  };
}

const DashboardPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    fetchSubscription();
    fetchHistory();
  }, [isAuthenticated, authLoading, router]);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/subscriptions/current`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSubscription(data.data);
        }
      }
    } catch (error) {
      console.error('Fetch subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/subscriptions/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setHistory(data.data || []);
        }
      }
    } catch (error) {
      console.error('Fetch history error:', error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription || actionLoading) return;

    const confirmed = window.confirm('サブスクリプションをキャンセルしますか？現在の期間終了時に停止されます。');
    if (!confirmed) return;

    setActionLoading('cancel');
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('サブスクリプションがキャンセルされました');
        fetchSubscription();
        fetchHistory();
      } else {
        toast.error(data.error || 'キャンセルに失敗しました');
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast.error('キャンセルに失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeSubscription = async () => {
    if (!subscription || actionLoading) return;

    setActionLoading('resume');
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/subscriptions/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('サブスクリプションが再開されました');
        fetchSubscription();
        fetchHistory();
      } else {
        toast.error(data.error || '再開に失敗しました');
      }
    } catch (error) {
      console.error('Resume subscription error:', error);
      toast.error('再開に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenCustomerPortal = async () => {
    if (!subscription || actionLoading) return;

    setActionLoading('portal');
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/subscriptions/portal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success && data.data.portal_url) {
        window.open(data.data.portal_url, '_blank');
      } else {
        toast.error(data.error || 'ポータルの開設に失敗しました');
      }
    } catch (error) {
      console.error('Open customer portal error:', error);
      toast.error('ポータルの開設に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'canceled':
        return 'text-red-600 bg-red-100';
      case 'past_due':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'アクティブ';
      case 'canceled':
        return 'キャンセル済み';
      case 'past_due':
        return '支払い遅延';
      default:
        return status;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'created':
        return '作成';
      case 'updated':
        return '更新';
      case 'canceled':
        return 'キャンセル';
      case 'resumed':
        return '再開';
      case 'payment_succeeded':
        return '支払い成功';
      case 'payment_failed':
        return '支払い失敗';
      default:
        return action;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // useEffectでリダイレクトが実行される
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
              <p className="mt-2 text-gray-600">
                こんにちは、{user?.username}さん！あなたのアカウントとサブスクリプションの概要
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">ログイン中</p>
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* サブスクリプション情報 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <CreditCardIcon className="h-6 w-6 mr-2 text-blue-600" />
                  サブスクリプション
                </h2>
                {subscription && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
                    {getStatusText(subscription.status)}
                  </span>
                )}
              </div>

              {subscription ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">現在のプラン</h3>
                      <p className="text-lg font-semibold text-gray-900">
                        {subscription.subscription_plans.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        ¥{subscription.subscription_plans.amount.toLocaleString()}/月
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">次回請求日</h3>
                      <p className="text-lg font-semibold text-gray-900 flex items-center">
                        <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
                        {formatDate(subscription.current_period_end)}
                      </p>
                    </div>
                  </div>

                  {subscription.cancel_at_period_end && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                        <p className="text-sm text-yellow-800">
                          サブスクリプションは {formatDate(subscription.current_period_end)} にキャンセルされます
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {subscription.cancel_at_period_end ? (
                      <button
                        onClick={handleResumeSubscription}
                        disabled={actionLoading === 'resume'}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {actionLoading === 'resume' ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                        )}
                        サブスクリプションを再開
                      </button>
                    ) : (
                      <button
                        onClick={handleCancelSubscription}
                        disabled={actionLoading === 'cancel'}
                        className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {actionLoading === 'cancel' ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                        ) : (
                          <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                        )}
                        サブスクリプションをキャンセル
                      </button>
                    )}
                    
                    <button
                      onClick={handleOpenCustomerPortal}
                      disabled={actionLoading === 'portal'}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {actionLoading === 'portal' ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      ) : (
                        <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                      )}
                      請求情報を管理
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    サブスクリプションが見つかりません
                  </h3>
                  <p className="text-gray-600 mb-4">
                    プランを選択してCode Chatの全機能をご利用ください
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    プランを選択
                  </Link>
                </div>
              )}
            </div>

            {/* 履歴 */}
            {history.length > 0 && (
              <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">サブスクリプション履歴</h2>
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getActionText(item.action)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                      {item.subscription_plans && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {item.subscription_plans.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            ¥{item.subscription_plans.amount.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* 統計情報 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">統計情報</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm text-gray-600">作成したルーム</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">-</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <UsersIcon className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm text-gray-600">参加したルーム</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">-</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ChatBubbleLeftIcon className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="text-sm text-gray-600">送信したメッセージ</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">-</span>
                </div>
              </div>
            </div>

            {/* クイックアクション */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h3>
              <div className="space-y-3">
                <Link
                  href="/create-room"
                  className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  新しいルームを作成
                </Link>
                <Link
                  href="/rooms"
                  className="block w-full text-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  ルーム一覧を見る
                </Link>
                <Link
                  href="/profile"
                  className="block w-full text-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  プロフィール設定
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;