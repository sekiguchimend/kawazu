import { Socket, Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import DOMPurify from 'isomorphic-dompurify';
import { supabase } from '../lib/supabase';
import { checkRoomParticipantLimit } from '../middleware/subscription';

interface JoinRoomData {
  room_slug: string;
  username: string;
  password?: string;
}

interface SendMessageData {
  room_slug: string;
  username: string;
  content: string;
  message_type: 'text' | 'code';
}

interface FileShareRequestData {
  room_slug: string;
  username: string;
  file_path: string;
  file_name: string;
  file_content?: string;
  file_type?: string;
  target_users?: string[];
  permission_type: 'read' | 'write';
  expiry_hours?: number;
}

interface FileShareResponseData {
  share_token: string;
  username: string;
  action: 'approve' | 'deny';
  reason?: string;
}

interface SharedFileAccessData {
  share_token: string;
  username: string;
  action: 'view' | 'download';
}

interface SharedFileUpdateData {
  share_token: string;
  username: string;
  content: string;
}

// WebSocket認証関数
const authenticateSocket = async (socket: Socket): Promise<any | null> => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      console.log(`🔍 [${socket.id}] No token provided in WebSocket connection`);
      return null;
    }
    
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error(`❌ [${socket.id}] JWT_SECRET not configured`);
      return null;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log(`🔍 [${socket.id}] WebSocket JWT decoded:`, { id: decoded.id, username: decoded.username });
    
    // JWTトークンの検証が成功した場合、Supabase Authはスキップして軽量認証を使用
    // 必要に応じてuser_profilesテーブルから追加情報を取得
    let profile = null;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('username, display_name')
        .eq('username', decoded.username)
        .single();
      
      if (!profileError && profileData) {
        profile = profileData;
      }
    } catch (profileError: any) {
      console.log(`⚠️ [${socket.id}] Profile query failed (continuing anyway):`, profileError?.message || 'Unknown error');
    }

    console.log(`✅ [${socket.id}] WebSocket authentication successful:`, decoded.username);

    return {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      display_name: profile?.display_name || decoded.username,
      role: decoded.role || 'user'
    };
  } catch (error) {
    console.error(`❌ [${socket.id}] Socket authentication error:`, {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    return null;
  }
};

// 入力サニタイズ関数
const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
};

// 重複メッセージ防止用キャッシュ（5秒間のウィンドウ）
const messageCache = new Map<string, number>();

// メッセージキャッシュのクリーンアップ（古いエントリを削除）
setInterval(() => {
  const now = Date.now();
  const expiryTime = 5000; // 5秒
  
  for (const [key, timestamp] of messageCache.entries()) {
    if (now - timestamp > expiryTime) {
      messageCache.delete(key);
    }
  }
}, 10000); // 10秒ごとにクリーンアップ

export const handleConnection = (io: Server) => {
  return async (socket: Socket) => {
    console.log(`🔗 [${socket.id}] User connected: ${socket.handshake.address} via ${socket.conn.transport.name}`);
    console.log(`🔍 [${socket.id}] Connection headers:`, {
      userAgent: socket.handshake.headers['user-agent'],
      referer: socket.handshake.headers.referer,
      origin: socket.handshake.headers.origin
    });
    
    // 接続後認証を非同期で実行（接続を維持）
    authenticateSocket(socket)
      .then(authUser => {
        if (authUser) {
          socket.data.authUser = authUser;
          console.log(`✅ [${socket.id}] Authenticated user connected: ${authUser.username} (${authUser.id})`);
        } else {
          console.log(`⚠️ [${socket.id}] Unauthenticated user connected (will check auth on room join)`);
        }
      })
      .catch((error: any) => {
        console.log(`⚠️ [${socket.id}] Authentication failed (will retry on room join):`, error?.message || error);
        console.log(`🔍 [${socket.id}] Authentication error details:`, {
          name: error?.name,
          stack: error?.stack,
          token: !!socket.handshake.auth.token,
          jwtSecret: !!process.env.JWT_SECRET
        });
      });

    // 接続エラーハンドリング
    socket.on('connect_error', (error: any) => {
      console.error(`❌ [${socket.id}] Socket connection error:`, {
        message: error.message || 'Unknown error',
        name: error.name || 'Unknown',
        stack: error.stack || 'No stack trace',
        type: error.type || typeof error
      });
    });

    // ルーム参加処理
    socket.on('join-room', async (rawData: JoinRoomData) => {
      try {
        console.log(`🔍 [${socket.id}] join-room イベント受信:`, rawData);
        const data = sanitizeInput(rawData);
        const { room_slug, username, password } = data;
        console.log(`🔍 [${socket.id}] サニタイズ後データ:`, { room_slug, username, password: password ? '***' : undefined });

        // 入力検証
        if (!room_slug || !username) {
          console.log(`❌ [${socket.id}] 入力検証エラー: room_slug=${room_slug}, username=${username}`);
          socket.emit('error', { message: 'Room slug and username are required' });
          return;
        }

        if (!/^[a-zA-Z0-9-_]+$/.test(room_slug)) {
          socket.emit('error', { message: 'Invalid room slug format' });
          return;
        }

        // ユーザー名検証を緩和（日本語・中国語・韓国語等の文字を許可）
        if (username.length > 50 || username.trim().length === 0) {
          socket.emit('error', { message: 'Invalid username: must be 1-50 characters' });
          return;
        }

        console.log(`Join room request: ${username} -> ${room_slug}`);

        // 認証チェック（接続時に認証されていない場合は再試行）
        if (!socket.data.authUser) {
          console.log(`🔍 [${socket.id}] 再認証を試行中...`);
          try {
            const authUser = await Promise.race([
              authenticateSocket(socket),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Authentication timeout')), 5000))
            ]);
            
            if (authUser) {
              socket.data.authUser = authUser;
              console.log(`✅ [${socket.id}] User authenticated during room join: ${authUser.username}`);
            } else {
              console.log(`⚠️ [${socket.id}] Room join without authentication: ${username} -> ${room_slug}`);
            }
          } catch (authError) {
            console.log(`⚠️ [${socket.id}] Authentication failed during room join: ${authError.message}, continuing anyway`);
          }
        }

        // ルーム存在確認
        console.log(`🔍 Checking room existence: ${room_slug}`);
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('id, name, is_private, password_hash')
          .eq('slug', room_slug)
          .single();

        console.log(`🔍 Room query result:`, { room, roomError });

        if (roomError || !room) {
          console.log(`❌ Room not found: ${room_slug}, error:`, roomError);
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        console.log(`✅ Room found: ${room.name} (${room.id}), is_private: ${room.is_private}`);

        // プライベートルームのパスワード検証
        if (room.is_private) {
          if (!password) {
            socket.emit('error', { message: 'Password required for private room' });
            return;
          }

          if (!room.password_hash || !await bcrypt.compare(password, room.password_hash)) {
            socket.emit('error', { message: 'Invalid password' });
            return;
          }
        }

        // 既存の参加者データをチェック・クリーンアップ
        const { data: existingParticipant } = await supabase
          .from('room_participants')
          .select('id, user_id, last_seen')
          .eq('room_id', room.id)
          .eq('username', username)
          .single();

        if (existingParticipant) {
          console.log(`🔍 [${socket.id}] 既存の参加者データが見つかりました: ${username}`);
          
          // 同じ認証ユーザーの場合は削除して再参加を許可
          const isSameUser = socket.data.authUser?.id && socket.data.authUser.id === existingParticipant.user_id;
          
          if (isSameUser) {
            console.log(`🔄 [${socket.id}] 同じユーザーの再参加 - 既存データを削除: ${username}`);
            
            // 既存の参加者データを削除
            const { error: deleteError } = await supabase
              .from('room_participants')
              .delete()
              .eq('id', existingParticipant.id);
            
            if (deleteError) {
              console.error(`❌ [${socket.id}] 既存参加者データの削除に失敗:`, deleteError);
              socket.emit('error', { message: 'Failed to rejoin room' });
              return;
            }
            
            console.log(`✅ [${socket.id}] 既存参加者データを削除しました: ${username}`);
          } else {
            // 最後のアクティビティから30分以上経過している場合は削除を許可
            const lastSeen = new Date(existingParticipant.last_seen || 0);
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            
            if (lastSeen < thirtyMinutesAgo) {
              console.log(`🔄 [${socket.id}] 非アクティブな参加者データを削除: ${username} (最終アクティビティ: ${lastSeen.toISOString()})`);
              
              const { error: deleteError } = await supabase
                .from('room_participants')
                .delete()
                .eq('id', existingParticipant.id);
              
              if (deleteError) {
                console.error(`❌ [${socket.id}] 既存参加者データの削除に失敗:`, deleteError);
                socket.emit('error', { message: 'Failed to rejoin room' });
                return;
              }
              
              console.log(`✅ [${socket.id}] 非アクティブな参加者データを削除しました: ${username}`);
            } else {
              // アクティブな別ユーザーがいる場合はエラー
              console.log(`❌ [${socket.id}] アクティブなユーザーが既に存在: ${username}`);
              socket.emit('error', { 
                message: 'Username already taken in this room',
                details: 'An active user with this username is already in the room'
              });
              return;
            }
          }
        }

        // 参加者数制限チェック
        const { count: currentParticipantCount } = await supabase
          .from('room_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id);

        const canJoin = await checkRoomParticipantLimit(room.id, (currentParticipantCount || 0) + 1);
        
        if (!canJoin) {
          socket.emit('error', { message: 'Room is full. Participant limit reached for this room.' });
          return;
        }

        // 参加者追加（UPSERT方式で確実に処理）
        console.log(`🔍 [${socket.id}] UPSERTで参加者データを挿入中: ${username} -> ${room.id}`);
        console.log(`🔍 [${socket.id}] 挿入データ:`, {
          room_id: room.id,
          user_id: socket.data.authUser?.id || null,
          username,
          role: 'member'
        });
        
        // PostgreSQLのUPSERT機能を使用（ON CONFLICT）
        const { data: participantResult, error: participantError } = await supabase.rpc('upsert_room_participant', {
          p_room_id: room.id,
          p_user_id: socket.data.authUser?.id || null,
          p_username: username,
          p_role: 'member'
        });

        console.log(`🔍 [${socket.id}] UPSERT結果:`, {
          participantResult,
          participantError,
          hasData: !!participantResult,
          hasError: !!participantError
        });

        if (participantError) {
          console.error(`❌ [${socket.id}] 参加者データUPSERTエラー:`, {
            error: participantError,
            message: participantError.message,
            code: participantError.code,
            details: participantError.details,
            hint: participantError.hint
          });
          socket.emit('error', { message: 'Failed to join room' });
          return;
        }

        // UPSERTの結果を使用してparticipantを取得
        let participant = null;
        if (participantResult && participantResult.length > 0) {
          participant = participantResult[0];
          console.log(`✅ [${socket.id}] UPSERT成功 - 参加者データ:`, participant);
        } else {
          // UPSERTが失敗した場合、手動でデータを取得
          console.log(`⚠️ [${socket.id}] UPSERT結果がnull - 直接取得を試行`);
          const { data: retrievedParticipant, error: retrieveError } = await supabase
            .from('room_participants')
            .select('id, username, role, joined_at, user_id')
            .eq('room_id', room.id)
            .eq('username', username)
            .order('joined_at', { ascending: false })
            .limit(1)
            .single();
          
          console.log(`🔍 [${socket.id}] 直接取得結果:`, {
            retrievedParticipant,
            retrieveError,
            hasRetrievedData: !!retrievedParticipant
          });
          
          if (retrievedParticipant) {
            participant = retrievedParticipant;
            console.log(`✅ [${socket.id}] 直接取得で参加者データを取得成功:`, participant);
          } else {
            console.error(`❌ [${socket.id}] 全ての取得方法が失敗 - 最小限のparticipantを手動作成`);
            // 最後の手段として手動作成
            participant = {
              id: `manual-${Date.now()}`,
              username,
              role: 'member',
              joined_at: new Date().toISOString(),
              user_id: socket.data.authUser?.id || null
            };
            console.log(`⚠️ [${socket.id}] 手動作成した参加者データ:`, participant);
          }
        }

        // socketをルームに追加
        await socket.join(room_slug);

        // ユーザー情報をsocketに保存（既存の認証情報を保持）
        socket.data = {
          ...socket.data,
          room_slug,
          username,
          room_id: room.id
        };

        // 参加成功通知
        console.log(`✅ [${socket.id}] ルーム参加成功: ${username} -> ${room_slug}`);
        socket.emit('joined-room', {
          room: {
            id: room.id,
            name: room.name,
            slug: room_slug
          },
          username
        });
        console.log(`📤 [${socket.id}] joined-room イベント送信完了`);

        // 他の参加者に通知
        socket.to(room_slug).emit('user-joined', {
          username,
          joined_at: participant.joined_at || new Date().toISOString()
        });

        // 古い参加者レコードのクリーンアップ（24時間以上前のlast_seen）
        await supabase
          .from('room_participants')
          .delete()
          .eq('room_id', room.id)
          .lt('last_seen', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        // 重複参加者の削除（同じusernameが複数ある場合、最新のもの以外を削除）
        const { data: duplicates } = await supabase
          .from('room_participants')
          .select('id, username, joined_at')
          .eq('room_id', room.id)
          .eq('username', username)
          .order('joined_at', { ascending: false });

        if (duplicates && duplicates.length > 1) {
          // 最新の1件を除いて削除
          const toDelete = duplicates.slice(1).map(d => d.id);
          await supabase
            .from('room_participants')
            .delete()
            .in('id', toDelete);
          console.log(`🧹 [${socket.id}] 重複参加者レコードを削除: ${toDelete.length}件`);
        }

        // 現在の参加者一覧を送信
        const { data: participants, error: participantsError } = await supabase
          .from('room_participants')
          .select('username, role, joined_at')
          .eq('room_id', room.id)
          .order('joined_at');

        // エラーハンドリングとデータ検証
        let validParticipants = [];
        if (participantsError) {
          console.error(`❌ [${socket.id}] 参加者一覧取得エラー:`, participantsError);
        } else if (participants && Array.isArray(participants)) {
          // nullや無効なデータをフィルタリング
          validParticipants = participants.filter(p => 
            p && 
            typeof p === 'object' && 
            p.username && 
            typeof p.username === 'string' && 
            p.username.trim().length > 0
          );
          console.log(`🔍 [${socket.id}] 参加者一覧取得結果:`, {
            total: participants.length,
            valid: validParticipants.length,
            invalid: participants.length - validParticipants.length,
            room_id: room.id,
            room_slug
          });
        }

        socket.emit('participants-list', validParticipants);

        console.log(`${username} joined room ${room_slug}`);

      } catch (error) {
        console.error(`❌ [${socket.id}] Join room エラー:`, {
          message: error.message,
          stack: error.stack,
          rawData
        });
        socket.emit('error', { message: 'Internal server error' });
      }
    });

    // メッセージ送信処理
    socket.on('send-message', async (data: SendMessageData) => {
      try {
        const { room_slug, username, content, message_type } = data;

        console.log(`📝 [${socket.id}] Message request:`, {
          room_slug,
          username: username ? username.substring(0, 20) + (username.length > 20 ? '...' : '') : 'undefined',
          contentLength: content ? content.length : 0,
          message_type,
          room_id: socket.data?.room_id,
          authUser: socket.data?.authUser?.username
        });

        // 認証チェック
        if (!socket.data?.room_slug || !socket.data?.username) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // ルーム一致チェック
        if (socket.data.room_slug !== room_slug) {
          socket.emit('error', { message: 'Room mismatch' });
          return;
        }

        // ユーザー名一致チェック
        if (socket.data.username !== username) {
          socket.emit('error', { message: 'Username mismatch' });
          return;
        }

        // メッセージ検証
        const trimmedContent = content.trim();
        if (trimmedContent.length === 0) {
          socket.emit('error', { message: 'Message content is required' });
          return;
        }

        if (trimmedContent.length > 10000) {
          socket.emit('error', { message: 'Message too long (max 10000 characters)' });
          return;
        }

        // メッセージタイプ検証
        if (!['text', 'code'].includes(message_type)) {
          socket.emit('error', { message: 'Invalid message type' });
          return;
        }

        // 重複メッセージ防止チェック
        const messageKey = `${socket.data.room_id}:${username}:${trimmedContent}`;
        const now = Date.now();
        const lastMessageTime = messageCache.get(messageKey);
        
        if (lastMessageTime && (now - lastMessageTime) < 5000) {
          console.log(`🔄 [${socket.id}] 重複メッセージを検出（前回から${now - lastMessageTime}ms）- スキップ`);
          // 重複の場合は無視（エラーも出さない）
          return;
        }
        
        // メッセージキャッシュに記録
        messageCache.set(messageKey, now);

        // データベースに保存
        console.log(`🔍 [${socket.id}] メッセージ保存開始:`, {
          room_id: socket.data.room_id,
          user_id: socket.data.authUser?.id || null,
          username,
          content: trimmedContent,
          message_type
        });

        // INSERT後に直接RETURNINGで結果を取得（より確実）
        let { data: insertResult, error: insertError } = await supabase
          .from('messages')
          .insert({
            room_id: socket.data.room_id,
            user_id: socket.data.authUser?.id || null,
            username,
            content: trimmedContent,
            message_type
          })
          .select('id, username, content, message_type, created_at')
          .single();

        console.log(`🔍 [${socket.id}] メッセージ保存結果:`, {
          success: !insertError,
          error: insertError?.message || null,
          data: insertResult || null,
          hasId: insertResult?.id ? true : false
        });

        if (insertError) {
          console.error(`❌ [${socket.id}] メッセージ保存エラー:`, {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code
          });
          socket.emit('error', { message: 'Failed to send message' });
          return;
        }

        if (!insertResult) {
          // INSERTが成功したが結果がnullの場合、別途SELECTで取得を試行
          console.log(`⚠️ [${socket.id}] INSERT結果がnull - 別途SELECTで取得試行`);
          
          const { data: selectResult, error: selectError } = await supabase
            .from('messages')
            .select('id, username, content, message_type, created_at')
            .eq('room_id', socket.data.room_id)
            .eq('username', username)
            .eq('content', trimmedContent)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (selectError || !selectResult) {
            console.error(`❌ [${socket.id}] SELECT取得も失敗:`, selectError?.message);
            socket.emit('error', { message: 'Message saved but failed to retrieve' });
            return;
          }

          // SELECT結果を使用
          insertResult = selectResult;
          console.log(`✅ [${socket.id}] SELECT取得成功:`, selectResult);
        }

        // メッセージの有効性チェック
        if (!insertResult.username || !insertResult.content) {
          console.error(`❌ [${socket.id}] 無効なメッセージオブジェクト:`, insertResult);
          socket.emit('error', { message: 'Invalid message object' });
          return;
        }

        console.log(`📤 [${socket.id}] new-messageイベント送信:`, {
          room_slug,
          message: {
            id: insertResult.id,
            username: insertResult.username,
            content: insertResult.content,
            message_type: insertResult.message_type,
            created_at: insertResult.created_at
          }
        });

        // ルーム内の参加者状況を確認
        const room = io.sockets.adapter.rooms.get(room_slug);
        const roomSockets = room ? Array.from(room) : [];
        
        console.log(`🔍 [${socket.id}] Socket.IOルーム状況:`, {
          room_slug,
          roomExists: !!room,
          totalSockets: roomSockets.length,
          socketIds: roomSockets,
          currentSocketInRoom: roomSockets.includes(socket.id)
        });

        // 現在のsocketがルームに参加していない場合は再参加
        if (!roomSockets.includes(socket.id)) {
          console.log(`⚠️ [${socket.id}] Socket.IOルームに参加していない - 再参加実行`);
          await socket.join(room_slug);
          console.log(`✅ [${socket.id}] Socket.IOルームに再参加完了`);
          
          // 再参加後の状況確認
          const updatedRoom = io.sockets.adapter.rooms.get(room_slug);
          const updatedRoomSockets = updatedRoom ? Array.from(updatedRoom) : [];
          console.log(`🔍 [${socket.id}] 再参加後のルーム状況:`, {
            totalSockets: updatedRoomSockets.length,
            socketIds: updatedRoomSockets,
            currentSocketInRoom: updatedRoomSockets.includes(socket.id)
          });
        }

        // ルーム内の全員に配信（送信者を含む）
        io.to(room_slug).emit('new-message', insertResult);
        
        // 送信者にも確実に配信（念のため）
        socket.emit('new-message', insertResult);
        
        console.log(`📤 [${socket.id}] メッセージ配信完了:`, {
          room_slug,
          username,
          content: trimmedContent.substring(0, 50) + (trimmedContent.length > 50 ? '...' : ''),
          messageId: insertResult.id
        });

        console.log(`✅ [${socket.id}] Message sent in ${room_slug}: ${username}`);

      } catch (error) {
        console.error(`❌ [${socket.id}] Send message error:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        socket.emit('error', { message: 'Internal server error' });
      }
    });

    // タイピング状態通知
    socket.on('typing', (data: { room_slug: string; username: string; is_typing: boolean }) => {
      try {
        // 入力検証
        if (!data || !data.room_slug || !data.username || typeof data.is_typing !== 'boolean') {
          return;
        }

        if (socket.data?.room_slug === data.room_slug && socket.data?.username === data.username) {
          socket.to(data.room_slug).emit('user-typing', {
            username: data.username,
            is_typing: data.is_typing
          });
        }
      } catch (error) {
        console.error('Typing event error:', error);
      }
    });

    // 切断処理
    socket.on('disconnect', async (reason, details) => {
      try {
        console.log(`🔌 [${socket.id}] User disconnected: ${reason}`);
        console.log(`🔍 [${socket.id}] Disconnect details:`, {
          reason,
          details,
          authUser: socket.data?.authUser?.username || 'none',
          room: socket.data?.room_slug || 'none',
          connectionTime: Date.now() - (typeof socket.handshake.time === 'number' ? socket.handshake.time : Date.now()),
          transport: socket.conn.transport.name
        });

        // 切断原因の分析
        if (reason === 'transport close') {
          console.log(`🔍 [${socket.id}] Transport close - クライアント側で接続が閉じられました`);
          if (!socket.data?.room_slug) {
            console.log(`⚠️ [${socket.id}] ルーム参加前の切断 - 認証やDB接続に問題がある可能性があります`);
          }
        } else if (reason === 'client namespace disconnect') {
          console.log(`🔍 [${socket.id}] Client disconnect - 正常な切断`);
        } else if (reason === 'ping timeout') {
          console.log(`🔍 [${socket.id}] Ping timeout - ネットワーク接続の問題`);
        } else if (reason === 'transport error') {
          console.log(`🔍 [${socket.id}] Transport error - WebSocket接続エラー`);
        }

        if (socket.data?.room_slug && socket.data?.username) {
          const { room_slug, username, room_id } = socket.data;

          // last_seen 更新
          await supabase
            .from('room_participants')
            .update({ last_seen: new Date().toISOString() })
            .eq('room_id', room_id)
            .eq('username', username);

          // 他の参加者に通知
          socket.to(room_slug).emit('user-left', {
            username,
            left_at: new Date().toISOString()
          });

          console.log(`✅ [${socket.id}] ${username} left room ${room_slug}`);
        } else {
          console.log(`⚠️ [${socket.id}] 切断時にルーム情報がありません`);
        }
      } catch (error) {
        console.error(`❌ [${socket.id}] Disconnect error:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
      }
    });

    // プロフィールURL取得リクエスト
    socket.on('get-profile-url', async (data: { username: string }) => {
      try {
        // 入力検証
        if (!data || !data.username) {
          socket.emit('profile-url-response', {
            username: data?.username || 'unknown',
            exists: false,
            error: 'Username is required'
          });
          return;
        }

        const { username } = data;
        
        // ユーザー名形式検証
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
          socket.emit('profile-url-response', {
            username,
            exists: false,
            error: 'Invalid username format'
          });
          return;
        }
        
        // プロフィール存在確認
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('username, is_public')
          .eq('username', username)
          .single();

        if (profile) {
          const baseUrl = process.env.FRONTEND_URL || 'https://kawazu-web.vercel.app';
          const profileUrl = `${baseUrl}/profile/${username}`;
          
          socket.emit('profile-url-response', {
            username: profile.username,
            url: profileUrl,
            is_public: profile.is_public,
            exists: true
          });
        } else {
          socket.emit('profile-url-response', {
            username,
            exists: false
          });
        }
      } catch (error) {
        console.error('Get profile URL error:', error);
        socket.emit('profile-url-response', {
          username: data.username,
          exists: false,
          error: 'Failed to get profile URL'
        });
      }
    });

    // ファイル共有リクエスト
    socket.on('request-file-share', async (data: FileShareRequestData) => {
      try {
        const { 
          room_slug, 
          username, 
          file_path, 
          file_name, 
          file_content, 
          file_type, 
          target_users = [], 
          permission_type = 'read',
          expiry_hours = 24 
        } = data;

        // 入力検証
        if (!room_slug || !username || !file_path || !file_name) {
          socket.emit('error', { message: 'Required fields missing' });
          return;
        }

        // socket認証チェック
        if (!socket.data?.room_slug || socket.data.room_slug !== room_slug || socket.data.username !== username) {
          socket.emit('error', { message: 'Not authorized for this room' });
          return;
        }

        // APIエンドポイントに転送して処理
        const response = await fetch(`${process.env.API_BASE_URL || 'https://kawazu.onrender.com'}/api/file-sharing/${room_slug}/shares`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            owner_username: username,
            file_path,
            file_name,
            file_content,
            file_type,
            target_users,
            permission_type,
            expiry_hours
          })
        });

        const result = await response.json();

        if (result.success) {
          // ファイル共有成功をクライアントに通知
          socket.emit('file-share-created', {
            share_token: result.data.share_token,
            file_name: result.data.file_name,
            expires_at: result.data.expires_at,
            permission_type: result.data.permission_type
          });

          // 対象ユーザーに共有リクエストを通知
          const targetUsers = target_users.length > 0 ? target_users : await getAllRoomParticipants(socket.data.room_id, username);
          
          targetUsers.forEach((targetUsername: string) => {
            io.to(room_slug).emit('file-share-request', {
              share_token: result.data.share_token,
              owner_username: username,
              file_name,
              permission_type,
              expires_at: result.data.expires_at,
              target_username: targetUsername
            });
          });

          console.log(`File share created: ${username} shared ${file_name} in ${room_slug}`);
        } else {
          socket.emit('error', { message: result.error || 'Failed to create file share' });
        }

      } catch (error) {
        console.error('File share request error:', error);
        socket.emit('error', { message: 'Internal server error' });
      }
    });

    // ファイル共有承認/拒否
    socket.on('respond-file-share', async (data: FileShareResponseData) => {
      try {
        const { share_token, username, action, reason } = data;

        // 入力検証
        if (!share_token || !username || !['approve', 'deny'].includes(action)) {
          socket.emit('error', { message: 'Invalid file share response' });
          return;
        }

        // socket認証チェック
        if (!socket.data?.username || socket.data.username !== username) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // APIエンドポイントで処理
        const response = await fetch(`${process.env.API_BASE_URL || 'https://kawazu.onrender.com'}/api/file-sharing/shares/${share_token}/${action}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, reason })
        });

        const result = await response.json();

        if (result.success) {
          // 応答をクライアントに送信
          socket.emit('file-share-response-sent', {
            action,
            file_name: result.data.file_name,
            owner: result.data.owner,
            status: result.data.status
          });

          // 所有者に通知
          socket.to(socket.data.room_slug).emit(`file-share-${action}d`, {
            share_token,
            file_name: result.data.file_name,
            username,
            reason
          });

          console.log(`File share ${action}: ${username} ${action}d ${result.data.file_name}`);
        } else {
          socket.emit('error', { message: result.error || `Failed to ${action} file share` });
        }

      } catch (error) {
        console.error('File share response error:', error);
        socket.emit('error', { message: 'Internal server error' });
      }
    });

    // 共有ファイルアクセス
    socket.on('access-shared-file', async (data: SharedFileAccessData) => {
      try {
        const { share_token, username, action } = data;

        // 入力検証
        if (!share_token || !username || !['view', 'download'].includes(action)) {
          socket.emit('error', { message: 'Invalid file access request' });
          return;
        }

        // socket認証チェック
        if (!socket.data?.username || socket.data.username !== username) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // APIエンドポイントで処理
        const response = await fetch(`${process.env.API_BASE_URL || 'https://kawazu.onrender.com'}/api/file-sharing/shares/${share_token}/content?username=${username}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const result = await response.json();

        if (result.success) {
          socket.emit('shared-file-content', {
            share_token,
            file_name: result.data.file_name,
            file_type: result.data.file_type,
            file_content: result.data.file_content,
            owner_username: result.data.owner_username,
            permission_type: result.data.permission_type,
            expires_at: result.data.expires_at
          });

          console.log(`File accessed: ${username} ${action}ed ${result.data.file_name}`);
        } else {
          socket.emit('error', { message: result.error || 'Failed to access file' });
        }

      } catch (error) {
        console.error('File access error:', error);
        socket.emit('error', { message: 'Internal server error' });
      }
    });

    // 共有ファイル更新
    socket.on('update-shared-file', async (data: SharedFileUpdateData) => {
      try {
        const { share_token, username, content } = data;

        // 入力検証
        if (!share_token || !username || content === undefined) {
          socket.emit('error', { message: 'Invalid file update request' });
          return;
        }

        // socket認証チェック
        if (!socket.data?.username || socket.data.username !== username) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // APIエンドポイントで処理
        const response = await fetch(`${process.env.API_BASE_URL || 'https://kawazu.onrender.com'}/api/file-sharing/shares/${share_token}/content`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, content })
        });

        const result = await response.json();

        if (result.success) {
          // 更新をルーム内の全員に通知
          io.to(socket.data.room_slug).emit('shared-file-updated', {
            share_token,
            file_name: result.data.file_name,
            content,
            updated_by: username,
            updated_at: result.data.updated_at
          });

          console.log(`File updated: ${username} updated ${result.data.file_name}`);
        } else {
          socket.emit('error', { message: result.error || 'Failed to update file' });
        }

      } catch (error) {
        console.error('File update error:', error);
        socket.emit('error', { message: 'Internal server error' });
      }
    });

    // 共有ファイル一覧取得
    socket.on('get-shared-files', async (data: { room_slug: string; username: string }) => {
      try {
        const { room_slug, username } = data;

        // 入力検証
        if (!room_slug || !username) {
          socket.emit('error', { message: 'Room slug and username are required' });
          return;
        }

        // socket認証チェック
        if (!socket.data?.room_slug || socket.data.room_slug !== room_slug || socket.data.username !== username) {
          socket.emit('error', { message: 'Not authorized for this room' });
          return;
        }

        // APIエンドポイントで処理
        const response = await fetch(`${process.env.API_BASE_URL || 'https://kawazu.onrender.com'}/api/file-sharing/${room_slug}/shares?username=${username}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const result = await response.json();

        if (result.success) {
          socket.emit('shared-files-list', {
            files: result.data
          });
        } else {
          socket.emit('error', { message: result.error || 'Failed to get shared files' });
        }

      } catch (error) {
        console.error('Get shared files error:', error);
        socket.emit('error', { message: 'Internal server error' });
      }
    });

    // エラーハンドリング
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  };
};

// ヘルパー関数: ルーム参加者一覧取得（所有者除く）
async function getAllRoomParticipants(roomId: string, excludeUsername: string): Promise<string[]> {
  try {
    const { data: participants } = await supabase
      .from('room_participants')
      .select('username')
      .eq('room_id', roomId)
      .neq('username', excludeUsername);

    return participants ? participants.map(p => p.username) : [];
  } catch (error) {
    console.error('Get room participants error:', error);
    return [];
  }
}