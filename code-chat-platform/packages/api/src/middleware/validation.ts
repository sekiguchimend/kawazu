import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import DOMPurify from 'isomorphic-dompurify';

// ルーム作成用スキーマ
const roomSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  slug: Joi.string().trim().min(1).max(100).pattern(/^[a-zA-Z0-9\-_]+$/).required(),
  is_private: Joi.boolean().default(false),
  password: Joi.string().min(8).max(255).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).when('is_private', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

// ルーム参加用スキーマ
const joinRoomSchema = Joi.object({
  username: Joi.string().trim().min(1).max(100).required(),
  password: Joi.string().optional()
});

// メッセージ送信用スキーマ
const messageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(10000).required(),
  message_type: Joi.string().valid('text', 'code').default('text')
});

// HTMLサニタイズ関数
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

// バリデーションミドルウェア生成関数
function validateSchema(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log('=== Validation Debug ===');
    console.log('Request body before validation:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      console.error('=== Validation Error ===');
      console.error('Error details:', error.details);
      
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      console.error('Formatted error messages:', errorMessages);

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errorMessages
      });
      return;
    }

    console.log('Validation passed, validated value:', JSON.stringify(value, null, 2));

    // XSS防止のためHTMLサニタイズ
    const sanitizedValue = sanitizeObject(value);
    
    console.log('After sanitization:', JSON.stringify(sanitizedValue, null, 2));
    
    // バリデーション済み・サニタイズ済みデータで置換
    req.body = sanitizedValue;
    next();
  };
}

// 各バリデーションミドルウェア
export const validateRoom = validateSchema(roomSchema);
export const validateJoinRoom = validateSchema(joinRoomSchema);
export const validateMessage = validateSchema(messageSchema);

// プロフィール用スキーマ
const profileSchema = Joi.object({
  username: Joi.string().trim().min(1).max(100).pattern(/^[a-zA-Z0-9_\-]+$/).required(),
  display_name: Joi.string().trim().min(1).max(100).optional(),
  bio: Joi.string().trim().max(1000).optional().allow(''),
  avatar_url: Joi.string().uri().max(500).optional().allow(''),
  website_url: Joi.string().uri().max(500).optional().allow(''),
  twitter_handle: Joi.string().trim().max(100).pattern(/^[a-zA-Z0-9_]+$/).optional().allow(''),
  github_handle: Joi.string().trim().max(100).pattern(/^[a-zA-Z0-9_\-]+$/).optional().allow(''),
  skills: Joi.array().items(Joi.string().trim().max(50)).max(20).optional(),
  location: Joi.string().trim().max(100).optional().allow(''),
  timezone: Joi.string().trim().max(50).optional().allow(''),
  is_public: Joi.boolean().default(true)
});

// プロフィールバリデーション
export const validateProfile = validateSchema(profileSchema);

// URLパラメータバリデーション
export const validateSlug = (req: Request, res: Response, next: NextFunction): void => {
  const { slug, room_slug } = req.params;
  const targetSlug = slug || room_slug;
  
  console.log('Validating slug:', targetSlug);
  
  if (!targetSlug || !/^[a-zA-Z0-9_-]+$/.test(targetSlug)) {
    console.log('Slug validation failed for:', targetSlug);
    res.status(400).json({
      success: false,
      error: 'Invalid room slug format'
    });
    return;
  }
  
  next();
};

export const validateUsername = (req: Request, res: Response, next: NextFunction): void => {
  const { username } = req.params;
  
  if (!username || !/^[a-zA-Z0-9_\-]+$/.test(username)) {
    res.status(400).json({
      success: false,
      error: 'Invalid username format'
    });
    return;
  }
  
  next();
};