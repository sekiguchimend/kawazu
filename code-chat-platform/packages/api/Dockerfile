# Node.js 18のAlpineイメージを使用
FROM node:18-alpine AS base

# 依存関係のインストール用ステージ
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./
RUN npm ci --only=production

# ビルド用ステージ
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# TypeScriptをビルド
RUN npm run build

# 実行用ステージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# 非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# 必要なファイルをコピー
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

USER nodejs

EXPOSE 8000

ENV PORT 8000

# アプリケーションを起動
CMD ["node", "dist/server.js"] 