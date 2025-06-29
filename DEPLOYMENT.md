# Kawazu デプロイガイド

このガイドでは、KawazuアプリケーションをNginxリバースプロキシを使用してデプロイする方法を説明します。

## 構成

- **Webアプリケーション**: Next.js (ポート3000)
- **APIサーバー**: Node.js/Express (ポート8000)
- **リバースプロキシ**: Nginx (ポート80/443)

## 前提条件

- Docker & Docker Compose
- または Node.js 18+ & Nginx

## Docker Composeを使用したデプロイ

### 1. 環境変数の設定

```bash
# env.exampleをコピーして.envファイルを作成
cp env.example .env

# .envファイルを編集して実際の値を設定
nano .env
```

### 2. アプリケーションの起動

```bash
# すべてのサービスを起動
docker-compose up -d

# ログを確認
docker-compose logs -f
```

### 3. 動作確認

- Webアプリケーション: http://localhost
- API: http://localhost/api/health
- WebSocket: ws://localhost/socket.io

## 手動デプロイ

### 1. 依存関係のインストール

```bash
# Webアプリケーション
cd code-chat-platform/packages/web
npm install
npm run build

# APIサーバー
cd ../api
npm install
npm run build
```

### 2. アプリケーションの起動

```bash
# APIサーバーを起動（バックグラウンド）
cd code-chat-platform/packages/api
npm start &

# Webアプリケーションを起動（バックグラウンド）
cd ../web
npm start &
```

### 3. Nginxの設定

```bash
# Nginxの設定ファイルをコピー
sudo cp nginx.conf /etc/nginx/nginx.conf

# Nginxの設定をテスト
sudo nginx -t

# Nginxを再起動
sudo systemctl restart nginx
```

## SSL/HTTPS設定（オプション）

### Let's Encryptを使用する場合

```bash
# Certbotをインストール
sudo apt install certbot python3-certbot-nginx

# SSL証明書を取得
sudo certbot --nginx -d your-domain.com

# 自動更新を設定
sudo crontab -e
# 以下の行を追加:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 手動でSSL証明書を設定する場合

1. SSL証明書ファイルを`./ssl/`ディレクトリに配置
2. `nginx.conf`にSSL設定を追加:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # 既存の設定...
}

# HTTPからHTTPSへのリダイレクト
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## 監視とログ

### ログの確認

```bash
# Nginxログ
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# アプリケーションログ（Docker Compose使用時）
docker-compose logs -f web
docker-compose logs -f api
```

### ヘルスチェック

```bash
# APIサーバーのヘルスチェック
curl http://localhost/api/health

# Webアプリケーションの確認
curl -I http://localhost
```

## トラブルシューティング

### よくある問題

1. **ポートが使用中**
   ```bash
   # ポートを使用しているプロセスを確認
   sudo lsof -i :80
   sudo lsof -i :3000
   sudo lsof -i :8000
   ```

2. **Nginxの設定エラー**
   ```bash
   # 設定ファイルの構文チェック
   sudo nginx -t
   
   # Nginxの再読み込み
   sudo nginx -s reload
   ```

3. **Docker Composeの問題**
   ```bash
   # コンテナの状態確認
   docker-compose ps
   
   # コンテナの再起動
   docker-compose restart
   
   # ログの確認
   docker-compose logs
   ```

### パフォーマンス最適化

1. **Nginxの設定調整**
   - `worker_processes`を調整
   - `worker_connections`を増加
   - キャッシュ設定の最適化

2. **アプリケーションの最適化**
   - Next.jsの画像最適化
   - APIのレスポンスキャッシュ
   - データベースクエリの最適化

## セキュリティ

### 基本的なセキュリティ設定

1. **ファイアウォール設定**
   ```bash
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

2. **定期的な更新**
   ```bash
   # システムの更新
   sudo apt update && sudo apt upgrade
   
   # Dockerイメージの更新
   docker-compose pull
   docker-compose up -d
   ```

3. **ログ監視**
   - 異常なアクセスパターンの監視
   - エラーログの定期確認
   - セキュリティイベントの追跡

## バックアップ

### データベースバックアップ（Supabase使用時）

```bash
# Supabaseのバックアップ機能を使用
# または定期的なデータエクスポート
```

### アプリケーションファイルのバックアップ

```bash
# 重要なファイルのバックアップ
tar -czf kawazu-backup-$(date +%Y%m%d).tar.gz \
  nginx.conf \
  docker-compose.yml \
  .env \
  code-chat-platform/
``` 