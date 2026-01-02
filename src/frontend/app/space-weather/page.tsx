import Link from 'next/link';
import SpaceWeatherDashboard from '../components/space-weather';

export default function SpaceWeatherPage() {
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
        <SpaceWeatherDashboard />
      </div>
    </main>
  );
}
