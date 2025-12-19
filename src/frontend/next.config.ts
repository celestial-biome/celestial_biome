import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: true, // Djangoのためにこれは残す
  reactCompiler: true,
  output: 'standalone',
};

export default nextConfig;
