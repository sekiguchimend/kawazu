import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  planLimits?: any;
}

// JWT生成
export function generateToken(user: any): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// JWT検証ミドルウェア
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔍 Auth middleware - Token present:', !!token);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('🔍 Auth middleware - JWT decoded:', { id: decoded.id, username: decoded.username });
    
    // Supabaseのauth.usersテーブルからユーザー情報を取得
    const { data: user, error } = await supabase.auth.admin.getUserById(decoded.id);

    if (error || !user.user) {
      console.log('❌ Auth middleware - User not found:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    console.log('✅ Auth middleware - User found:', user.user.id);

    req.user = {
      id: user.user.id,
      email: user.user.email || decoded.email,
      username: decoded.username || user.user.user_metadata?.username || 'user',
      role: decoded.role || 'user'
    };
    
    next();
  } catch (error) {
    console.log('❌ Auth middleware - JWT error:', error);
    res.status(403).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// オプション認証（トークンがなくても続行）
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { data: user, error } = await supabase.auth.admin.getUserById(decoded.id);

      if (!error && user.user) {
        req.user = {
          id: user.user.id,
          email: user.user.email || decoded.email,
          username: decoded.username || user.user.user_metadata?.username || 'user',
          role: decoded.role || 'user'
        };
      }
    }
    
    next();
  } catch (error) {
    // エラーでも続行
    next();
  }
};

// 管理者権限チェック
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
    return;
  }
  next();
};

// モデレーター以上権限チェック
export const requireModerator = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: 'Moderator access required'
    });
    return;
  }
  next();
};