import SolarSystemMap from './components/SolarSystemMap';
import SpaceWeatherDashboard from './components/SpaceWeatherDashboard';

// export default function Home() {
//   return (
//     <main className="flex min-h-screen flex-col items-center justify-center bg-black">
//       <SolarSystemMap />
//     </main>
//   );
// }

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-black">
      {/* 既存のコンテンツ... */}

      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        {/* ... */}
      </div>

      {/* 追加: 宇宙天気ダッシュボード */}
      <div className="w-full mt-10">
        <SpaceWeatherDashboard />
      </div>
    </main>
  );
}
