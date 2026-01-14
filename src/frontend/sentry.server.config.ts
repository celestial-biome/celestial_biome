import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // 本番環境ではサンプリングレートを調整してください
  tracesSampleRate: 1.0,

  // デバッグ時に便利（本番では false 推奨）
  debug: false,
});
