import { createClient } from '@supabase/supabase-js';

// Supabase接続設定
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_SERVICE_KEY not found, using local development setup');
}

// サービスキーを使用したクライアント（Admin権限）
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 接続テスト関数
export async function testConnection(): Promise<boolean> {
  try {
    if (!supabaseServiceKey) {
      console.warn('⚠️  SUPABASE_SERVICE_KEY未設定のため接続テストをスキップします');
      return false;
    }

    const { data, error } = await supabase
      .from('rooms')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}