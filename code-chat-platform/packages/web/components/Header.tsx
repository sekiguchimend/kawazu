'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Header = () => {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-8 py-6">
        {/* ロゴ */}
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black"></div>
            <span className="text-2xl font-bold tracking-tight">KAWAZU</span>
          </Link>
        </div>
        
        {/* ナビゲーション */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <Link href="/" className="hover:opacity-60 transition-opacity">HOME</Link>
          <Link href="#features" className="hover:opacity-60 transition-opacity">FEATURES</Link>
          <Link href="/pricing" className={`${pathname === '/pricing' ? 'text-blue-600 font-semibold' : 'hover:opacity-60 transition-opacity'}`}>PRICING</Link>
          <Link href="#docs" className="hover:opacity-60 transition-opacity">DOCS</Link>
          <Link href="/developer" className="hover:opacity-60 transition-opacity">DEVELOPER</Link>
          {isAuthenticated && (
            <Link href="/dashboard" className={`${pathname === '/dashboard' ? 'text-blue-600 font-semibold' : 'hover:opacity-60 transition-opacity'}`}>DASHBOARD</Link>
          )}
        </nav>

        {/* ユーザーメニュー */}
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="animate-pulse flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          ) : isAuthenticated && user ? (
            <>
              <span className="text-sm text-gray-600">こんにちは、{user.username}さん</span>
              <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition duration-200">
                DASHBOARD
              </Link>
              {/* ドロップダウンメニュー */}
              <div className="relative group">
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* ドロップダウンメニューの内容 */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link 
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    プロフィール
                  </Link>
                  <Link 
                    href="/subscription"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    サブスクリプション
                  </Link>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    ログアウト
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link href="/auth" className="text-sm hover:opacity-60 transition-opacity">LOGIN</Link>
              <Link href="/auth" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition duration-200">
                GET STARTED
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 認証状態デバッグ情報（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2">
          <div className="max-w-7xl mx-auto">
            <div className="text-xs text-yellow-800">
              <strong>認証状態:</strong> {isAuthenticated ? '✅ ログイン中' : '❌ 未ログイン'} | 
              <strong> ユーザー:</strong> {user?.username || user?.email || 'なし'} | 
              <strong> 読み込み中:</strong> {isLoading ? 'はい' : 'いいえ'}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 