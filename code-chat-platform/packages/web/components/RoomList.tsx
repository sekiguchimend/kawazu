'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { getRoom } from '@/lib/api';
import { Room } from '@/types';

export function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchSlug, setSearchSlug] = useState('');

  // サンプルルームデータ（実際の実装では API から取得）
  const sampleRooms: Room[] = useMemo(() => [
    {
      id: '1',
      name: 'プロジェクト会議',
      slug: 'project-meeting',
      is_private: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      participant_count: 3
    },
    {
      id: '2',
      name: 'コードレビュー',
      slug: 'code-review',
      is_private: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      participant_count: 2
    }
  ], []);

  useEffect(() => {
    // 実際の実装ではAPIからパブリックルーム一覧を取得
    setRooms(sampleRooms);
  }, [sampleRooms]);

  const handleSearchRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchSlug.trim()) {
      toast.error('ルームIDを入力してください');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await getRoom(searchSlug);
      
      if (result.success && result.data) {
        const room = result.data;
        
        // 検索したルームを一覧に追加（重複チェック）
        setRooms(prev => {
          const exists = prev.find(r => r.id === room.id);
          if (exists) return prev;
          return [room, ...prev];
        });
        
        toast.success(`ルーム「${room.name}」が見つかりました`);
        setSearchSlug('');
      } else {
        toast.error(result.error || 'ルームが見つかりません');
      }
    } catch (error) {
      console.error('Search room error:', error);
      toast.error('検索中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyCliCommand = (slug: string, isPrivate: boolean) => {
    const command = isPrivate 
      ? `kawazu join ${slug} -p YOUR_PASSWORD`
      : `kawazu join ${slug}`;
    
    navigator.clipboard.writeText(command).then(() => {
      toast.success('CLIコマンドをコピーしました');
    }).catch(() => {
      toast.error('コピーに失敗しました');
    });
  };

  return (
    <div className="space-y-6">
      {/* ルーム検索 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          ルームIDで検索
        </h3>
        <form onSubmit={handleSearchRoom} className="flex gap-2">
          <input
            type="text"
            value={searchSlug}
            onChange={(e) => setSearchSlug(e.target.value)}
            placeholder="ルームIDを入力"
            className="input-field flex-1"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary disabled:opacity-50"
          >
            {isLoading ? '検索中...' : '検索'}
          </button>
        </form>
      </div>

      {/* ルーム一覧 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          利用可能なルーム
        </h3>
        
        {rooms.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>表示できるルームがありません</p>
            <p className="text-sm mt-1">ルームIDで検索するか、新しいルームを作成してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{room.name}</h4>
                      {room.is_private && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          プライベート
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">ルームID:</span> 
                        <code className="bg-gray-100 px-1 rounded ml-1">{room.slug}</code>
                      </p>
                      <p>
                        <span className="font-medium">参加者:</span> {room.participant_count || 0}人
                      </p>
                      <p>
                        <span className="font-medium">作成日:</span> {formatDate(room.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => copyCliCommand(room.slug, room.is_private)}
                      className="btn-secondary text-xs"
                    >
                      CLIコマンドをコピー
                    </button>
                    {room.is_private && (
                      <span className="text-xs text-yellow-600">
                        ※パスワードが必要
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 参加方法の説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">参加方法</h4>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. CLI ツールをインストール: <code className="bg-blue-100 px-1 rounded">npm install -g kawazu</code></li>
          <li>2. ルームに参加: <code className="bg-blue-100 px-1 rounded">kawazu join [room-id]</code></li>
          <li>3. エディタで .codechat ファイルを開いてチャット開始</li>
        </ol>
      </div>
    </div>
  );
}