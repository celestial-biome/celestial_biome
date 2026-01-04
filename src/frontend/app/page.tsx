import Link from 'next/link';
import EarthquakeDashboard from './components/earthquake';
import SpaceWeatherDashboard from './components/space-weather';
import WorldEconomyDashboard from './components/world-economy';

export default function Home() {
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
          {/* ここに実物のコンポーネントを配置 */}
          <SpaceWeatherDashboard />
        </PreviewCard>

        {/* 地震情報プレビューカード */}
        <PreviewCard
          href="/earthquake"
          title="Earthquake Monitor"
          description="Global Seismic Data"
          colorClass="border-blue-500/30 hover:border-blue-400 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)]"
        >
          {/* ここに実物のコンポーネントを配置 */}
          <EarthquakeDashboard />
        </PreviewCard>

        {/* 地震情報プレビューカード */}
        <PreviewCard
          href="/world-economy"
          title="World Economy"
          description="Global Economic Data"
          colorClass="border-blue-500/30 hover:border-blue-400 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)]"
        >
          {/* ここに実物のコンポーネントを配置 */}
          <WorldEconomyDashboard />
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
        {/* 仮想的なスクリーンを作り、それをカードサイズに合わせて縮小します。
          w-[285%]: 親要素の約3倍の幅を確保
          scale-[0.35]: 確保した幅を約1/3に縮小して表示
        */}
        <div className="origin-top-left transform scale-[0.35] w-[285%] h-[285%] p-4 bg-gray-900/50">
          {children}
        </div>
      </div>

      {/* グラデーションオーバーレイ（文字を読みやすくするため） */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

      {/* テキスト情報（カードの下部に配置） */}
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
