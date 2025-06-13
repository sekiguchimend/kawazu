import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// セキュリティログ関数
export const logSecurityEvent = (
  event: string,
  details: any,
  req?: Request,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    url: req?.originalUrl,
    method: req?.method
  };
  
  if (severity === 'high' || severity === 'critical') {
    console.error('🚨 SECURITY EVENT:', JSON.stringify(logEntry, null, 2));
  } else {
    console.warn('⚠️  Security Event:', JSON.stringify(logEntry, null, 2));
  }
};

// 認証試行レート制限
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回の試行
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityEvent('auth_rate_limit_exceeded', {
      ip: req.ip,
      attempts: 5
    }, req, 'high');
    
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later'
    });
  }
});

// メッセージ送信レート制限
export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分
  max: 30, // 最大30メッセージ
  message: {
    success: false,
    error: 'Too many messages, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityEvent('message_rate_limit_exceeded', {
      ip: req.ip,
      room: req.params.room_slug
    }, req, 'medium');
    
    res.status(429).json({
      success: false,
      error: 'Too many messages, please slow down'
    });
  }
});

// ルーム作成レート制限
export const roomCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 10, // 最大10ルーム
  message: {
    success: false,
    error: 'Too many rooms created, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityEvent('room_creation_rate_limit_exceeded', {
      ip: req.ip,
      attempts: 10
    }, req, 'medium');
    
    res.status(429).json({
      success: false,
      error: 'Too many rooms created, please try again later'
    });
  }
});

// セキュリティイベント監視ミドルウェア
export const securityMonitor = (req: Request, res: Response, next: NextFunction): void => {
  // 疑わしいユーザーエージェントをチェック
  const userAgent = req.get('User-Agent')?.toLowerCase() || '';
  const suspiciousPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'php'
  ];
  
  if (suspiciousPatterns.some(pattern => userAgent.includes(pattern))) {
    logSecurityEvent('suspicious_user_agent', {
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }, req, 'low');
  }
  
  // 異常に大きなリクエストをチェック
  const contentLength = parseInt(req.get('Content-Length') || '0');
  if (contentLength > 2 * 1024 * 1024) { // 2MB
    logSecurityEvent('large_request_detected', {
      contentLength,
      ip: req.ip
    }, req, 'medium');
  }
  
  // SQL Injection パターンをチェック
  const bodyStr = JSON.stringify(req.body);
  const sqlPatterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /--/,
    /\/\*/
  ];
  
  if (sqlPatterns.some(pattern => pattern.test(bodyStr))) {
    logSecurityEvent('sql_injection_attempt', {
      body: req.body,
      ip: req.ip
    }, req, 'critical');
  }
  
  next();
};

// CSRF保護（WebSocket用トークン検証）
export const generateCSRFToken = (): string => {
  return require('crypto').randomBytes(32).toString('hex');
};

export const validateCSRFToken = (token: string, expectedToken: string): boolean => {
  return token === expectedToken && token.length === 64;
};