import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // 環境変数、または直接DSN文字列を指定
  // ※ Client側でEnvを読むには NEXT_PUBLIC_ 接頭辞が必要なのが一般的ですが
  //   Sentry Wizard の設定によっては SENTRY_DSN が置換されることもあります。
  //   一旦 process.env.SENTRY_DSN で設定し、動かなければ後で調整します。
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Replay (セッション再現) や Tracing (パフォーマンス) の設定
  integrations: [Sentry.replayIntegration()],

  // 本番環境では 0.1 (10%) 程度に絞ることを推奨
  tracesSampleRate: 1.0,

  // Replay: エラー発生時の前後のみ記録する場合
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
