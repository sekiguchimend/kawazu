/**
 * 環境変数の検証とアプリケーション設定の管理
 */

interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: AppConfig;
}

interface AppConfig {
  server: {
    port: number;
    nodeEnv: string;
    corsOrigins: string[];
    frontendUrl: string;
  };
  database: {
    supabaseUrl: string;
    supabaseServiceKey: string;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
    isConfigured: boolean;
  };
  security: {
    enableHttps: boolean;
    hstsMaxAge: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };
}

/**
 * 必須環境変数の検証
 */
export function validateEnvironmentConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 必須環境変数チェック
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'JWT_SECRET'
  ];

  const missingRequired = requiredVars.filter(varName => !process.env[varName]);
  if (missingRequired.length > 0) {
    errors.push(`Missing required environment variables: ${missingRequired.join(', ')}`);
  }

  // JWT Secret強度チェック
  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length < 64) {
    errors.push('JWT_SECRET must be at least 64 characters long for security');
  }

  // Stripe設定チェック
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  
  if (!stripeSecretKey) {
    warnings.push('STRIPE_SECRET_KEY not configured - payment features will not work');
  } else if (!stripeSecretKey.startsWith('sk_')) {
    errors.push('STRIPE_SECRET_KEY must start with "sk_"');
  }

  if (!stripeWebhookSecret) {
    warnings.push('STRIPE_WEBHOOK_SECRET not configured - webhooks will not work');
  } else if (!stripeWebhookSecret.startsWith('whsec_')) {
    errors.push('STRIPE_WEBHOOK_SECRET must start with "whsec_"');
  }

  // Supabase URL形式チェック
  const supabaseUrl = process.env.SUPABASE_URL || '';
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    errors.push('SUPABASE_URL must start with "https://"');
  }

  // CORS設定チェック
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['https://kawazu-web.vercel.app'];
  
  const hasLocalhostInProd = corsOrigins.some(origin => origin.includes('localhost'));
  if (hasLocalhostInProd && process.env.NODE_ENV === 'production') {
    warnings.push('CORS_ORIGINS contains localhost URLs in production');
  }

  // セキュリティ設定チェック
  if (process.env.NODE_ENV === 'production') {
    if (process.env.ENABLE_HTTPS !== 'true') {
      warnings.push('ENABLE_HTTPS should be true in production');
    }
  }

  // 設定オブジェクト構築
  const config: AppConfig = {
    server: {
      port: parseInt(process.env.PORT || '8000'),
      nodeEnv: process.env.NODE_ENV || 'development',
      corsOrigins,
      frontendUrl: process.env.FRONTEND_URL || 'https://kawazu-web.vercel.app'
    },
    database: {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || ''
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET || '',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    stripe: {
      secretKey: stripeSecretKey,
      webhookSecret: stripeWebhookSecret,
      isConfigured: !!(stripeSecretKey && stripeWebhookSecret)
    },
    security: {
      enableHttps: process.env.ENABLE_HTTPS === 'true',
      hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'),
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
    }
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config
  };
}

/**
 * 設定状況をコンソールに出力
 */
export function printConfigStatus(): void {
  const validation = validateEnvironmentConfig();
  
  console.log('\n🔧 Configuration Status:');
  console.log('========================');
  
  // 基本情報
  console.log(`Environment: ${validation.config.server.nodeEnv}`);
  console.log(`Port: ${validation.config.server.port}`);
  console.log(`Frontend URL: ${validation.config.server.frontendUrl}`);
  
  // データベース設定
  console.log(`\n📊 Database:`);
  console.log(`Supabase URL: ${validation.config.database.supabaseUrl ? '✅ Configured' : '❌ Missing'}`);
  console.log(`Service Key: ${validation.config.database.supabaseServiceKey ? '✅ Configured' : '❌ Missing'}`);
  
  // 認証設定
  console.log(`\n🔐 Authentication:`);
  console.log(`JWT Secret: ${validation.config.auth.jwtSecret.length >= 64 ? '✅ Strong' : '❌ Weak'} (${validation.config.auth.jwtSecret.length} chars)`);
  
  // Stripe設定
  console.log(`\n💳 Stripe Payments:`);
  console.log(`Secret Key: ${validation.config.stripe.secretKey ? '✅ Configured' : '⚠️  Not configured'}`);
  console.log(`Webhook Secret: ${validation.config.stripe.webhookSecret ? '✅ Configured' : '⚠️  Not configured'}`);
  console.log(`Payment Features: ${validation.config.stripe.isConfigured ? '✅ Available' : '❌ Disabled'}`);
  
  // セキュリティ設定
  console.log(`\n🛡️  Security:`);
  console.log(`HTTPS: ${validation.config.security.enableHttps ? '✅ Enabled' : '⚠️  Disabled'}`);
  console.log(`Rate Limiting: ${validation.config.security.rateLimitMaxRequests} requests per ${validation.config.security.rateLimitWindowMs/60000} minutes`);
  
  // エラー表示
  if (validation.errors.length > 0) {
    console.log(`\n❌ Configuration Errors:`);
    validation.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  // 警告表示
  if (validation.warnings.length > 0) {
    console.log(`\n⚠️  Configuration Warnings:`);
    validation.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  if (validation.isValid) {
    console.log(`\n✅ Configuration is valid!`);
  } else {
    console.log(`\n❌ Configuration has errors that must be fixed!`);
  }
  
  console.log('========================\n');
}

/**
 * アプリケーション設定を取得
 */
export function getAppConfig(): AppConfig {
  const validation = validateEnvironmentConfig();
  
  if (!validation.isValid) {
    console.error('❌ Invalid configuration detected:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    process.exit(1);
  }
  
  return validation.config;
}