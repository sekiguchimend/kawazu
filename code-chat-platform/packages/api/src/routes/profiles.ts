import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { validateProfile, validateUsername } from '../middleware/validation';

const router = Router();

// プロフィール取得
router.get('/:username', validateUsername, async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        username,
        display_name,
        bio,
        avatar_url,
        website_url,
        twitter_handle,
        github_handle,
        skills,
        location,
        timezone,
        is_public,
        created_at,
        updated_at
      `)
      .eq('username', username)
      .single();

    if (error || !profile) {
      res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
      return;
    }

    // プライベートプロフィールの場合は限定的な情報のみ
    if (!profile.is_public) {
      res.json({
        success: true,
        data: {
          username: profile.username,
          display_name: profile.display_name,
          is_public: false,
          message: 'This profile is private'
        }
      });
      return;
    }

    // 閲覧履歴記録（オプション）
    const viewerUsername = req.query.viewer as string;
    if (viewerUsername && viewerUsername !== username) {
      await supabase
        .from('profile_views')
        .insert({
          viewer_username: viewerUsername,
          viewed_username: username
        });
    }

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// プロフィール作成
router.post('/', validateProfile, async (req: Request, res: Response) => {
  console.log('---[/api/profiles POST]---');
  console.log('Received request to create profile. Body:');
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const profileData = req.body;

    // ユーザー名重複チェック
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('username', profileData.username)
      .single();

    if (existingProfile) {
      res.status(409).json({
        success: false,
        error: 'Username already taken',
      });
    } else {
      // プロフィール作成（idは自動生成されるためuuidv4で生成）
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .insert({
          ...profileData,
          id: crypto.randomUUID() // UUID v4を生成
        })
        .select()
        .single();

      if (error) {
        console.error('>>> Supabase Error:', JSON.stringify(error, null, 2));
        res.status(500).json({
          success: false,
          error: 'Failed to create profile',
          details: error.message,
        });
      } else {
        console.log('Profile created successfully:', profile);
        res.status(201).json({
          success: true,
          data: profile,
        });
      }
    }
  } catch (err: any) {
    console.error('>>> CATCH BLOCK Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: err.message,
    });
  }
});

// プロフィール更新
router.put('/:username', validateUsername, validateProfile, async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const updateData = req.body;

    // ユーザー名は更新不可
    delete updateData.username;
    delete updateData.created_at;

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('username', username)
      .select()
      .single();

    if (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
      return;
    }

    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
      return;
    }

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// プロフィール削除
router.delete('/:username', validateUsername, async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('username', username);

    if (error) {
      console.error('Delete profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete profile'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// プロフィール検索
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      skills, 
      location, 
      limit = '20', 
      offset = '0' 
    } = req.query;

    let query = supabase
      .from('user_profiles')
      .select(`
        username,
        display_name,
        bio,
        avatar_url,
        skills,
        location,
        created_at
      `)
      .eq('is_public', true);

    // 検索フィルター
    if (search) {
      query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%,bio.ilike.%${search}%`);
    }

    if (skills) {
      query = query.contains('skills', [skills]);
    }

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    const { data: profiles, error } = await query
      .order('created_at', { ascending: false })
      .range(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string) - 1
      );

    if (error) {
      console.error('Search profiles error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search profiles'
      });
      return;
    }

    res.json({
      success: true,
      data: profiles || [],
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        count: profiles?.length || 0
      }
    });

  } catch (error) {
    console.error('Search profiles error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// プロフィールURL生成
router.get('/:username/url', validateUsername, async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    // プロフィール存在確認
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username, is_public')
      .eq('username', username)
      .single();

    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
      return;
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const profileUrl = `${baseUrl}/profile/${username}`;

    res.json({
      success: true,
      data: {
        username: profile.username,
        url: profileUrl,
        is_public: profile.is_public
      }
    });

  } catch (error) {
    console.error('Get profile URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;