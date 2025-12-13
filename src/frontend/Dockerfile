# ---------------------------------------------------
# 1. Deps Stage: 依存パッケージのインストール
# ---------------------------------------------------
# ★修正: node:18 -> node:20
FROM node:22-bookworm-slim AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ---------------------------------------------------
# 2. Builder Stage: アプリのビルド
# ---------------------------------------------------
# ★修正: node:18 -> node:20
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
# ★修正: node:18 -> node:20
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# ★修正: ENV key value 形式から ENV key=value 形式へ（警告対応）
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

EXPOSE 8080

CMD ["node", "server.js"]