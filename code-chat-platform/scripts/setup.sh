#!/bin/bash

# Code Chat Platform 全体セットアップスクリプト

echo "🚀 Code Chat Platform セットアップ開始..."

# 必要コマンドの確認
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 がインストールされていません"
        return 1
    fi
    return 0
}

echo "🔍 必要なツールの確認..."

if ! check_command node; then
    echo "   Node.js をインストールしてください: https://nodejs.org/"
    exit 1
fi

if ! check_command npm; then
    echo "   npm がインストールされていません"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js 18以上が必要です（現在: $(node -v)）"
    exit 1
fi

echo "✅ Node.js $(node -v) - OK"
echo "✅ npm $(npm -v) - OK"

# 依存関係のインストール
echo ""
echo "📦 プロジェクト依存関係をインストール中..."
if ! npm install; then
    echo "❌ 依存関係のインストールに失敗しました"
    exit 1
fi

# 各パッケージのビルド
echo ""
echo "🔨 パッケージビルド中..."

echo "   - API Server をビルド中..."
cd packages/api
if ! npm run build; then
    echo "❌ API Server のビルドに失敗しました"
    exit 1
fi
cd ../..

echo "   - Web App をビルド中..."
cd packages/web
if ! npm run build; then
    echo "❌ Web App のビルドに失敗しました"
    exit 1
fi
cd ../..

echo "   - CLI をビルド中..."
cd packages/cli
if ! npm run build; then
    echo "❌ CLI のビルドに失敗しました"
    exit 1
fi
cd ../..

# 環境変数ファイルの確認
echo ""
echo "⚙️  環境変数設定の確認..."

if [ ! -f "packages/api/.env" ]; then
    echo "⚠️  packages/api/.env が見つかりません"
    echo "   .env.example を参考に作成してください"
fi

if [ ! -f "packages/web/.env.local" ]; then
    echo "⚠️  packages/web/.env.local が見つかりません"
    echo "   .env.example を参考に作成してください"
fi

echo ""
echo "🎉 セットアップ完了！"
echo ""
echo "📋 次の手順:"
echo "   1. Supabase プロジェクトを作成"
echo "   2. supabase/schema.sql を実行"
echo "   3. 環境変数ファイル (.env) を設定"
echo "   4. npm run dev でサーバー起動"
echo ""
echo "📚 詳細な手順は USAGE.md を参照してください"
echo ""
echo "🚀 開発サーバー起動:"
echo "   npm run dev"
echo ""
echo "🔧 CLI インストール:"
echo "   ./scripts/install-cli.sh"