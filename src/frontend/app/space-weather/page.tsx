import Link from 'next/link';
import SpaceWeatherDashboard from '../components/space-weather';
import type { WeatherData } from '../components/space-weather/utils';

// キャッシュの再検証時間 (秒) - 必要に応じて調整してください
export const revalidate = 3600;

async function getSpaceWeatherData(): Promise<WeatherData[] | null> {
  // 優先順位:
  // 1. INTERNAL_API_URL: Docker内通信用
  // 2. NEXT_PUBLIC_API_URL: クライアント用
  // 3. フォールバック
  const apiUrl =
    process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    const res = await fetch(`${apiUrl}/api/v1/astronomy/space-weather/`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error(`Failed to fetch data: ${res.status} ${res.statusText}`);
      return null;
    }
    return res.json();
  } catch (error) {
    console.error('Error fetching space weather data:', error);
    return null;
  }
}

export default async function SpaceWeatherPage() {
  const data = await getSpaceWeatherData();

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-black text-white">
      {/* ナビゲーション（トップへ戻る） */}
      <div className="w-full max-w-5xl mb-8 flex items-center">
        <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Back to Portal
        </Link>
      </div>

      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-6 font-mono">Space Weather Dashboard</h1>
        {/* 取得したデータを初期値として渡す */}
        <SpaceWeatherDashboard initialData={data} />
      </div>
    </main>
  );
}
