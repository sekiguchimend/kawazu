# Kawazu CLI

エディタ上でリアルタイムチャットとファイル共有を行うためのCLIツールです。

## 🆕 v1.0.1 新機能
- **ファイル共有機能**: 他のユーザーとファイルを安全に共有
- **許可制アクセス**: 明示的な承認が必要
- **リアルタイム協調編集**: 共有ファイルの同時編集
- **エディタ内コマンド**: `.codechat`ファイル内での直感的な操作

## インストール

```bash
npm install -g kawazu
```

## 基本的な使い方

### 1. ルームを作成
```bash
kawazu create "プロジェクト会議"
```

### 2. ルームに参加
```bash
kawazu join project-meeting
```

### 3. エディタでチャット
- `.codechat` ファイルが作成されます
- エディタでファイルを開き、内容を書き込んでください
- ファイルを保存すると自動でメッセージが送信されます

### 3. ファイル共有
```bash
# ファイルを共有
kawazu share myfile.js --users alice,bob --permission write

# 共有リクエストを承認
kawazu approve <share-token>

# 共有ファイルをダウンロード
kawazu download <share-token>
```

## コマンド一覧

### チャット機能

### `kawazu join <roomId>`
指定されたルームに参加します。

**オプション:**
- `-u, --username <name>`: ユーザー名を指定
- `-p, --password <password>`: プライベートルームのパスワード

**例:**
```bash
kawazu join my-room -u john
kawazu join private-room -p secret123
```

### `kawazu create <roomName>`
新しいルームを作成します。

**オプション:**
- `--private`: プライベートルームとして作成
- `--password <password>`: プライベートルーム用パスワード

**例:**
```bash
kawazu create "開発チーム会議"
kawazu create "秘密会議" --private --password mypass123
```

### `kawazu list`
ローカルのチャットファイル一覧を表示します。

### `kawazu config`
CLI設定を管理します。

**オプション:**
- `--server <url>`: サーバーURLを設定
- `--username <name>`: デフォルトユーザー名を設定
- `--show`: 現在の設定を表示

**例:**
```bash
kawazu config --server http://localhost:8000
kawazu config --username john
kawazu config --show
```

### ファイル共有機能

### `kawazu share <filePath>`
ファイルを他のユーザーと共有します。

**オプション:**
- `--room <roomId>`: 対象のルームを指定
- `--users <usernames>`: 対象ユーザーをカンマ区切りで指定（省略時は全参加者）
- `--permission <type>`: 権限タイプ (read|write)、デフォルト: read
- `--expires <hours>`: 有効期限（時間）、デフォルト: 24
- `--type <fileType>`: ファイルタイプを手動指定

**例:**
```bash
kawazu share myfile.js --users alice,bob --permission write
kawazu share README.md --expires 48
kawazu share script.py --room dev-team
```

### `kawazu approve <shareToken>`
ファイル共有リクエストを承認します。

**例:**
```bash
kawazu approve abc123def456
```

### `kawazu deny <shareToken>`
ファイル共有リクエストを拒否します。

**例:**
```bash
kawazu deny abc123def456 --reason "機密情報のため"
```

### `kawazu files [roomId]`
共有されているファイル一覧を表示します。

### `kawazu download <shareToken> [outputPath]`
共有ファイルをダウンロードします。

**例:**
```bash
kawazu download abc123def456
kawazu download abc123def456 ./downloaded-file.js
```

### `kawazu requests`
承認待ちのファイル共有リクエスト一覧を表示します。

### `kawazu unshare <shareToken>`
ファイル共有を取り消します。

## チャットファイルの使い方

### 基本
- `#` で始まる行はシステムメッセージ（送信されません）
- 通常のテキストはそのまま送信されます
- ファイルを保存すると自動で送信されます

### コードブロック
````
普通のメッセージです

```javascript
console.log("このコードは code タイプとして送信されます");
```

また普通のメッセージです
````

### ファイル共有コマンド（エディタ内）
`.codechat`ファイル内で直接実行できるコマンド：

```
# ファイルを共有
#share myfile.js @alice @bob --write

# 共有リクエストを承認
#approve abc123def456

# 共有リクエストを拒否
#deny abc123def456
```

### 終了方法
チャット中に `Ctrl+C` を押すと終了できます。

## 設定

初回使用時に設定を行ってください：

```bash
kawazu config
```

設定項目：
- **サーバーURL**: Code Chat APIサーバーのURL
- **デフォルトユーザー名**: 毎回入力を省略したい場合
- **エディタ自動オープン**: ルーム参加時に自動でエディタを開く
- **エディタコマンド**: 使用するエディタのコマンド

## トラブルシューティング

### サーバーに接続できない
```bash
# 設定を確認
kawazu config --show

# サーバーURLを設定
kawazu config --server http://your-server:8000
```

### ユーザー名エラー
ユーザー名は以下の文字のみ使用できます：
- 英数字 (a-z, A-Z, 0-9)
- ハイフン (-)
- アンダースコア (_)

### ファイルが更新されない
- ファイルを保存してください
- エディタの自動保存設定を確認してください
- ファイルの権限を確認してください

## ライセンス

MIT License