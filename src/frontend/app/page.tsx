import Link from 'next/link';
import EarthquakeDashboard from './components/earthquake';
import SpaceWeatherDashboard from './components/space-weather';
import WorldEconomyDashboard from './components/world-economy';
// 型定義をインポート
import type { EconomyApiResponse } from './components/world-economy/utils';

// トップページも1時間キャッシュ (必要に応じて調整)
export const revalidate = 3600;

// データ取得ロジック (world-economy/page.tsx と同様)
async function getEconomyData(): Promise<EconomyApiResponse | null> {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;

  try {
    const res = await fetch(`${apiUrl}/api/v1/economy/world-economy/`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('Error fetching economy data:', error);
    return null;
  }
}

// async function に変更してサーバーサイドでデータ待機可能にする
export default async function Home() {
  // データを取得
  const economyData = await getEconomyData();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white">
      <header className="mb-10 text-center z-10">
        <h1 className="text-4xl font-mono font-bold tracking-tight mb-2">Celestial Biome</h1>
        <p className="text-gray-400">Environmental Monitoring Portal</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl z-10">
        {/* 宇宙天気プレビューカード */}
        <PreviewCard
          href="/space-weather"
          title="Space Weather"
          description="Solar & Geomagnetic Activity"
          colorClass="border-yellow-500/30 hover:border-yellow-400 hover:shadow-[0_0_40px_rgba(234,179,8,0.2)]"
        >
          <SpaceWeatherDashboard />
        </PreviewCard>

        {/* 地震情報プレビューカード */}
        <PreviewCard
          href="/earthquake"
          title="Earthquake Monitor"
          description="Global Seismic Data"
          colorClass="border-blue-500/30 hover:border-blue-400 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)]"
        >
          <EarthquakeDashboard />
        </PreviewCard>

        {/* 世界経済プレビューカード */}
        <PreviewCard
          href="/world-economy"
          title="World Economy"
          description="Global Economic Data"
          colorClass="border-blue-500/30 hover:border-blue-400 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)]"
        >
          {/* 取得したデータを渡す */}
          <WorldEconomyDashboard initialData={economyData} />
        </PreviewCard>
      </div>
    </main>
  );
}

// ---------------------------------------------------------
// ミニチュア表示用のラッパーコンポーネント
// ---------------------------------------------------------
function PreviewCard({
  href,
  title,
  children,
  description,
  colorClass,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
  description: string;
  colorClass: string;
}) {
  return (
    <Link
      href={href}
      className="group block h-[400px] w-full relative overflow-hidden rounded-2xl border bg-gray-950 transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* コンテンツのスケーリングエリア */}
      <div
        className={`
        absolute inset-0 pointer-events-none overflow-hidden opacity-80 group-hover:opacity-100 transition-opacity duration-500
        ${colorClass} border-b-0 border-x-0 rounded-t-2xl
      `}
      >
        {/* 仮想的なスクリーンを作り、それをカードサイズに合わせて縮小します。 */}
        <div className="origin-top-left transform scale-[0.35] w-[285%] h-[285%] p-4 bg-gray-900/50">
          {children}
        </div>
      </div>

      {/* グラデーションオーバーレイ */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

      {/* テキスト情報 */}
      <div
        className={`
        absolute bottom-0 left-0 right-0 p-6 border-t backdrop-blur-sm
        ${colorClass}
      `}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-mono font-bold text-white group-hover:text-yellow-100/90 transition-colors">
              {title}
            </h2>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          </div>
          <span className="text-2xl opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
