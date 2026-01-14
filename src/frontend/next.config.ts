import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: true,
  reactCompiler: true,
  output: 'standalone',
};

export default withSentryConfig(nextConfig, {
  // -------------------------------------------------------------------------
  // Sentry Webpack Plugin Options
  // -------------------------------------------------------------------------
  org: 'celestial-biome',
  project: 'celestial-biome-frontend',

  // CI環境ではログを出力させる (CI=true なので silent: false になる)
  silent: !process.env.CI,

  // ソースマップを広めにアップロードしてスタックトレースを綺麗にする
  widenClientFileUpload: true,

  // 広告ブロッカー対策
  tunnelRoute: '/monitoring',

  // アップロード完了後にソースマップを削除する (Dockerイメージ軽量化)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // -------------------------------------------------------------------------
  // Sentry SDK Options (Next.js specific)
  // -------------------------------------------------------------------------
  reactComponentAnnotation: {
    enabled: true,
  },

  // 警告が出ていたので webpack オプション内に移動
  webpack: {
    automaticVercelMonitors: true,
  },
});
