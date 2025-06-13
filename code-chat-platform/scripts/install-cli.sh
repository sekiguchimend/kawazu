#!/bin/bash

# Kawazu CLI インストールスクリプト

echo "🚀 Kawazu CLI インストール開始..."

# Node.js バージョンチェック
if ! command -v node &> /dev/null; then
    echo "❌ Node.js がインストールされていません"
    echo "   https://nodejs.org/ からダウンロードしてください"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js 18以上が必要です（現在: $(node -v)）"
    echo "   https://nodejs.org/ から最新版をダウンロードしてください"
    exit 1
fi

echo "✅ Node.js バージョン確認: $(node -v)"

# CLIビルド・インストール
echo "📦 CLI をビルド・インストール中..."

cd packages/cli

# 依存関係インストール
if ! npm install; then
    echo "❌ 依存関係のインストールに失敗しました"
    exit 1
fi

# TypeScript ビルド
if ! npm run build; then
    echo "❌ ビルドに失敗しました"
    exit 1
fi

# グローバルリンク作成
if ! npm link; then
    echo "❌ グローバルインストールに失敗しました"
    echo "   sudo が必要な場合があります: sudo npm link"
    exit 1
fi

echo ""
echo "🎉 インストール完了！"
echo ""
echo "📋 次の手順:"
echo "   1. Webサイトでルームを作成: http://localhost:3000"
echo "   2. CLIでルームに参加: kawazu join room-name"
echo "   3. エディタで .codechat ファイルを開いてチャット開始"
echo ""
echo "💡 使用方法:"
echo "   kawazu --help       # ヘルプ表示"
echo "   kawazu join <room>   # ルーム参加"
echo "   kawazu create <name> # ルーム作成"
echo "   kawazu list          # ファイル一覧"
echo "   kawazu config        # 設定管理"
echo ""
echo "🔧 設定確認:"
echo "   kawazu config --show"