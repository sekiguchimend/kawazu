# Changelog

## [1.1.1] - 2024-12-30

### 🚀 Production Ready
- **本番環境エンドポイント**: デフォルトURLを`https://kawazu-app.com`に変更
- **環境変数サポート**: `KAWAZU_SERVER`で本番URLをカスタマイズ可能
- **開発環境サポート**: `KAWAZU_SERVER=http://localhost:8000`で開発環境使用可能

### 🔧 Fixed
- **エンドポイント統一**: 全箇所でlocalhostハードコーディングを除去
- **プライシングURL**: 本番環境のプライシングページURLに修正
- **設定例**: ヘルプテキストで本番URLを使用

## [1.1.0] - 2024-12-30

### ✨ Added
- **新しいメッセージ入力形式**: `.codechat`ファイルの入力テキストを「メッセージを上の線上に書き」に簡潔化
- **コマンドヘルプファイル分離**: コマンドリファレンスを別ファイル（`{room}-commands.kawazu`）に自動生成
- **改善されたメッセージ抽出**: 新しい線形式に完全対応した`extractNewContent`関数
- **モジュラー設計**: メッセージ処理の各機能を独立した関数に分割

### 🔧 Improved
- **チャットファイルのクリーン化**: システムヒントをメインファイルから分離
- **エディター体験向上**: チャット専用とコマンドリファレンスを分離表示可能
- **コード可読性**: メッセージ処理ロジックの構造化とコメント追加

### 📁 File Structure Changes
```
project-meeting.codechat          ← チャット専用（すっきり）
project-meeting-commands.kawazu   ← コマンドリファレンス
```

### 🧩 Technical Details
- **extractInputAreaFromContent()**: 入力エリアの正確な抽出
- **cleanupMessageLines()**: システムメッセージのフィルタリング
- **detectNewLines()**: 差分検出の精度向上
- **createCommandHelpFile()**: 自動ヘルプファイル生成

## [1.0.1] - 2024-12-29

### 🔐 Added
- **CLI認証機能**: `kawazu login`, `kawazu logout`, `kawazu whoami`, `kawazu plan`
- **プラン制限システム**: サブスクリプションプランに応じた制限適用
- **Socket.IO認証強化**: WebSocket接続時の認証トークン検証

### 🛡️ Security
- **認証必須**: 全API操作に認証トークンが必要
- **プラン制限**: ルーム作成数、参加者数、ストレージ容量の制限
- **データベース認証**: ユーザー情報の一貫性確保

### 🐛 Fixed
- **TypeScript型エラー**: 認証関連の型定義修正
- **PowerShell互換性**: Windowsコマンド構文の適正化
- **UIスタイル統一**: 絵文字とメッセージフォーマットの一貫性

## [1.0.0] - 2024-12-28

### 🎉 Initial Release
- **リアルタイムチャット**: エディタ内でのリアルタイム通信
- **ルーム管理**: 作成、参加、プライベートルーム対応
- **ファイル共有**: 承認フローつきファイル共有システム
- **プロフィール機能**: ユーザープロフィール作成・表示
- **多言語対応**: 日本語・英語サポート
- **CLI & Web**: CLIツールとWebアプリケーションの統合 