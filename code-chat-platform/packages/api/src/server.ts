import dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { supabase, testConnection } from './lib/supabase';
import { handleConnection } from './socket/handlers';
import { printConfigStatus, getAppConfig } from './utils/config-validator';

// ルートインポート
import authRouter from './routes/auth';
import roomsRouter from './routes/rooms';
import messagesRouter from './routes/messages';
import profilesRouter from './routes/profiles';
import fileSharingRouter from './routes/file-sharing';
import subscriptionsRouter from './routes/subscriptions';
import webhooksRouter from './routes/webhooks';
import { securityMonitor } from './middleware/security';

const app = express();

// Render.comなどのプロキシ環境でのtrust proxy設定
app.set('trust proxy', true);

const server = createServer(app);

// 環境変数から許可オリジンを取得
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'https://kawazu.vercel.app',
  'https://kawazu-web.vercel.app',
  'https://kawazu.onrender.com'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// セキュリティミドルウェア
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...allowedOrigins],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// レート制限（プロキシ環境対応）
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大リクエスト数
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // プロキシ環境での安全なIP取得
  keyGenerator: (req) => {
    // Render.comなどでは、true-client-ipまたはcf-connecting-ipが信頼できる
    const trustedIp = req.get('true-client-ip') || req.get('cf-connecting-ip');
    if (trustedIp) {
      return trustedIp;
    }
    
    // X-Forwarded-Forヘッダーの最初のIPを使用（但し、信頼できるプロキシからの場合のみ）
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    // フォールバック：req.ipを使用
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  skip: (req) => {
    // ヘルスチェックなどの特定のエンドポイントをスキップ
    return req.path === '/health' || req.path === '/api';
  }
});

// スローダウン（プロキシ環境対応）
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: () => 500,
  // rate limiterと同じIP取得ロジック
  keyGenerator: (req) => {
    const trustedIp = req.get('true-client-ip') || req.get('cf-connecting-ip');
    if (trustedIp) {
      return trustedIp;
    }
    
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

app.use(limiter);
app.use(speedLimiter);

// CORS設定
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// リクエストログミドルウェア
app.use((req, res, next) => {
  console.log(`=== Request Log ===`);
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body (before parsing):', req.body);
  next();
});

// ボディパーサー設定（サイズ制限付き）
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ボディパース後ログ
app.use((req, res, next) => {
  console.log('Parsed body:', req.body);
  next();
});

// セキュリティ監視ミドルウェア
app.use(securityMonitor);

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Kawazu API' 
  });
});

// 基本API情報
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Kawazu API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      rooms: '/api/rooms',
      messages: '/api/messages',
      profiles: '/api/profiles',
      fileSharing: '/api/file-sharing'
    }
  });
});

// Webhook（生データが必要なため、JSONパーサー前に設定）
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);

// REST APIルート
app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/file-sharing', fileSharingRouter);
app.use('/api/subscriptions', subscriptionsRouter);

// WebSocket接続処理
io.on('connection', handleConnection(io));

const PORT = process.env.PORT || 8000;

// データベース接続確認後にサーバー起動
async function startServer() {
  console.log('🚀 Starting Kawazu API Server...');
  
  // 設定検証と表示
  printConfigStatus();
  const config = getAppConfig();
  
  // データベース接続テスト
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('⚠️  Database connection failed, but server will continue');
  }
  
  server.listen(PORT, () => {
    console.log(`🚀 Kawazu API Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🔗 Health check: https://kawazu.onrender.com/health`);
    console.log(`🌐 CORS origins: ${config.server.corsOrigins.join(', ')}`);
    console.log(`💳 Payments: ${config.stripe.isConfigured ? 'Enabled' : 'Disabled'}`);
    console.log(`🛡️  Security: ${config.security.enableHttps ? 'HTTPS' : 'HTTP'} mode`);
  });
}

startServer().catch(console.error);

export { app, server, io };