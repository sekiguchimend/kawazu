import { createClient } from '@supabase/supabase-js';

// Supabase接続設定
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-production-supabase-url.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your-production-service-key';

if (!supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_SERVICE_KEY not found, using local development setup');
}

// サービスキーを使用したクライアント（Admin権限）
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
      'Prefer': 'return=minimal'
    }
  },
  db: {
    schema: 'public'
  }
});

// デバッグ用：異なる設定でもう一つのクライアントを作成
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey
    }
  }
});

console.log('🔍 Supabase client initialized with:');
console.log('URL:', supabaseUrl);
console.log('Service Key present:', !!supabaseServiceKey);
console.log('Service Key length:', supabaseServiceKey?.length || 0);

// 接続テスト関数
export async function testConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing database connection...');
    console.log('🔍 Supabase URL:', supabaseUrl);
    console.log('🔍 Service Key exists:', !!supabaseServiceKey);
    console.log('🔍 Service Key length:', supabaseServiceKey?.length || 0);
    
    if (!supabaseServiceKey) {
      console.warn('⚠️  SUPABASE_SERVICE_KEY未設定のため接続テストをスキップします');
      return false;
    }

    console.log('🔍 Attempting to query rooms table...');
    const { data, error, count } = await supabase
      .from('rooms')
      .select('id', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed with error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    
    console.log('✅ Database connection successful');
    console.log('🔍 Query result:', data);
    console.log('🔍 Rooms count:', count);
    
    // サービスロール権限のテスト
    console.log('🔍 Testing service role permissions...');
    const { data: roleData, error: roleError } = await supabase.rpc('auth_role');
    if (roleError) {
      console.log('🔍 Service role test failed (expected for client connections):', roleError.message);
    } else {
      console.log('🔍 Current role:', roleData);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database connection error (caught exception):', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      error: error
    });
    return false;
  }
}