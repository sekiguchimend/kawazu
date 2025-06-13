'use client';

import { useState, useEffect } from 'react';
import { 
  CreditCardIcon, 
  CalendarIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  UsersIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

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

interface DashboardStats {
  rooms_created: number;
  total_messages: number;
  active_participants: number;
}

const DashboardPage = () => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/auth';
        return;
      }

      // サブスクリプション情報を取得
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const subResponse = await fetch(`${apiUrl}/api/subscriptions/current`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!subResponse.ok) {
        throw new Error(`HTTP error! status: ${subResponse.status}`);
      }
      
      const subData = await subResponse.json();
      
      if (subData.success && subData.data) {
        setSubscription(subData.data);
      }

      // TODO: 統計情報を取得するAPIエンドポイントを作成
      // 一時的にダミーデータを設定
      setStats({
        rooms_created: 5,
        total_messages: 127,
        active_participants: 23
      });

    } catch (error) {
      console.error('Fetch dashboard data error:', error);
      toast.error('ダッシュボードデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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

      if (data.success) {
        window.location.href = data.data.portal_url;
      } else {
        toast.error('管理ポータルの作成に失敗しました');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('管理ポータルの作成に失敗しました');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'past_due':
        return 'text-yellow-600 bg-yellow-100';
      case 'canceled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'アクティブ';
      case 'past_due':
        return '支払い遅延';
      case 'canceled':
        return 'キャンセル済み';
      case 'incomplete':
        return '不完全';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-2 text-gray-600">
            あなたのアカウントとサブスクリプションの概要
          </p>
        </div>

        {/* サブスクリプション情報 */}
        <div className="mb-8 bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <CreditCardIcon className="w-6 h-6 mr-2" />
                サブスクリプション
              </h2>
              {subscription && (
                <button
                  onClick={handleManageSubscription}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
                >
                  管理
                </button>
              )}
            </div>

            {subscription ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    プラン
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscription.subscription_plans.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    ¥{subscription.subscription_plans.amount.toLocaleString()}/月
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(subscription.status)}`}>
                    {getStatusText(subscription.status)}
                  </span>
                  {subscription.cancel_at_period_end && (
                    <p className="text-xs text-red-600 mt-1">
                      期間終了時にキャンセル予定
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    請求期間開始
                  </label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {formatDate(subscription.current_period_start)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    次回請求日
                  </label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {formatDate(subscription.current_period_end)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  サブスクリプションが見つかりません
                </h3>
                <p className="text-gray-600 mb-4">
                  プランを選択してサービスを開始しましょう
                </p>
                <Link
                  href="/pricing"
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-200"
                >
                  プランを選択
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 統計情報 */}
        {stats && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChatBubbleLeftIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">作成したルーム</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.rooms_created}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">総メッセージ数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_messages}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="w-8 h-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">アクティブ参加者</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_participants}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* クイックアクション */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              クイックアクション
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/rooms/create"
                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition duration-200"
              >
                <div className="flex items-center">
                  <ChatBubbleLeftIcon className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900">新しいルーム作成</h3>
                    <p className="text-sm text-gray-600">チャットルームを作成</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/rooms"
                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition duration-200"
              >
                <div className="flex items-center">
                  <UsersIcon className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900">ルーム参加</h3>
                    <p className="text-sm text-gray-600">既存のルームに参加</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/cli-setup"
                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition duration-200"
              >
                <div className="flex items-center">
                  <ChartBarIcon className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900">CLI設定</h3>
                    <p className="text-sm text-gray-600">エディタ連携の設定</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* 機能制限情報 */}
        {subscription && (
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              現在のプラン制限
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-800">
                  ルーム作成: {subscription.subscription_plans.features.max_rooms || '制限なし'}
                </span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-800">
                  参加者数: {subscription.subscription_plans.features.max_participants_per_room || '制限なし'}
                </span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-800">
                  ストレージ: {subscription.subscription_plans.features.storage_gb || '制限なし'}GB
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;