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

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // データベースからユーザー情報を取得
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, role, is_active')
      .eq('id', decoded.id)
      .single();

    if (error || !user || !user.is_active) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
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
      const { data: user } = await supabase
        .from('users')
        .select('id, username, email, role, is_active')
        .eq('id', decoded.id)
        .single();

      if (user && user.is_active) {
        req.user = user;
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