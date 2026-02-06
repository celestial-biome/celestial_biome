import { type NextRequest, NextResponse } from 'next/server';

// 環境変数がない場合はローカル開発用の値をデフォルトに使う
const BACKEND_URL = process.env.INTERNAL_API_URL || 'http://backend:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  // 1. パスパラメータを取得 (Next.js 16では await が必要)
  const { slug } = await params;
  const path = slug.join('/'); // 例: "v1/astronomy/positions"

  // 2. クエリパラメータを取得 (?days=365&steps=50)
  const searchParams = request.nextUrl.search;

  // 3. 転送先URLを構築
  // Djangoは末尾スラッシュが必要なので、pathの後に必ず '/' をつける
  const targetUrl = `${BACKEND_URL}/api/${path}/${searchParams}`;

  console.log(`[Proxy] Forwarding request to: ${targetUrl}`);
  return await forwardRequest(targetUrl, 'GET', request);
}

// POST ハンドラー (チャット用)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const path = slug.join('/');
  const targetUrl = `${BACKEND_URL}/api/${path}/`; // Djangoは末尾スラッシュが必要

  console.log(`[Proxy-POST] Forwarding to: ${targetUrl}`);

  const body = await request.json();
  return await forwardRequest(targetUrl, 'POST', request, body);
}

// 共通の転送ロジック
async function forwardRequest(url: string, method: string, request: NextRequest, body?: unknown) {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // クライアントからの Authorization ヘッダーをそのまま Django へ引き継ぐ
        Authorization: request.headers.get('Authorization') || '',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[Proxy] Error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
