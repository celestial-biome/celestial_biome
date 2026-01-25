import Link from 'next/link';

import EarthquakeDashboard from './components/earthquake';
import type { Earthquake } from './components/earthquake/utils';
import SpaceWeatherDashboard from './components/space-weather';
import type { WeatherData } from './components/space-weather/utils';
import WorldEconomyDashboard from './components/world-economy';
import type { EconomyApiResponse } from './components/world-economy/utils';

const API_BASE_URL =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function getDashboardData() {
  console.log(`[Server] Fetching dashboard data from: ${API_BASE_URL}`);

  try {
    const [economyRes, spaceRes, quakeRes] = await Promise.allSettled([
      // next: { revalidate: 3600 } により、1時間はキャッシュされたHTMLを返します（爆速化の鍵）
      fetch(`${API_BASE_URL}/api/v1/economy/world-economy/`, { next: { revalidate: 3600 } }),
      fetch(`${API_BASE_URL}/api/v1/astronomy/space-weather/`, { next: { revalidate: 3600 } }),
      fetch(`${API_BASE_URL}/api/v1/geology/earthquakes/`, { next: { revalidate: 3600 } }),
    ]);

    // 失敗時はログを出してデバッグしやすくする
    if (economyRes.status === 'fulfilled' && !economyRes.value.ok) {
      console.error(`Economy fetch failed: ${economyRes.value.status} via ${API_BASE_URL}`);
    }

    const economyData: EconomyApiResponse | null =
      economyRes.status === 'fulfilled' && economyRes.value.ok
        ? await economyRes.value.json()
        : null;

    const spaceWeatherData: WeatherData[] | null =
      spaceRes.status === 'fulfilled' && spaceRes.value.ok ? await spaceRes.value.json() : null;

    const earthquakes: Earthquake[] =
      quakeRes.status === 'fulfilled' && quakeRes.value.ok ? await quakeRes.value.json() : [];

    return { economyData, spaceWeatherData, earthquakes };
  } catch (error) {
    console.error('Server side fetch error:', error);
    return { economyData: null, spaceWeatherData: null, earthquakes: [] };
  }
}

export default async function Home() {
  // サーバーサイドでデータ取得完了後にレンダリング開始
  const { economyData, spaceWeatherData, earthquakes } = await getDashboardData();

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-950 flex flex-col justify-center relative overflow-hidden">
      {/* 背景の装飾 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/40 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/40 rounded-full blur-[128px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-100 via-white to-purple-100 mb-6 tracking-tight drop-shadow-sm">
            Celestial Biome Portal
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-light">
            Visualize the rhythm of the planet and cosmos. <br className="hidden sm:inline" />
            Monitor real-time data from economic, geological, and astronomical sources.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <LinkCard
            href="/world-economy"
            title="World Economy"
            description="Global economic indicators and trends visualization."
            colorClass="border-blue-500/30 text-blue-400"
          >
            {economyData ? (
              <div className="h-full w-full pointer-events-none select-none">
                <WorldEconomyDashboard initialData={economyData} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">No Data</div>
            )}
          </LinkCard>

          <LinkCard
            href="/space-weather"
            title="Space Weather"
            description="Solar activity and geomagnetic storm monitoring."
            colorClass="border-orange-500/30 text-orange-400"
          >
            {spaceWeatherData && spaceWeatherData.length > 0 ? (
              <div className="h-full w-full pointer-events-none select-none">
                <SpaceWeatherDashboard initialData={spaceWeatherData} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">No Data</div>
            )}
          </LinkCard>

          <LinkCard
            href="/earthquake"
            title="Earthquake Monitor"
            description="Real-time seismic activity and magnitude tracking."
            colorClass="border-red-500/30 text-red-400"
          >
            {earthquakes && earthquakes.length > 0 ? (
              <div className="h-full w-full pointer-events-none select-none">
                <EarthquakeDashboard initialData={earthquakes} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">No Data</div>
            )}
          </LinkCard>
        </div>
      </div>
    </main>
  );
}

// LinkCard は変更なし
function LinkCard({
  href,
  title,
  description,
  children,
  colorClass,
}: {
  href: string;
  title: string;
  description: string;
  children: React.ReactNode;
  colorClass: string;
}) {
  return (
    <Link
      href={href}
      className="group block h-[400px] w-full relative overflow-hidden rounded-2xl border bg-gray-950 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/10"
    >
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden opacity-80 group-hover:opacity-100 transition-opacity duration-500 ${colorClass} border-b-0 border-x-0 rounded-t-2xl`}
      >
        <div className="origin-top-left transform scale-[0.35] w-[285%] h-[285%] p-4 bg-gray-900/50">
          {children}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 border-t backdrop-blur-sm bg-gray-950/80 ${colorClass}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-mono font-bold text-white group-hover:text-yellow-100/90 transition-colors">
              {title}
            </h2>
            <p className="text-sm text-gray-400 mt-2 line-clamp-2">{description}</p>
          </div>
          <div className="transform translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
            <svg
              aria-hidden="true"
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
