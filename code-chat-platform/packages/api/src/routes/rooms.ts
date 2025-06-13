import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import { validateRoom, validateJoinRoom, validateSlug } from '../middleware/validation';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { roomCreationLimiter } from '../middleware/security';

const router = Router();

// ルーム作成
router.post('/', roomCreationLimiter, authenticateToken, validateRoom, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, slug, is_private, password } = req.body;

    // スラグ重複チェック
    const { data: existingRoom } = await supabase
      .from('rooms')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (existingRoom) {
      res.status(409).json({
        success: false,
        error: 'Room with this slug already exists'
      });
      return;
    }

    // パスワードハッシュ化（プライベートルームの場合）
    let password_hash = null;
    if (is_private && password) {
      password_hash = await bcrypt.hash(password, 10);
    }

    // ルーム作成
    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        name,
        slug,
        is_private: is_private || false,
        password_hash,
        created_by: req.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Room creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create room'
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        id: room.id,
        name: room.name,
        slug: room.slug,
        is_private: room.is_private,
        created_at: room.created_at
      }
    });

  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ルーム情報取得
router.get('/:slug', validateSlug, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const { data: room, error } = await supabase
      .from('rooms')
      .select(`
        id,
        name,
        slug,
        is_private,
        created_at,
        updated_at
      `)
      .eq('slug', slug)
      .single();

    if (error || !room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }

    // 参加者数取得
    const { count: participantCount } = await supabase
      .from('room_participants')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id);

    res.json({
      success: true,
      data: {
        ...room,
        participant_count: participantCount || 0
      }
    });

  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ルーム参加
router.post('/:slug/join', validateSlug, validateJoinRoom, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { username, password } = req.body;

    // ルーム存在確認
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, name, is_private, password_hash')
      .eq('slug', slug)
      .single();

    if (roomError || !room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }

    // プライベートルームのパスワード検証
    if (room.is_private) {
      if (!password) {
        res.status(401).json({
          success: false,
          error: 'Password required for private room'
        });
        return;
      }

      if (!room.password_hash || !await bcrypt.compare(password, room.password_hash)) {
        res.status(401).json({
          success: false,
          error: 'Invalid password'
        });
        return;
      }
    }

    // 参加者重複チェック（ユーザー名ベース）
    const { data: existingParticipant } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', room.id)
      .eq('username', username)
      .single();

    if (existingParticipant) {
      res.status(409).json({
        success: false,
        error: 'Username already taken in this room'
      });
      return;
    }

    // 参加者追加
    const { data: participant, error: participantError } = await supabase
      .from('room_participants')
      .insert({
        room_id: room.id,
        user_id: null, // 認証実装後に更新
        username,
        role: 'member'
      })
      .select()
      .single();

    if (participantError) {
      console.error('Join room error:', participantError);
      res.status(500).json({
        success: false,
        error: 'Failed to join room'
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: room.name,
          slug
        },
        participant: {
          username: participant.username,
          role: participant.role,
          joined_at: participant.joined_at
        }
      }
    });

  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ルーム参加者一覧
router.get('/:slug/participants', validateSlug, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    // ルーム存在確認
    const { data: room } = await supabase
      .from('rooms')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }

    // 参加者一覧取得
    const { data: participants, error } = await supabase
      .from('room_participants')
      .select('username, role, joined_at, last_seen')
      .eq('room_id', room.id)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Get participants error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get participants'
      });
      return;
    }

    res.json({
      success: true,
      data: participants || []
    });

  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;