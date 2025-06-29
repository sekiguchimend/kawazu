# Code Chat Platform

エンジニアがエディタ上でリアルタイムチャットできるプラットフォーム

## 🚀 プロジェクト概要

Kawazuは、開発者向けのリアルタイムチャットサービスです。Webでルームを作成し、CLIツールを使ってエディタ上でチャットできます。

### システム構成
- **Web UI**: Next.js (TypeScript) - ルーム管理
- **API Server**: Node.js (Express) - REST API & WebSocket
- **CLI Tool**: Node.js (TypeScript) - NPMパッケージ
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Socket.io

## 📁 プロジェクト構造

```
code-chat-platform/
├── packages/
│   ├── api/          # APIサーバー (Node.js + Express + Socket.io)
│   ├── web/          # Webアプリ (Next.js)
│   └── cli/          # CLIツール (Node.js CLI)
├── supabase/         # データベーススキーマ
└── docs/             # ドキュメント
```

## 🛠️ セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. Supabase設定
1. [Supabase](https://supabase.com) でプロジェクトを作成
2. `supabase/schema.sql` を実行してテーブルを作成
3. 環境変数を設定

### 3. 環境変数設定

**packages/api/.env**
```bash
PORT=8000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
FRONTEND_URL=http://localhost:3000
```

**packages/web/.env.local**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🚀 開発サーバー起動

### すべて同時に起動
```bash
npm run dev
```

### 個別に起動
```bash
# APIサーバー
npm run dev:api

# Webアプリ
npm run dev:web

# CLI開発
cd packages/cli
npm run dev
```

## 📱 使用方法

### 1. ルーム作成
1. http://localhost:3000 でWebアプリを開く
2. 新しいルームを作成

### 2. CLIでチャット参加
```bash
# CLIをビルド
cd packages/cli
npm run build

# ルームに参加
npx kawazu join room-name
```

### 3. エディタでチャット
1. `.codechat` ファイルが作成されます
2. エディタでファイルを開く
3. ファイルに入力して保存
4. リアルタイムでメッセージが送信されます

## 🧪 ビルド

```bash
# 全パッケージをビルド
npm run build

# 個別ビルド
cd packages/api && npm run build
cd packages/web && npm run build  
cd packages/cli && npm run build
```

## 📚 API仕様

### REST API
- `POST /api/rooms` - ルーム作成
- `GET /api/rooms/:slug` - ルーム情報取得
- `POST /api/rooms/:slug/join` - ルーム参加
- `GET /api/messages/:room_slug` - メッセージ履歴

### WebSocket Events
- `join-room` - ルーム参加
- `send-message` - メッセージ送信
- `new-message` - 新しいメッセージ受信
- `user-joined` - ユーザー参加通知
- `user-left` - ユーザー退出通知

## 🎯 主な機能

- ✅ Webでルーム作成・管理
- ✅ CLIでエディタチャット
- ✅ リアルタイムメッセージ配信
- ✅ プライベートルーム（パスワード保護）
- ✅ コードブロック対応
- ✅ 参加者管理
- ✅ ファイル監視による自動送信

## 🔧 技術スタック

### フロントエンド
- Next.js 15
- TypeScript
- Tailwind CSS
- Socket.io Client

### バックエンド
- Node.js
- Express.js
- Socket.io
- TypeScript
- Joi (バリデーション)

### データベース
- Supabase (PostgreSQL)
- Row Level Security

### CLI
- Commander.js
- Inquirer.js
- Chokidar (ファイル監視)
- Chalk (色付きテキスト)

## 📋 開発者向け情報

詳細な開発手順は [code-chat-development-guide.md](./code-chat-development-guide.md) を参照してください。

## 📄 ライセンス

MIT License