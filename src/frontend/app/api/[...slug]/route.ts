import { type NextRequest, NextResponse } from 'next/server';

// バックエンドの内部URL
const BACKEND_URL = 'http://backend:8000';

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

  try {
    // 4. バックエンドへリクエスト
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // キャッシュしない
    });

    if (!res.ok) {
      console.error(`[Proxy] Backend returned error: ${res.status}`);
      return NextResponse.json(
        { error: `Backend error: ${res.statusText}` },
        { status: res.status },
      );
    }

    const data = await res.json();

    // 5. フロントエンドへ結果を返す
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Proxy] Connection failed:', error);
    return NextResponse.json({ error: 'Failed to connect to backend' }, { status: 500 });
  }
}
