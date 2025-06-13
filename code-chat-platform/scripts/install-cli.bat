@echo off
echo 🚀 Kawazu CLI インストール開始...

REM Node.js バージョンチェック
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js がインストールされていません
    echo    https://nodejs.org/ からダウンロードしてください
    pause
    exit /b 1
)

echo ✅ Node.js バージョン確認:
node -v

REM CLIディレクトリに移動
cd packages\cli

echo 📦 依存関係をインストール中...
npm install
if %errorlevel% neq 0 (
    echo ❌ 依存関係のインストールに失敗しました
    pause
    exit /b 1
)

echo 🔨 TypeScript ビルド中...
npm run build
if %errorlevel% neq 0 (
    echo ❌ ビルドに失敗しました
    pause
    exit /b 1
)

echo 🔗 グローバルインストール中...
npm link
if %errorlevel% neq 0 (
    echo ❌ グローバルインストールに失敗しました
    echo    管理者権限で実行してみてください
    pause
    exit /b 1
)

echo.
echo 🎉 インストール完了！
echo.
echo 📋 次の手順:
echo    1. Webサイトでルームを作成: http://localhost:3000
echo    2. CLIでルームに参加: kawazu join room-name
echo    3. エディタで .codechat ファイルを開いてチャット開始
echo.
echo 💡 使用方法:
echo    kawazu --help       # ヘルプ表示
echo    kawazu join ^<room^>   # ルーム参加
echo    kawazu create ^<name^> # ルーム作成
echo    kawazu list          # ファイル一覧
echo    kawazu config        # 設定管理
echo.
echo 🔧 設定確認:
echo    kawazu config --show
echo.
pause