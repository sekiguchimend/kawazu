# Code Chat Platform 使用書

完全な setup から使用開始までのガイド

## 🚀 クイックスタート（5分で開始）

### 前提条件
- Node.js 18以上
- npm または yarn
- Gitクライアント

---

## 📝 Step 1: プロジェクトのセットアップ

### 1.1 リポジトリのクローン
```bash
git clone <your-repository-url>
cd code-chat-platform
```

### 1.2 依存関係のインストール
```bash
# ルートで全パッケージの依存関係をインストール
npm install
```

---

## 🗄️ Step 2: Supabaseの設定

### 2.1 Supabaseプロジェクト作成
1. [Supabase](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubでサインイン
4. 「New Project」をクリック
5. 設定:
   - **Name**: `code-chat-platform`
   - **Database Password**: 強力なパスワードを入力
   - **Region**: Japan (Tokyo) を選択
   - **Plan**: Free を選択

### 2.2 データベース作成
1. プロジェクト作成完了後、Supabase Dashboard を開く
2. 左メニューから「SQL Editor」をクリック
3. `supabase/schema.sql` ファイルの内容をコピー
4. SQL Editor にペーストして「RUN」をクリック

### 2.3 APIキーの取得
1. 左メニューから「Settings」→「API」をクリック
2. 以下をメモ:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public**: `eyJ...` (公開キー)
   - **service_role**: `eyJ...` (サービスキー、機密)

---

## ⚙️ Step 3: 環境変数の設定

### 3.1 APIサーバー設定
`packages/api/.env` を編集:
```bash
# API Server設定
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Supabase設定（Step 2.3で取得した値に変更）
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

### 3.2 Webアプリ設定  
`packages/web/.env.local` を編集:
```bash
# Next.js Web App設定

# Supabase設定（Step 2.3で取得した値に変更）
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here

# API Server URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🖥️ Step 4: サーバーの起動とサイト表示

### 4.1 開発サーバーの起動

**方法1: 全て同時に起動（推奨）**
```bash
# プロジェクトルートで実行
npm run dev
```
これでAPIサーバーとWebアプリが同時に起動します。

**方法2: 個別に起動**
```bash
# ターミナル1: APIサーバー
cd packages/api
npm run dev

# ターミナル2: Webアプリ
cd packages/web  
npm run dev
```

### 4.2 サイトへのアクセス
ブラウザで以下を開く:
- **Webサイト**: http://localhost:3000
- **API**: http://localhost:8000/health

---

## 🔨 Step 5: CLIツールの準備とNPM公開

### 5.1 CLIのビルド
```bash
cd packages/cli
npm run build
```

### 5.2 ローカルでのCLI使用
```bash
# 開発版CLIを使用
cd packages/cli
npx kawazu join room-name

# または global リンク作成
npm link
kawazu join room-name
```

### 5.3 NPMパッケージとして公開

#### 前準備
1. [npmjs.com](https://www.npmjs.com) でアカウント作成
2. CLIでログイン:
```bash
npm login
```

#### パッケージ名の設定
`packages/cli/package.json` の `name` を一意な名前に変更:
```json
{
  "name": "@your-username/kawazu",
  // または
  "name": "kawazu-cli-unique-name",
}
```

#### 公開実行
```bash
cd packages/cli
npm run build
npm publish

# スコープ付きの場合は
npm publish --access public
```

### 5.4 公開されたCLIのインストール
```bash
# 公開後、誰でもインストール可能
npm install -g @your-username/kawazu

# 使用
kawazu join room-name
```

---

## 🎮 Step 6: 実際の使用方法

### 6.1 ルームの作成
1. http://localhost:3000 にアクセス
2. 左側の「新しいルームを作成」セクション
3. 必要項目を入力:
   - **ルーム名**: 表示用の名前
   - **ルームID**: CLI参加用のID（英数字のみ）
   - **プライベートルーム**: パスワード保護する場合はチェック
4. 「ルームを作成」をクリック

### 6.2 CLIでルーム参加
```bash
# パブリックルーム
kawazu join my-room

# ユーザー名指定
kawazu join my-room -u alice

# プライベートルーム
kawazu join private-room -p password123
```

### 6.3 エディタでチャット
1. CLI実行後、`.codechat` ファイルが作成される
2. お好みのエディタ（VS Code等）でファイルを開く
3. ファイルの下部に文章を入力
4. ファイルを保存（Ctrl+S）→ 自動送信
5. 他の参加者のメッセージも自動で追記される

### 6.4 チャット例
```
# Code Chat Room: my-project
# あなたのユーザー名: alice
# 
# 使い方:
# - このファイルに入力すると、他の参加者に送信されます
# - 他の参加者のメッセージも自動で追記されます
# - コードブロックは ``` で囲んでください
#
# === チャット履歴 ===

[14:30:25] alice: こんにちは！
[14:30:30] bob: お疲れさまです
[14:31:00] alice: バグ修正が完了しました

```javascript
function fixBug() {
  // 修正されたコード
  console.log("Fixed!");
}
```

[14:31:15] bob: ありがとうございます！
```

---

## 🛠️ トラブルシューティング

### サイトが表示されない
```powershell
# ポートが使用されているか確認
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# プロセスを終了して再起動
npm run dev
```

### Supabase接続エラー
1. `.env` ファイルのURLとキーを確認
2. Supabaseプロジェクトが有効か確認
3. `schema.sql` が正しく実行されているか確認

### CLI エラー
```bash
# 設定確認
kawazu config --show

# サーバーURL設定
kawazu config --server http://localhost:8000

# 権限エラーの場合
npm install -g kawazu --force
```

### ファイル監視が動かない
- ファイルを保存していることを確認
- エディタの自動保存設定を確認
- ファイル権限を確認

---

## 📱 本番環境への対応

### Vercel（Web）+ Railway（API）デプロイ
1. Supabaseプロジェクトを本番用に作成
2. 環境変数を本番用に更新
3. Vercelで Next.js をデプロイ
4. Railway で API をデプロイ
5. CLI の設定を本番URLに変更

### 環境変数の本番設定例
```bash
# 本番用 .env
SUPABASE_URL=https://production-project.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://production-project.supabase.co
NEXT_PUBLIC_API_URL=https://your-api.railway.app
```

---

## 🎯 よくある質問

**Q: 複数人で同時にチャットできますか？**
A: はい、WebSocketでリアルタイム通信するため同時チャット可能です。

**Q: プライベートルームのパスワードを忘れました**
A: Supabase Dashboard の rooms テーブルから確認または変更できます。

**Q: CLIが反応しません**
A: `Ctrl+C` で終了し、`kawazu config` で設定を確認してください。

**Q: エディタで書いた内容が送信されません**
A: ファイルを保存（Ctrl+S）することで送信されます。

---

## 📚 参考コマンド集

```bash
# 開発関連
npm run dev              # 全サーバー起動
npm run build           # 全パッケージビルド
npm run dev:api         # API のみ起動
npm run dev:web         # Web のみ起動

# CLI関連  
kawazu join <room>      # ルーム参加
kawazu create <name>    # ルーム作成
kawazu list             # ローカルファイル一覧
kawazu config           # 設定管理
kawazu help-usage       # 詳細ヘルプ

# ビルド・公開
cd packages/cli && npm run build  # CLIビルド
npm publish                       # NPM公開
```

これで Kawazu が完全に使用可能になります！🎉