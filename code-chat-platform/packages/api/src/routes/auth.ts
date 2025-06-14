import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import { generateToken, AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { authLimiter, logSecurityEvent } from '../middleware/security';
import Joi from 'joi';

const router = Router();

// バリデーションスキーマ（パスワード要件を緩和）
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(), // 最小6文字に変更
  username: Joi.string().min(2).max(50).required() // パターン制限を削除して日本語も許可
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// ユーザー登録
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    console.log('Registration attempt:', { email: req.body.email, username: req.body.username });
    
    const { error, value } = registerSchema.validate(req.body);
    
    if (error) {
      console.log('Validation error:', error.details);
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
      return;
    }

    const { email, password, username } = value;

    // Supabaseでユーザー作成
    console.log('Creating user in Supabase...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      email_confirm: false // メール確認を無効化
    });

    // 開発環境では、作成したユーザーを強制的に確認済みにする
    if (!authError && authData.user && process.env.NODE_ENV === 'development') {
      await supabase.auth.admin.updateUserById(authData.user.id, {
        email_confirm: true
      });
    }

    if (authError) {
      console.error('Supabase auth error:', {
        message: authError.message,
        status: authError.status,
        name: authError.name
      });
      
      logSecurityEvent('user_registration_failed', {
        email,
        username,
        error: authError.message
      }, req, 'medium');

      // より具体的なエラーメッセージを返す
      let errorMessage = 'Registration failed';
      if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
        errorMessage = 'User already exists';
      } else if (authError.message.includes('password')) {
        errorMessage = 'Password does not meet requirements';
      } else if (authError.message.includes('email')) {
        errorMessage = 'Invalid email address';
      }

      res.status(400).json({
        success: false,
        error: errorMessage,
        details: authError.message
      });
      return;
    }

    console.log('User created successfully:', authData.user.id);

    // JWTトークン生成
    const token = generateToken({
      id: authData.user.id,
      email: authData.user.email!,
      username,
      role: 'user'
    });

    logSecurityEvent('user_registered', {
      userId: authData.user.id,
      email,
      username
    }, req, 'low');

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          username
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ユーザーログイン
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    console.log('Login attempt:', { email: req.body.email });
    
    const { error, value } = loginSchema.validate(req.body);
    
    if (error) {
      console.log('Login validation error:', error.details);
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
      return;
    }

    const { email, password } = value;

    // Supabaseでログイン
    console.log('Attempting Supabase login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('Supabase login error:', {
        message: authError.message,
        status: authError.status,
        name: authError.name
      });
      
      logSecurityEvent('user_login_failed', {
        email,
        error: authError.message
      }, req, 'medium');

      // より具体的なエラーメッセージを返す
      let errorMessage = 'Invalid credentials';
      if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Email or password is incorrect';
      } else if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address';
      }

      res.status(401).json({
        success: false,
        error: errorMessage,
        details: authError.message
      });
      return;
    }

    console.log('Login successful:', authData.user.id);

    // ユーザー情報取得
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      authData.user.id
    );

    if (userError || !userData.user) {
      console.error('User data error:', userError);
      res.status(401).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const username = userData.user.user_metadata?.username || 'user';

    // JWTトークン生成
    const token = generateToken({
      id: userData.user.id,
      email: userData.user.email!,
      username,
      role: 'user'
    });

    logSecurityEvent('user_logged_in', {
      userId: userData.user.id,
      email: userData.user.email
    }, req, 'low');

    res.json({
      success: true,
      data: {
        user: {
          id: userData.user.id,
          email: userData.user.email,
          username
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 現在のユーザー情報取得
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // ユーザープロフィール情報も一緒に取得
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', req.user.username)
      .single();

    res.json({
      success: true,
      data: {
        user: req.user,
        profile: profile || null
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// JWT検証
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Token is required'
      });
      return;
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      res.status(500).json({
        success: false,
        error: 'JWT configuration error'
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      console.log('🔍 JWT decoded successfully:', { id: decoded.id, username: decoded.username, email: decoded.email });
      
      // Supabaseのauth.usersテーブルからユーザー情報を取得
      const { data: user, error } = await supabase.auth.admin.getUserById(decoded.id);

      if (error || !user.user) {
        console.log('❌ User not found in Supabase auth:', error);
        res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
        return;
      }

      console.log('✅ User verification successful:', user.user.id);

      res.json({
        success: true,
        data: {
          valid: true,
          user: {
            id: user.user.id,
            email: user.user.email,
            username: decoded.username || user.user.user_metadata?.username || 'user',
            role: decoded.role || 'user'
          }
        }
      });

    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        data: {
          valid: false
        }
      });
    }

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;