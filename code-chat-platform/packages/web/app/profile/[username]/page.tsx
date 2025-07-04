'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { getProfile } from '@/lib/api';
import { UserProfile } from '@/types';

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!username) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getProfile(username);
      
      if (result.success && result.data) {
        setProfile(result.data);
      } else {
        setError(result.error || 'プロフィールが見つかりません');
      }
    } catch (error) {
      console.error('Profile load error:', error);
      setError('プロフィールの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const copyProfileUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('プロフィールURLをコピーしました');
    }).catch(() => {
      toast.error('コピーに失敗しました');
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">プロフィールを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">プロフィールが見つかりません</h1>
          <p className="text-gray-600 mb-4">{error || 'このユーザーは存在しないか、プライベート設定です'}</p>
          <Link href="/" className="btn-primary">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              ← Kawazu に戻る
            </Link>
            <button
              onClick={copyProfileUrl}
              className="btn-secondary text-sm"
            >
              URLをコピー
            </button>
          </div>
        </div>
      </header>

      {/* プロフィール内容 */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* プロフィールヘッダー */}
          <div className="px-6 py-8 border-b border-gray-200">
            <div className="flex items-start space-x-6">
              {/* アバター */}
              <div className="flex-shrink-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.username}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-2xl text-gray-600">
                      {profile.username[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* 基本情報 */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">
                  {profile.display_name || profile.username}
                </h1>
                <p className="text-lg text-gray-600 mt-1">@{profile.username}</p>
                
                {profile.bio && (
                  <p className="text-gray-700 mt-3 whitespace-pre-wrap">{profile.bio}</p>
                )}

                {/* 場所・タイムゾーン */}
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
                  {profile.location && (
                    <div className="flex items-center">
                      <span>📍 {profile.location}</span>
                    </div>
                  )}
                  {profile.timezone && (
                    <div className="flex items-center">
                      <span>🕒 {profile.timezone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* スキル */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="px-6 py-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">スキル・技術</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* リンク */}
          <div className="px-6 py-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">リンク</h3>
            <div className="space-y-3">
              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-700"
                >
                  🌐 ウェブサイト
                </a>
              )}
              
              {profile.github_handle && (
                <a
                  href={`https://github.com/${profile.github_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-700"
                >
                  💻 GitHub: @{profile.github_handle}
                </a>
              )}
              
              {profile.twitter_handle && (
                <a
                  href={`https://twitter.com/${profile.twitter_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-700"
                >
                  🐦 Twitter: @{profile.twitter_handle}
                </a>
              )}
            </div>
          </div>

          {/* フッター */}
          <div className="px-6 py-4 bg-gray-50 text-sm text-gray-500">
            アカウント作成: {new Date(profile.created_at).toLocaleDateString('ja-JP')}
          </div>
        </div>

        {/* CLIでチャット参加の案内 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            {profile.display_name || profile.username} さんとチャットする
          </h3>
          <p className="text-blue-800 mb-4">
            ルームを作成して、このユーザーに招待URLを共有してください。
          </p>
          <div className="space-y-2">
            <p className="text-sm text-blue-700">
              1. <code className="bg-blue-100 px-1 rounded">kawazu create &quot;プロジェクト名&quot;</code>
            </p>
            <p className="text-sm text-blue-700">
              2. 作成されたルームURLを {profile.display_name || profile.username} さんに共有
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}