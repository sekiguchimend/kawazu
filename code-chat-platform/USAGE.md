# Kawazu 使用ガイド

本番環境でのKawazu使用方法を説明します。

## 🚀 クイックスタート（5分で開始）

### 前提条件
- Node.js 18以上（CLIツール使用の場合）
- モダンブラウザ（Web使用の場合）

---

## 🌐 Web版の使用

### 1. アカウント作成・ログイン
1. [https://kawazu-web.vercel.app](https://kawazu-web.vercel.app) にアクセス
2. 「GET STARTED」をクリック
3. メールアドレスとパスワードでアカウント作成
4. ログイン完了

### 2. サブスクリプション（必要に応じて）
1. [料金ページ](https://kawazu-web.vercel.app/pricing) でプランを確認
2. 必要に応じてProプランにアップグレード

### 3. ルーム作成
1. ダッシュボードで「新しいルーム作成」
2. ルーム名とIDを入力
3. プライベートルームの場合はパスワード設定
4. 「作成」をクリック

---

## 🖥️ CLI版の使用

### 1. CLIツールインストール
```bash
npm install -g kawazu
```

### 2. ログイン
```bash
kawazu login
```

### 3. ルーム参加
```bash
# パブリックルーム
kawazu join room-name

# プライベートルーム
kawazu join room-name -p password

# ユーザー名指定
kawazu join room-name -u your-username
```

### 4. エディタでチャット
1. `.codechat` ファイルが自動作成される
2. エディタ（VS Code等）でファイルを開く
3. ファイル下部にメッセージを入力
4. 保存（Ctrl+S）で自動送信

---

## 💬 基本的なチャット機能

### メッセージ送信
- テキストメッセージ
- コードブロック（\`\`\`で囲む）
- 絵文字サポート

### ファイル共有
```bash
# ファイル共有
kawazu share ./myfile.js

# 共有承認
kawazu approve <share-token>

# ファイル一覧
kawazu files
```

### プロフィール機能
```bash
# プロフィール表示
kawazu profile username

# プロフィール設定
# Webアプリのプロフィール設定ページを使用
```

---

## ⚙️ CLI設定

### 設定確認
```bash
kawazu config --show
```

### サーバー設定
```bash
# 本番環境（デフォルト）
kawazu config --server https://kawazu.onrender.com

# 開発環境
kawazu config --server http://localhost:8000
```

### ユーザー情報
```bash
# 現在のユーザー
kawazu whoami

# サブスクリプション確認
kawazu plan
```

---

## 🔧 便利なコマンド

### ルーム管理
```bash
# ルーム作成
kawazu create "新しいプロジェクト"

# ローカルチャットファイル一覧
kawazu list

# ヘルプ
kawazu help-usage
```

### ファイル共有管理
```bash
# 承認待ちリクエスト確認
kawazu requests

# ファイルダウンロード
kawazu download <share-token>

# 共有取り消し
kawazu unshare <share-token>
```

---

## 🎯 使用例

### 一般的なワークフロー
1. **Web**でルーム作成
2. **CLI**でルーム参加
3. **エディタ**でリアルタイムチャット
4. **ファイル共有**で効率的なコラボレーション

### プロジェクトチームでの使用
```bash
# プロジェクトマネージャー
kawazu create "プロジェクト会議" --private

# 開発者たち
kawazu join project-meeting -p team-password

# コードレビュー
kawazu share ./src/component.tsx --permission write
```

---

## 🛠️ トラブルシューティング

### CLI関連
```bash
# 認証エラー
kawazu logout
kawazu login

# 設定リセット
kawazu config --server https://kawazu.onrender.com

# 権限エラー
sudo npm install -g kawazu
```

### チャット関連
- ファイル保存でメッセージ送信
- `.codechat`ファイルを手動削除してリセット
- ネットワーク接続確認

---

## 📚 リンク集

- **Webアプリ**: [https://kawazu-web.vercel.app](https://kawazu-web.vercel.app)
- **料金プラン**: [https://kawazu-web.vercel.app/pricing](https://kawazu-web.vercel.app/pricing)
- **開発者情報**: [https://kawazu-web.vercel.app/developer](https://kawazu-web.vercel.app/developer)
- **GitHubリポジトリ**: [https://github.com/sekiguchimend/kawazu](https://github.com/sekiguchimend/kawazu)

---

## 🎉 始めましょう！

1. [Webアプリ](https://kawazu-web.vercel.app)でアカウント作成
2. CLIツールをインストール: `npm install -g kawazu`
3. ログイン: `kawazu login`
4. 初回ルーム作成: `kawazu create "my-first-room"`

これでKawazuの全機能が使用可能になります！🚀