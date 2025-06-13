import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// 共有コードドキュメント作成
router.post('/documents', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content, language, room_id, is_public } = req.body;

    if (!title) {
      res.status(400).json({
        success: false,
        error: 'Document title is required'
      });
      return;
    }

    const { data: document, error } = await supabase
      .from('collaboration_documents')
      .insert({
        title,
        content: content || '',
        language: language || 'javascript',
        room_id,
        created_by: req.user!.id,
        is_public: is_public || false,
        version: 1
      })
      .select()
      .single();

    if (error) {
      console.error('Create document error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create document'
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ドキュメント一覧取得
router.get('/documents', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { room_id, limit = '20', offset = '0' } = req.query;

    let query = supabase
      .from('collaboration_documents')
      .select(`
        id,
        title,
        language,
        created_at,
        updated_at,
        version,
        is_public,
        room_id,
        created_by,
        users!collaboration_documents_created_by_fkey(username, display_name)
      `);

    if (room_id) {
      query = query.eq('room_id', room_id);
    } else {
      // パブリックドキュメントまたは自分が作成したドキュメント
      query = query.or(`is_public.eq.true,created_by.eq.${req.user!.id}`);
    }

    const { data: documents, error } = await query
      .order('updated_at', { ascending: false })
      .range(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string) - 1
      );

    if (error) {
      console.error('Get documents error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get documents'
      });
      return;
    }

    res.json({
      success: true,
      data: documents || []
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ドキュメント詳細取得
router.get('/documents/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: document, error } = await supabase
      .from('collaboration_documents')
      .select(`
        *,
        users!collaboration_documents_created_by_fkey(username, display_name),
        collaboration_cursors(*),
        collaboration_edits(
          id,
          user_id,
          operation,
          position,
          content,
          created_at,
          users!collaboration_edits_user_id_fkey(username, display_name)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    // 権限チェック
    if (!document.is_public && document.created_by !== req.user!.id) {
      // ルームのメンバーかチェック
      if (document.room_id) {
        const { data: participant } = await supabase
          .from('room_participants')
          .select('id')
          .eq('room_id', document.room_id)
          .eq('user_id', req.user!.id)
          .single();

        if (!participant) {
          res.status(403).json({
            success: false,
            error: 'Access denied'
          });
          return;
        }
      } else {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }
    }

    res.json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ドキュメント更新
router.put('/documents/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, operation, position } = req.body;

    // ドキュメント存在確認と権限チェック
    const { data: document } = await supabase
      .from('collaboration_documents')
      .select('id, created_by, room_id, version')
      .eq('id', id)
      .single();

    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
      return;
    }

    // 編集履歴を記録
    await supabase
      .from('collaboration_edits')
      .insert({
        document_id: id,
        user_id: req.user!.id,
        operation: operation || 'update',
        position: position || 0,
        content: content || '',
      });

    // ドキュメント更新
    const { data: updatedDocument, error } = await supabase
      .from('collaboration_documents')
      .update({
        content,
        version: document.version + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update document error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update document'
      });
      return;
    }

    res.json({
      success: true,
      data: updatedDocument
    });

  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// カーソル位置更新
router.post('/documents/:id/cursor', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { line, column, selection_start, selection_end } = req.body;

    // カーソル位置をupsert
    const { error } = await supabase
      .from('collaboration_cursors')
      .upsert({
        document_id: id,
        user_id: req.user!.id,
        line: line || 0,
        column: column || 0,
        selection_start,
        selection_end,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Update cursor error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update cursor'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Cursor position updated'
    });

  } catch (error) {
    console.error('Update cursor error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// コードスニペット共有
router.post('/snippets', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, code, language, description, tags, is_public } = req.body;

    if (!title || !code) {
      res.status(400).json({
        success: false,
        error: 'Title and code are required'
      });
      return;
    }

    const { data: snippet, error } = await supabase
      .from('code_snippets')
      .insert({
        title,
        code,
        language: language || 'javascript',
        description: description || '',
        tags: tags || [],
        is_public: is_public || false,
        created_by: req.user!.id
      })
      .select(`
        *,
        users!code_snippets_created_by_fkey(username, display_name)
      `)
      .single();

    if (error) {
      console.error('Create snippet error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create snippet'
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: snippet
    });

  } catch (error) {
    console.error('Create snippet error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// スニペット検索
router.get('/snippets', async (req: Request, res: Response) => {
  try {
    const { search, language, tags, limit = '20', offset = '0' } = req.query;

    let query = supabase
      .from('code_snippets')
      .select(`
        id,
        title,
        language,
        description,
        tags,
        created_at,
        updated_at,
        is_public,
        users!code_snippets_created_by_fkey(username, display_name)
      `)
      .eq('is_public', true);

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,code.ilike.%${search}%`);
    }

    if (language) {
      query = query.eq('language', language);
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query = query.overlaps('tags', tagArray);
    }

    const { data: snippets, error } = await query
      .order('created_at', { ascending: false })
      .range(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string) - 1
      );

    if (error) {
      console.error('Search snippets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search snippets'
      });
      return;
    }

    res.json({
      success: true,
      data: snippets || []
    });

  } catch (error) {
    console.error('Search snippets error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;