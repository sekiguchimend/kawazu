import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../lib/supabase';

const router = Router();

// ファイル共有作成
router.post('/:roomSlug/shares', async (req: Request, res: Response) => {
  try {
    const { roomSlug } = req.params;
    const { 
      owner_username, 
      file_path, 
      file_name, 
      file_content, 
      file_type, 
      target_users = [], 
      permission_type = 'read',
      expiry_hours = 24
    } = req.body;

    // バリデーション
    if (!owner_username || !file_path || !file_name) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: owner_username, file_path, file_name'
      });
      return;
    }

    // ルーム存在確認
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('slug', roomSlug)
      .single();

    if (roomError || !room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }

    // オーナーがルーム参加者か確認
    const { data: ownerParticipant } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', room.id)
      .eq('username', owner_username)
      .single();

    if (!ownerParticipant) {
      res.status(403).json({
        success: false,
        error: 'Owner must be a room participant'
      });
      return;
    }

    // 一意の共有トークン生成
    const share_token = crypto.randomBytes(32).toString('hex');
    
    // 有効期限設定
    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + expiry_hours);

    // ファイル共有レコード作成
    const { data: fileShare, error: shareError } = await supabase
      .from('file_shares')
      .insert({
        owner_username,
        file_path,
        file_name,
        file_content,
        file_type,
        room_id: room.id,
        share_token,
        expires_at: expires_at.toISOString()
      })
      .select()
      .single();

    if (shareError) {
      console.error('File share creation error:', shareError);
      res.status(500).json({
        success: false,
        error: 'Failed to create file share'
      });
      return;
    }

    // 対象ユーザーリストが指定されている場合は個別に権限設定
    if (target_users.length > 0) {
      const permissions = target_users.map((username: string) => ({
        share_id: fileShare.id,
        username,
        permission_type,
        granted_by: owner_username,
        status: 'pending'
      }));

      const { error: permError } = await supabase
        .from('file_share_permissions')
        .insert(permissions);

      if (permError) {
        console.error('Permission creation error:', permError);
        // ファイル共有レコードも削除
        await supabase
          .from('file_shares')
          .delete()
          .eq('id', fileShare.id);
        
        res.status(500).json({
          success: false,
          error: 'Failed to create share permissions'
        });
        return;
      }
    } else {
      // 全ルーム参加者に対して権限設定
      const { data: participants } = await supabase
        .from('room_participants')
        .select('username')
        .eq('room_id', room.id)
        .neq('username', owner_username);

      if (participants && participants.length > 0) {
        const permissions = participants.map(p => ({
          share_id: fileShare.id,
          username: p.username,
          permission_type,
          granted_by: owner_username,
          status: 'pending'
        }));

        await supabase
          .from('file_share_permissions')
          .insert(permissions);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        share_token,
        file_name: fileShare.file_name,
        expires_at: fileShare.expires_at,
        permission_type,
        target_users: target_users.length > 0 ? target_users : 'all_participants'
      }
    });

  } catch (error) {
    console.error('File share creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ファイル共有承認/拒否
router.put('/shares/:token/:action', async (req: Request, res: Response) => {
  try {
    const { token, action } = req.params;
    const { username, reason } = req.body;

    if (!['approve', 'deny'].includes(action)) {
      res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "deny"'
      });
      return;
    }

    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required'
      });
      return;
    }

    // ファイル共有とユーザー権限を確認
    const { data: shareWithPermission, error } = await supabase
      .from('file_share_permissions')
      .select(`
        *,
        file_shares (
          id,
          file_name,
          owner_username,
          is_active,
          expires_at
        )
      `)
      .eq('username', username)
      .eq('status', 'pending')
      .filter('file_shares.share_token', 'eq', token)
      .filter('file_shares.is_active', 'eq', true)
      .single();

    if (error || !shareWithPermission) {
      res.status(404).json({
        success: false,
        error: 'Share request not found or already processed'
      });
      return;
    }

    // 期限チェック
    const fileShare = shareWithPermission.file_shares;
    if (fileShare.expires_at && new Date(fileShare.expires_at) < new Date()) {
      res.status(410).json({
        success: false,
        error: 'Share request has expired'
      });
      return;
    }

    // 権限ステータス更新
    const newStatus = action === 'approve' ? 'approved' : 'denied';
    const { error: updateError } = await supabase
      .from('file_share_permissions')
      .update({ status: newStatus })
      .eq('id', shareWithPermission.id);

    if (updateError) {
      console.error('Permission update error:', updateError);
      res.status(500).json({
        success: false,
        error: 'Failed to update permission'
      });
      return;
    }

    // アクセスログ記録
    await supabase
      .from('file_access_logs')
      .insert({
        share_id: fileShare.id,
        username,
        action,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

    res.json({
      success: true,
      data: {
        action,
        file_name: fileShare.file_name,
        owner: fileShare.owner_username,
        status: newStatus
      }
    });

  } catch (error) {
    console.error('Share action error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ファイル内容取得
router.get('/shares/:token/content', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { username } = req.query;

    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required'
      });
      return;
    }

    // ファイル共有と承認済み権限を確認
    const { data: shareData, error } = await supabase
      .from('file_shares')
      .select(`
        *,
        file_share_permissions!inner (
          permission_type,
          status
        )
      `)
      .eq('share_token', token)
      .eq('is_active', true)
      .eq('file_share_permissions.username', username)
      .eq('file_share_permissions.status', 'approved')
      .single();

    if (error || !shareData) {
      res.status(403).json({
        success: false,
        error: 'Access denied or file not found'
      });
      return;
    }

    // 期限チェック
    if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
      res.status(410).json({
        success: false,
        error: 'File share has expired'
      });
      return;
    }

    // アクセスログ記録
    await supabase
      .from('file_access_logs')
      .insert({
        share_id: shareData.id,
        username: username as string,
        action: 'view',
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

    res.json({
      success: true,
      data: {
        file_name: shareData.file_name,
        file_type: shareData.file_type,
        file_content: shareData.file_content,
        owner_username: shareData.owner_username,
        permission_type: shareData.file_share_permissions[0].permission_type,
        expires_at: shareData.expires_at
      }
    });

  } catch (error) {
    console.error('Get file content error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ファイル内容更新（書き込み権限が必要）
router.put('/shares/:token/content', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { username, content } = req.body;

    if (!username || content === undefined) {
      res.status(400).json({
        success: false,
        error: 'Username and content are required'
      });
      return;
    }

    // 書き込み権限確認
    const { data: shareData, error } = await supabase
      .from('file_shares')
      .select(`
        *,
        file_share_permissions!inner (
          permission_type,
          status
        )
      `)
      .eq('share_token', token)
      .eq('is_active', true)
      .eq('file_share_permissions.username', username)
      .eq('file_share_permissions.status', 'approved')
      .eq('file_share_permissions.permission_type', 'write')
      .single();

    if (error || !shareData) {
      res.status(403).json({
        success: false,
        error: 'Write access denied or file not found'
      });
      return;
    }

    // 期限チェック
    if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
      res.status(410).json({
        success: false,
        error: 'File share has expired'
      });
      return;
    }

    // ファイル内容更新
    const { error: updateError } = await supabase
      .from('file_shares')
      .update({ 
        file_content: content,
        updated_at: new Date().toISOString()
      })
      .eq('id', shareData.id);

    if (updateError) {
      console.error('File update error:', updateError);
      res.status(500).json({
        success: false,
        error: 'Failed to update file'
      });
      return;
    }

    // アクセスログ記録
    await supabase
      .from('file_access_logs')
      .insert({
        share_id: shareData.id,
        username,
        action: 'edit',
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

    res.json({
      success: true,
      data: {
        file_name: shareData.file_name,
        updated_by: username,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Update file content error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ルーム内のファイル共有一覧
router.get('/:roomSlug/shares', async (req: Request, res: Response) => {
  try {
    const { roomSlug } = req.params;
    const { username } = req.query;

    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required'
      });
      return;
    }

    // ルーム存在確認
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('slug', roomSlug)
      .single();

    if (roomError || !room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }

    // ユーザーがルーム参加者か確認
    const { data: participant } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', room.id)
      .eq('username', username)
      .single();

    if (!participant) {
      res.status(403).json({
        success: false,
        error: 'Access denied. Not a room participant'
      });
      return;
    }

    // ユーザーがアクセス可能なファイル共有一覧
    const { data: shares, error } = await supabase
      .from('file_shares')
      .select(`
        id,
        file_name,
        file_type,
        owner_username,
        share_token,
        expires_at,
        created_at,
        file_share_permissions!inner (
          permission_type,
          status
        )
      `)
      .eq('room_id', room.id)
      .eq('is_active', true)
      .eq('file_share_permissions.username', username)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get shares error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get file shares'
      });
      return;
    }

    // 期限切れでないファイルのみフィルタ
    const activeShares = (shares || []).filter(share => 
      !share.expires_at || new Date(share.expires_at) > new Date()
    );

    res.json({
      success: true,
      data: activeShares.map(share => ({
        share_token: share.share_token,
        file_name: share.file_name,
        file_type: share.file_type,
        owner_username: share.owner_username,
        permission_type: share.file_share_permissions[0].permission_type,
        status: share.file_share_permissions[0].status,
        expires_at: share.expires_at,
        created_at: share.created_at
      }))
    });

  } catch (error) {
    console.error('Get room shares error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ファイル共有取り消し
router.delete('/shares/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { username } = req.body;

    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required'
      });
      return;
    }

    // ファイル共有の所有者確認
    const { data: fileShare, error } = await supabase
      .from('file_shares')
      .select('id, file_name, owner_username')
      .eq('share_token', token)
      .eq('owner_username', username)
      .eq('is_active', true)
      .single();

    if (error || !fileShare) {
      res.status(404).json({
        success: false,
        error: 'File share not found or access denied'
      });
      return;
    }

    // ファイル共有無効化
    const { error: updateError } = await supabase
      .from('file_shares')
      .update({ is_active: false })
      .eq('id', fileShare.id);

    if (updateError) {
      console.error('Revoke share error:', updateError);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke file share'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: 'File share revoked successfully',
        file_name: fileShare.file_name
      }
    });

  } catch (error) {
    console.error('Revoke share error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;