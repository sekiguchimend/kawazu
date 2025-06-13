import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import { generateToken, AuthenticatedRequest } from '../middleware/auth';
import { authLimiter, logSecurityEvent } from '../middleware/security';
import Joi from 'joi';

const router = Router();

// バリデーションスキーマ
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  username: Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_-]+$/).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// ユーザー登録
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    
    if (error) {
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
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username }
    });

    if (authError) {
      logSecurityEvent('user_registration_failed', {
        email,
        username,
        error: authError.message
      }, req, 'medium');

      res.status(400).json({
        success: false,
        error: authError.message
      });
      return;
    }

    // JWTトークン生成
    const token = generateToken({
      id: authData.user.id,
      email: authData.user.email,
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
    const { error, value } = loginSchema.validate(req.body);
    
    if (error) {
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
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      logSecurityEvent('user_login_failed', {
        email,
        error: authError.message
      }, req, 'medium');

      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // ユーザー情報取得
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      authData.user.id
    );

    if (userError || !userData.user) {
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

export default router;