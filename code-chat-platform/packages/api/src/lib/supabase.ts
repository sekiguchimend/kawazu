import { createClient } from '@supabase/supabase-js';

// 環境変数の検証
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// 必須環境変数のチェック
if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL環境変数が設定されていません');
  console.error('💡 Render.comのダッシュボードで環境変数を設定してください');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY環境変数が設定されていません');
  console.error('💡 Render.comのダッシュボードでSupabaseのサービスキーを設定してください');
  process.exit(1);
}

// URL形式の検証
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.error('❌ SUPABASE_URLの形式が正しくありません');
  console.error('💡 正しい形式: https://your-project.supabase.co');
  process.exit(1);
}

// サービスキーの形式検証
if (!supabaseServiceKey.startsWith('eyJ')) {
  console.error('❌ SUPABASE_SERVICE_KEYの形式が正しくありません');
  console.error('💡 Supabaseのダッシュボードから正しいservice_roleキーを取得してください');
  process.exit(1);
}

console.log('✅ Supabase環境変数の検証完了');
console.log('🔍 Supabase URL:', supabaseUrl);
console.log('🔍 Service Key length:', supabaseServiceKey.length);

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

// 接続テスト関数
export async function testConnection(): Promise<boolean> {
  try {
    console.log('🔍 Supabaseデータベース接続をテスト中...');
    
    // タイムアウト付きでクエリを実行
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), 10000)
    );
    
    const queryPromise = supabase
      .from('rooms')
      .select('id', { count: 'exact' })
      .limit(1);
    
    const { data, error, count } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (error) {
      console.error('❌ データベース接続エラー:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        supabaseUrl: supabaseUrl,
        serviceKeyLength: supabaseServiceKey.length
      });
      
      // よくあるエラーの対処法を表示
      if (error.message.includes('Invalid API key')) {
        console.error('💡 SUPABASE_SERVICE_KEYが正しくない可能性があります');
      } else if (error.message.includes('not found') || error.message.includes('404')) {
        console.error('💡 SUPABASE_URLが正しくない可能性があります');
      } else if (error.message.includes('permission')) {
        console.error('💡 サービスキーの権限に問題がある可能性があります');
      }
      
      return false;
    }
    
    console.log('✅ データベース接続成功');
    console.log('🔍 クエリ結果:', data);
    console.log('🔍 ルーム数:', count);
    
    return true;
  } catch (error) {
    console.error('❌ データベース接続テストでエラーが発生:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      type: typeof error,
      supabaseUrl: supabaseUrl,
      serviceKeyLength: supabaseServiceKey.length
    });
    
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error('💡 データベース接続がタイムアウトしました。ネットワークまたはSupabaseの設定を確認してください');
    }
    
    return false;
  }
}