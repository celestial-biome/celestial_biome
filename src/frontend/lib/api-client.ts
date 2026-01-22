import { auth } from './firebase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type FetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

export async function fetchWithAuth(endpoint: string, options: FetchOptions = {}) {
  // 1. 現在のユーザーを取得
  const user = auth.currentUser;

  // 2. 認証ヘッダーの準備
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // ログインしていればトークンを付与
  if (user) {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  // 3. リクエスト実行
  // endpointが "/" で始まっていれば BASE_URL を結合、そうでなければそのまま
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 4. エラーハンドリング (401の時はログアウト処理などを挟む余地あり)
  if (!response.ok) {
    // 認証エラーなどをキャッチしやすくする
    if (response.status === 401) {
      console.warn('Unauthorized access - maybe token expired?');
    }
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response;
}
