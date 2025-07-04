'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-black mb-4">エラー</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">問題が発生しました</h2>
        <p className="text-gray-600 mb-8">
          申し訳ございませんが、予期しないエラーが発生しました。
        </p>
        <button
          onClick={reset}
          className="inline-block px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors mr-4"
        >
          再試行
        </button>
        <Link
          href="/"
          className="inline-block px-6 py-3 border border-black text-black font-medium hover:bg-black hover:text-white transition-colors"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
} 