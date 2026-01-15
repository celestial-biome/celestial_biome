import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // ホストヘッダーを取得 (例: celestial-frontend-xxx.run.app)
  const host = request.headers.get('host');

  // 環境変数が production、かつ host が存在し、'.run.app' を含んでいる場合
  if (process.env.NODE_ENV === 'production' && host?.includes('.run.app')) {
    // リダイレクト先のURLを構築
    // request.nextUrl.pathname でパス（/earthquake 等）を引き継ぎます
    const newUrl = new URL(`https://app.celestial-biome.com${request.nextUrl.pathname}`);

    // 301リダイレクト (恒久的な移動) を返す
    return NextResponse.redirect(newUrl, 301);
  }

  // それ以外はそのまま処理を続行
  return NextResponse.next();
}

// マッチャー設定: 静的ファイルやAPI、Next.js内部ファイルはチェック対象から外して負荷を下げる
export const config = {
  matcher: [
    /*
     * 以下のパスで始まるもの以外 ("missing" logic) 全てにマッチさせる:
     * - api (APIルート) -> ただし、run.app経由のAPIアクセスもリダイレクトしたい場合はここから 'api' を外してください
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico (ファビコン)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
