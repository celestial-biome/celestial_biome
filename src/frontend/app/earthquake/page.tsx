import Link from 'next/link';
import EarthquakeDashboard from '../components/earthquake';
import type { Earthquake } from '../components/earthquake/utils';

// キャッシュ有効期間 (秒)
export const revalidate = 3600;

async function getEarthquakeData(): Promise<Earthquake[] | null> {
  const apiUrl =
    process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    // 過去30日分のデータを取得する
    const res = await fetch(`${apiUrl}/api/v1/geology/earthquakes/?days=30`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error(`Failed to fetch earthquake data: ${res.statusText}`);
      return null;
    }

    // GeoJSON形式で返ってくる場合と配列で返ってくる場合の吸収が必要ですが、
    // useEarthquakes.ts の元の実装を見る限り配列 (Earthquake[]) を期待しているようなのでそのまま返します。
    // ※もしAPIが { features: [...] } を返す GeoJSON 形式の場合はここで変換が必要です。
    // 今回は useEarthquakes.ts の実装に合わせてそのまま json() を返します。
    return res.json();
  } catch (error) {
    console.error('Error fetching earthquake data:', error);
    return null;
  }
}

export default async function EarthquakePage() {
  const data = await getEarthquakeData();

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-black text-white">
      <div className="w-full max-w-5xl mb-8 flex items-center">
        <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Back to Portal
        </Link>
      </div>

      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-6 font-mono">Earthquake Dashboard</h1>
        {/* 取得したデータを初期値として渡す */}
        <EarthquakeDashboard initialData={data} />
      </div>
    </main>
  );
}
