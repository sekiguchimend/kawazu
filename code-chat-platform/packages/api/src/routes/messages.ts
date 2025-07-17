import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { validateMessage, validateSlug } from '../middleware/validation';
import { messageLimiter } from '../middleware/security';

const router = Router();

// メッセージ履歴取得
router.get('/:room_slug', validateSlug, async (req: Request, res: Response) => {
  try {
    const { room_slug } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    // ルーム存在確認
    const { data: room } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('slug', room_slug)
      .single();

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }

    // メッセージ履歴取得（最新のメッセージから取得して時系列順に並べ替え）
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        username,
        content,
        message_type,
        created_at
      `)
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })  // 最新から取得
      .limit(parseInt(limit as string))  // limitを適用
      .range(
        parseInt(offset as string), 
        parseInt(offset as string) + parseInt(limit as string) - 1
      );

    if (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get messages'
      });
      return;
    }

    // 最新から取得したメッセージを時系列順（古いものから新しいものへ）に並べ替え
    const sortedMessages = (messages || []).sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    res.json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: room.name,
          slug: room_slug
        },
        messages: sortedMessages,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          count: sortedMessages.length
        }
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// メッセージ送信（REST API版）
router.post('/:room_slug', messageLimiter, validateSlug, validateMessage, async (req: Request, res: Response) => {
  try {
    const { room_slug } = req.params;
    const { content, message_type = 'text' } = req.body;
    const { username } = req.query; // クエリパラメータからユーザー名取得（暫定）

    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required'
      });
      return;
    }

    // ルーム存在確認
    const { data: room } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('slug', room_slug)
      .single();

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }

    // 参加者確認
    const { data: participant } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', room.id)
      .eq('username', username as string)
      .single();

    if (!participant) {
      res.status(403).json({
        success: false,
        error: 'Not a participant of this room'
      });
      return;
    }

    // メッセージ保存
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        room_id: room.id,
        user_id: null, // 認証実装後に更新
        username: username as string,
        content,
        message_type
      })
      .select(`
        id,
        username,
        content,
        message_type,
        created_at
      `)
      .single();

    if (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send message'
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// メッセージ削除（管理者用）
router.delete('/:room_slug/:message_id', validateSlug, async (req: Request, res: Response) => {
  try {
    const { room_slug, message_id } = req.params;
    const { username } = req.query;

    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required'
      });
      return;
    }

    // ルーム存在確認
    const { data: room } = await supabase
      .from('rooms')
      .select('id')
      .eq('slug', room_slug)
      .single();

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }

    // メッセージ存在確認と権限チェック
    const { data: message } = await supabase
      .from('messages')
      .select('id, username')
      .eq('id', message_id)
      .eq('room_id', room.id)
      .single();

    if (!message) {
      res.status(404).json({
        success: false,
        error: 'Message not found'
      });
      return;
    }

    // 本人または管理者のみ削除可能
    if (message.username !== username) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to delete this message'
      });
      return;
    }

    // メッセージ削除
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', message_id);

    if (error) {
      console.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete message'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;