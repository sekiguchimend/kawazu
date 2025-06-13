# Supabase セットアップガイド

Code Chatプラットフォーム用のSupabase設定手順

## 🚀 Supabaseプロジェクト作成

### 1. Supabaseアカウント作成
1. [Supabase](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインイン

### 2. 新しいプロジェクト作成
1. 「New Project」をクリック
2. プロジェクト設定:
   - **Name**: `code-chat-platform`
   - **Database Password**: 強力なパスワードを設定
   - **Region**: Japan (東京) を選択
   - **Pricing Plan**: Free tier でOK

### 3. プロジェクト情報の取得
プロジェクト作成後、以下の情報をコピー:
- **Project URL**: `https://xxx.supabase.co`
- **anon public key**: `eyJ...`
- **service_role key**: `eyJ...`

## 🛠️ データベース設定

### 1. スキーマの適用
1. Supabase Dashboard → 「SQL Editor」
2. `supabase/schema.sql` の内容をコピー＆ペースト
3. 「RUN」をクリックして実行

### 2. サンプルデータの投入（オプション）
1. 同じくSQL Editorで
2. `supabase/seed.sql` の内容を実行
3. テスト用ルームとメッセージが作成されます

### 3. RLS (Row Level Security) の確認
- 「Authentication」→ 「Policies」で設定を確認
- 各テーブルにセキュリティポリシーが適用されていることを確認

## 🔐 環境変数設定

### packages/api/.env
```bash
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

### packages/web/.env.local
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🧪 動作確認

### 1. APIサーバーでの接続確認
```bash
cd packages/api
npm run dev
```
サーバー起動時に「✅ Database connection successful」が表示されればOK

### 2. Webアプリでの確認
```bash
cd packages/web
npm run dev
```
http://localhost:3000 でルーム一覧が表示されればOK

## 📊 データベース構造

### テーブル一覧
- **rooms**: チャットルーム情報
- **messages**: メッセージデータ
- **room_participants**: ルーム参加者情報

### 主要カラム
**rooms**
- `id`: ルーム一意ID
- `name`: ルーム名
- `slug`: ルーム識別子（CLI用）
- `is_private`: プライベートルームフラグ
- `password_hash`: パスワードハッシュ

**messages**
- `id`: メッセージ一意ID
- `room_id`: 所属ルームID
- `username`: 送信者名
- `content`: メッセージ内容
- `message_type`: メッセージタイプ（text/code）

## 🔧 トラブルシューティング

### 接続エラーの場合
1. プロジェクトURLが正しいか確認
2. API Keyが正しいか確認
3. Supabaseプロジェクトが有効か確認

### RLSエラーの場合
1. ポリシーが正しく設定されているか確認
2. service_role keyを使用しているか確認（API側）

### スキーマエラーの場合
1. `schema.sql` を再実行
2. テーブルが正しく作成されているか確認

## 📚 参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)