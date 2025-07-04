'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

const SubscriptionSuccessPage = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const sessionId = searchParams.get('session_id');

  const verifySubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // 開発環境では、テスト用のサブスクリプション完了処理を実行
      if (process.env.NODE_ENV === 'development' && sessionId?.startsWith('cs_test_')) {
        // URLパラメータからprice_idを取得（通常はStripeのセッションから取得）
        const priceId = searchParams.get('price_id') || 'price_basic_1000_jpy'; // デフォルト
        
        const completeResponse = await fetch(`${apiUrl}/api/subscriptions/test/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            session_id: sessionId,
            price_id: priceId
          })
        });

        if (completeResponse.ok) {
          console.log('Test subscription completed successfully');
        }
      }
      
      // 少し待ってからサブスクリプション状態を確認
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(`${apiUrl}/api/subscriptions/current`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setVerified(true);
      } else {
        // まだ処理中の可能性があるので、もう一度確認
        setTimeout(() => verifySubscription(), 3000);
      }
    } catch (error) {
      console.error('Verify subscription error:', error);
      // エラーが発生してもページは表示する
      setVerified(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    if (!sessionId) {
      router.push('/pricing');
      return;
    }

    // サブスクリプション開始の確認
    verifySubscription();
  }, [sessionId, isAuthenticated, authLoading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            サブスクリプションを処理中です
          </h2>
          <p className="text-gray-600">
            少々お待ちください...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            サブスクリプション開始完了！
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            ありがとうございます。サブスクリプションが正常に開始されました。
            7日間の無料トライアルをお楽しみください。
          </p>

          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              次のステップ
            </h3>
            <ul className="text-left space-y-3 text-gray-600">
              <li className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold mr-3 mt-0.5">
                  1
                </span>
                ダッシュボードでサブスクリプション状況を確認
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold mr-3 mt-0.5">
                  2
                </span>
                新しいチャットルームを作成して始める
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold mr-3 mt-0.5">
                  3
                </span>
                CLIツールをダウンロードしてエディタと連携
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <Link
              href="/dashboard"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition duration-200 inline-block"
            >
              ダッシュボードへ
            </Link>
            
            <Link
              href="/rooms"
              className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-md font-medium hover:bg-gray-200 transition duration-200 inline-block"
            >
              ルーム一覧を見る
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              質問がある場合は、
              <a href="mailto:support@example.com" className="text-blue-600 hover:text-blue-500">
                サポートチーム
              </a>
              までお気軽にお問い合わせください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccessPage;