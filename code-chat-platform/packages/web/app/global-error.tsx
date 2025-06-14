'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-black mb-4">システムエラー</h1>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">重大な問題が発生しました</h2>
            <p className="text-gray-600 mb-8">
              申し訳ございませんが、システムレベルのエラーが発生しました。
            </p>
            <button
              onClick={reset}
              className="inline-block px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
            >
              アプリケーションを再起動
            </button>
          </div>
        </div>
      </body>
    </html>
  );
} 