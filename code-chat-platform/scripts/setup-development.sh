#!/bin/bash

# Kawazu Development Setup Script
# 開発環境の完全セットアップを行います

set -e

echo "🚀 Kawazu 開発環境セットアップを開始します..."
echo "=================================="

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

# 色付きoutput用の関数
print_success() { echo -e "\033[32m✅ $1\033[0m"; }
print_info() { echo -e "\033[34mℹ️  $1\033[0m"; }
print_warning() { echo -e "\033[33m⚠️  $1\033[0m"; }
print_error() { echo -e "\033[31m❌ $1\033[0m"; }

# Node.jsバージョン確認
check_nodejs() {
    print_info "Node.jsバージョンを確認中..."
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        print_success "Node.js $NODE_VERSION が見つかりました"
    else
        print_error "Node.jsがインストールされていません"
        print_info "https://nodejs.org/ からNode.js 18以上をインストールしてください"
        exit 1
    fi
}

# 依存関係のインストール
install_dependencies() {
    print_info "依存関係をインストール中..."
    
    # API dependencies
    print_info "APIサーバーの依存関係をインストール中..."
    cd packages/api
    npm install
    cd ../..
    
    # Web dependencies
    print_info "Webアプリの依存関係をインストール中..."
    cd packages/web
    npm install
    cd ../..
    
    # CLI dependencies
    print_info "CLIツールの依存関係をインストール中..."
    cd packages/cli
    npm install
    cd ../..
    
    print_success "すべての依存関係のインストールが完了しました"
}

# 環境変数ファイルのセットアップ
setup_env_files() {
    print_info "環境変数ファイルをセットアップ中..."
    
    # API環境変数
    if [ ! -f "packages/api/.env" ]; then
        print_info "API用 .env ファイルを作成中..."
        cp packages/api/.env.development packages/api/.env
        print_success "packages/api/.env を作成しました"
    else
        print_warning "packages/api/.env は既に存在します"
    fi
    
    # Web環境変数
    if [ ! -f "packages/web/.env.local" ]; then
        print_info "Web用 .env.local ファイルを作成中..."
        cp packages/web/.env.development packages/web/.env.local
        print_success "packages/web/.env.local を作成しました"
    else
        print_warning "packages/web/.env.local は既に存在します"
    fi
}

# Supabaseスキーマのセットアップ
setup_supabase() {
    print_info "Supabaseスキーマをセットアップ中..."
    print_warning "以下のSQLをSupabaseのSQL Editorで実行してください:"
    echo ""
    echo "📄 ファイル: supabase/subscription-setup.sql"
    echo ""
    print_info "Supabaseダッシュボード -> SQL Editor -> 新しいクエリ"
    print_info "上記ファイルの内容をコピー&ペーストして実行してください"
    echo ""
    read -p "Supabaseスキーマの実行が完了したら Enter キーを押してください..."
}

# TypeScriptビルドとテスト
build_and_test() {
    print_info "TypeScriptビルドをテスト中..."
    
    # API build test
    print_info "APIサーバーのビルドテスト中..."
    cd packages/api
    npm run build
    print_success "APIサーバーのビルドが成功しました"
    cd ../..
    
    # Web build test (development用)
    print_info "Webアプリのビルドテスト中..."
    cd packages/web
    npm run lint
    print_success "Webアプリのlintが成功しました"
    cd ../..
    
    # CLI build test
    print_info "CLIツールのビルドテスト中..."
    cd packages/cli
    npm run build
    print_success "CLIツールのビルドが成功しました"
    cd ../..
}

# 開発サーバー起動の準備
prepare_dev_servers() {
    print_info "開発サーバー用のスクリプトを準備中..."
    
    # 開発サーバー起動スクリプト作成
    cat > start-dev-servers.sh << 'EOF'
#!/bin/bash

# Kawazu Development Servers
# 開発用サーバーを同時起動します

echo "🚀 Kawazu 開発サーバーを起動しています..."

# API サーバー起動（バックグラウンド）
echo "📡 APIサーバーを起動中..."
cd packages/api
npm run dev &
API_PID=$!
cd ../..

# 少し待つ
sleep 3

# Web サーバー起動（バックグラウンド）
echo "🌐 Webサーバーを起動中..."
cd packages/web
npm run dev &
WEB_PID=$!
cd ../..

echo ""
echo "🎉 開発サーバーが起動しました!"
echo "📡 API Server: http://localhost:8000"
echo "🌐 Web App: http://localhost:3000"
echo ""
echo "⚠️  サーバーを停止するには Ctrl+C を押してください"

# Ctrl+C時のクリーンアップ
cleanup() {
    echo ""
    echo "🛑 サーバーを停止中..."
    kill $API_PID $WEB_PID 2>/dev/null
    echo "✅ 停止完了"
    exit 0
}

trap cleanup INT

# プロセスを待機
wait $API_PID $WEB_PID
EOF

    chmod +x start-dev-servers.sh
    print_success "開発サーバー起動スクリプトを作成しました: start-dev-servers.sh"
}

# 最終チェックリスト表示
show_final_checklist() {
    echo ""
    echo "🎉 セットアップが完了しました!"
    echo "=================================="
    echo ""
    print_info "次のステップ:"
    echo "1. ✅ Supabaseスキーマ実行完了"
    echo "2. ⚠️  Stripe設定が必要:"
    echo "   - Stripeアカウント作成: https://stripe.com"
    echo "   - テスト用APIキーを取得"
    echo "   - packages/api/.env でSTRIPE_SECRET_KEYを設定"
    echo "   - packages/web/.env.local でNEXT_PUBLIC_STRIPE_PUBLISHABLE_KEYを設定"
    echo ""
    print_info "開発サーバー起動方法:"
    echo "   ./start-dev-servers.sh"
    echo ""
    print_info "個別起動方法:"
    echo "   API: cd packages/api && npm run dev"
    echo "   Web: cd packages/web && npm run dev"
    echo ""
    print_success "🚀 準備完了! Happy coding!"
}

# メイン実行
main() {
    check_nodejs
    install_dependencies
    setup_env_files
    setup_supabase
    build_and_test
    prepare_dev_servers
    show_final_checklist
}

# 引数チェック
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Kawazu Development Setup Script"
    echo ""
    echo "使用方法:"
    echo "  ./scripts/setup-development.sh    # フルセットアップ実行"
    echo "  ./scripts/setup-development.sh -h # このヘルプを表示"
    echo ""
    echo "このスクリプトは以下を実行します:"
    echo "- Node.js バージョン確認"
    echo "- 依存関係のインストール"
    echo "- 環境変数ファイルの作成"
    echo "- TypeScript ビルドテスト"
    echo "- 開発サーバー起動スクリプトの作成"
    exit 0
fi

# メイン実行
main