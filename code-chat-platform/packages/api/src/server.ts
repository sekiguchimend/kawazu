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

// セキュアなtrust proxy設定（Render.com環境対応）
// 1つのプロキシレイヤーのみ信頼（Render.comの場合）
app.set('trust proxy', 1);

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
  },
  // 接続安定性を向上させる設定
  pingTimeout: 60000, // ping timeout を1分に延長
  pingInterval: 25000, // ping interval を25秒に設定
  upgradeTimeout: 10000, // アップグレードタイムアウトを10秒に設定
  maxHttpBufferSize: 1e6, // バッファサイズを拡大（1MB）
  allowEIO3: true, // 古いEngine.IOバージョンとの互換性
  transports: ['polling', 'websocket'], // pollingを優先
  allowUpgrades: true,
  cookie: false // セッションCookieを無効化（よりステートレス）
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

// レート制限（プロキシ環境対応・セキュア設定）
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大リクエスト数
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // セキュアなtrust proxy設定
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  skip: (req) => {
    // ヘルスチェックなどの特定のエンドポイントをスキップ
    return req.path === '/health' || req.path === '/api';
  }
});

// スローダウン（セキュア設定）
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: () => 500
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
  
  // 重要な環境変数の検証
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET環境変数が設定されていません');
    console.error('💡 Render.comのダッシュボードでJWT_SECRETを設定してください');
    console.error('💡 64文字以上のランダムな文字列を使用してください');
    process.exit(1);
  }
  
  if (jwtSecret.length < 64) {
    console.error('❌ JWT_SECRETが短すぎます（現在: ' + jwtSecret.length + '文字）');
    console.error('💡 セキュリティのため64文字以上の文字列を使用してください');
    process.exit(1);
  }
  
  console.log('✅ JWT_SECRET検証完了');
  
  // 設定検証と表示
  printConfigStatus();
  const config = getAppConfig();
  
  // データベース接続テスト
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('❌ データベース接続に失敗しました');
    console.error('💡 SUPABASE_URLとSUPABASE_SERVICE_KEYの設定を確認してください');
    process.exit(1);
  }
  
  server.listen(PORT, () => {
    console.log(`🚀 Kawazu API Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🔗 Health check: https://kawazu.onrender.com/health`);
    console.log(`🌐 CORS origins: ${config.server.corsOrigins.join(', ')}`);
    console.log(`💳 Payments: ${config.stripe.isConfigured ? 'Enabled' : 'Disabled'}`);
    console.log(`🛡️  Security: ${config.security.enableHttps ? 'HTTPS' : 'HTTP'} mode`);
    console.log('✅ サーバー起動完了 - WebSocket接続を受け付けています');
  });
}

startServer().catch(console.error);

export { app, server, io };