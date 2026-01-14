import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: true,
  reactCompiler: true,
  output: 'standalone',
};

export default withSentryConfig(nextConfig, {
  // Sentry Webpack Plugin Options
  org: 'celestial-biome',
  project: 'celestial-biome-frontend', // Terraform で作成した正しいプロジェクトSlugを指定

  // ビルド中のソースマップアップロード時にログを表示しない（CIのログが見づらくなるため）
  silent: !process.env.CI,

  // クライアント側のソースマップを広くアップロードする
  widenClientFileUpload: true,

  // React コンポーネント名を注釈として付ける（デバッグしやすくなる）
  reactComponentAnnotation: {
    enabled: true,
  },

  // 広告ブロッカー対策 (Sentryへの通信を自社ドメイン経由に見せる)
  tunnelRoute: '/monitoring',

  // 開発サーバーの起動時間を短縮するためにロガーを無効化
  disableLogger: true,

  // Vercel Cron Monitoring の自動設定 (Cloud Run なので不要ですがあっても無害)
  automaticVercelMonitors: true,
});
