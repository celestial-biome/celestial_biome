# ---------------------------------------------------
# 1. Deps Stage: 依存パッケージのインストール
# ---------------------------------------------------
# 開発環境に合わせて node:22-bookworm-slim を使用
FROM node:22-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ---------------------------------------------------
# 2. Builder Stage: アプリのビルド
# ---------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# ---------------------------------------------------
# 3. Runner Stage: 本番実行用イメージ
# ---------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Bookworm (Debian) なので adduser の構文が Alpine と少し異なりますが
# node イメージには最初から 'node' ユーザーがいるのでそれを使います
USER node

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

EXPOSE 8080

CMD ["node", "server.js"]
