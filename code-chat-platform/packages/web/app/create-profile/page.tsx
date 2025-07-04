'use client';

import Link from 'next/link';
import { CreateProfileForm } from '@/components/CreateProfileForm';

export default function CreateProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                プロフィール作成
              </h1>
              <p className="text-gray-600 mt-1">
                あなたの情報を入力してプロフィールを作成しましょう
              </p>
            </div>
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              ← ホームに戻る
            </Link>
          </div>
        </div>
      </header>
      
      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* フォーム */}
          <div className="lg:col-span-2">
            <div className="card">
              <CreateProfileForm />
            </div>
          </div>
          
          {/* サイドバー - 説明 */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                プロフィールについて
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• チャット参加者があなたのことを知ることができます</li>
                <li>• スキルや興味を共有して、適切なプロジェクトを見つけやすくなります</li>
                <li>• プライベート設定も可能です</li>
                <li>• いつでも編集・削除できます</li>
              </ul>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                プロフィールの活用例
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 🔗 <strong>共有</strong>: プロフィールURLをSNSやメールで共有</li>
                <li>• 💬 <strong>チャット</strong>: ユーザー名クリックでプロフィール表示</li>
                <li>• 🔍 <strong>検索</strong>: スキルや場所で他のユーザーを検索</li>
                <li>• 🤝 <strong>コラボ</strong>: 技術スタックが合う人を見つける</li>
              </ul>
            </div>
            
            <div className="card bg-blue-50 border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                💡 プロフィールのコツ
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• 自己紹介は具体的に書く</li>
                <li>• 使用可能な技術を正確に記載</li>
                <li>• GitHubやポートフォリオを連携</li>
                <li>• 定期的に情報を更新</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}