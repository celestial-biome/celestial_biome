import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Terraformから渡される正規URL (例: https://app-staging.celestial-biome.com)
  const canonicalUrlStr = process.env.CANONICAL_URL;

  // CANONICAL_URL が設定されていない場合（ローカル開発など）は何もしない
  if (!canonicalUrlStr) {
    return NextResponse.next();
  }

  const host = request.headers.get('host');

  try {
    const canonicalUrl = new URL(canonicalUrlStr);
    const canonicalHost = canonicalUrl.host;

    // 現在のホストが正規ホストと異なり、かつ localhost でない場合
    // (例: *.run.app へのアクセスや、誤ったドメインからのアクセスを補足)
    if (host && host !== canonicalHost && !host.includes('localhost')) {
      // リダイレクト先のURLを構築
      // パス (request.nextUrl.pathname) と クエリ (request.nextUrl.search) を引き継ぐ
      const newUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, canonicalUrlStr);

      // 301リダイレクト (恒久的な移動) を返す
      return NextResponse.redirect(newUrl, 301);
    }
  } catch (error) {
    // 万が一 CANONICAL_URL が不正な形式だった場合のエラーハンドリング
    console.error('Middleware Error: Invalid CANONICAL_URL', error);
  }

  return NextResponse.next();
}

// マッチャー設定: 静的ファイルやAPI、Next.js内部ファイルはチェック対象から外す
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
