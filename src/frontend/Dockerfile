# ---------------------------------------------------
# 1. Deps Stage: 依存パッケージのインストール
# ---------------------------------------------------
FROM node:18-alpine AS deps
# libc6-compat は Alpine で一部のライブラリを動かすために必要になることがある
RUN apk add --no-cache libc6-compat
WORKDIR /app

# パッケージファイルをコピーしてインストール
COPY package.json package-lock.json* ./
# npm ci で厳密にバージョンを固定してインストール
RUN npm ci

# ---------------------------------------------------
# 2. Builder Stage: アプリのビルド
# ---------------------------------------------------
FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# GitHub Actions から渡される環境変数をビルド引数として受け取る
ARG NEXT_PUBLIC_API_URL
# ビルド時の環境変数にセット（Next.jsはビルド時にこれを埋め込む）
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Next.js のビルド実行
# ※ 注意: next.config.js で output: 'standalone' を設定している必要があります
RUN npm run build

# ---------------------------------------------------
# 3. Runner Stage: 本番実行用イメージ (軽量化)
# ---------------------------------------------------
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# セキュリティのため非ルートユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 公開ファイル (public) のコピー
COPY --from=builder /app/public ./public

# ビルド成果物のコピー (Standaloneモード)
# .next/standalone は必要なファイルだけがまとまった軽量版
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ユーザーの切り替え
USER nextjs

# Cloud Run はデフォルトで 8080 ポートを使用する
# Next.js server.js は PORT 環境変数を参照して起動する
ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

EXPOSE 8080

# standaloneモードで生成された server.js を起動
CMD ["node", "server.js"]