'use client';

import { Card, StatChip } from '../space-weather/ui-parts';
import {
  DepthScatterChart,
  EarthquakeMapChart,
  MagHistChart,
  RegionRankChart,
  TimeSeriesChart,
} from './EarthquakeCharts';
import { useEarthquakes } from './useEarthquakes';
import { type Earthquake, METRICS_INFO } from './utils';

interface Props {
  initialData: Earthquake[] | null;
}

// ハイドレーションエラー回避のための安定した日付フォーマッター
// サーバー/クライアント間でタイムゾーンやロケールの違いが出ないよう、UTCベースまたは固定ロジックで整形します
const formatDateSafe = (ts: string) => {
  const d = new Date(ts);
  // シンプルに UTC の YYYY/MM/DD を返す (または必要に応じてJST加算などを行う)
  // ここでは不整合を防ぐため UTC の日付を使用します
  const year = d.getUTCFullYear();
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
};

export default function EarthquakeDashboard({ initialData }: Props) {
  // フックにサーバー側で取得したデータを渡す
  const { data, loading, topQuakes, timeSeriesData, regionRanking } = useEarthquakes(initialData);

  // データ取得失敗時の表示
  if (!initialData) {
    return (
      <div className="p-4 bg-red-900/20 text-red-400 rounded-md border border-red-900/50">
        Data could not be retrieved.
      </div>
    );
  }

  // データが空の場合
  if (!data.length && !loading) {
    return <div className="text-white p-4">No earthquake data available.</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-4">
      {/* --- Header Area --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl text-white font-bold tracking-tight">
            Global Earthquake Monitor
          </h2>
          <p className="mt-1 text-sm text-zinc-400">Past 7 Days (USGS Feed)</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center">
            <div className="text-xs text-zinc-400">Total Events</div>
            <div className="text-xl font-bold text-emerald-400">{data.length}</div>
          </div>
        </div>
      </div>

      {/* --- Top Quakes Chips --- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {topQuakes.map((q) => (
          <StatChip
            key={q.usgs_id}
            // 修正: toLocaleDateString() をやめて、自作の安全なフォーマッターを使用
            label={formatDateSafe(q.timestamp)}
            value={`M${q.magnitude.toFixed(1)}`}
            sub={q.place.split(',').pop()?.trim()}
            tone={q.magnitude >= 6 ? 'text-red-400' : 'text-orange-300'}
          />
        ))}
      </div>

      {/* --- Main Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Map */}
        <div className="lg:col-span-2">
          <Card title="Global Epicenters" subtitle="Magnitude & Location">
            <EarthquakeMapChart data={data} className="h-[400px]" />
          </Card>
        </div>

        {/* 2. Ranking */}
        <div className="lg:col-span-1">
          <Card title="Most Active Regions" subtitle="Event Count by Region">
            <RegionRankChart data={regionRanking} className="h-[400px]" />
          </Card>
        </div>

        {/* 3. Time Series */}
        <div className="lg:col-span-3">
          <Card title="Daily Activity" subtitle="Earthquake Frequency (7 Days)">
            <TimeSeriesChart data={timeSeriesData} className="h-[200px]" />
          </Card>
        </div>

        {/* 4. Analysis Row */}
        <div className="lg:col-span-1">
          <Card title="Magnitude Distribution" subtitle="Frequency">
            <MagHistChart data={data} className="h-[250px]" />
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card title="Depth vs Magnitude" subtitle="Correlation Analysis">
            <DepthScatterChart data={data} className="h-[250px]" />
          </Card>
        </div>
      </div>

      {/* --- Metrics Reference Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 p-4 bg-gray-900/80 rounded-2xl border border-white/10">
        <h3 className="text-base md:text-lg font-bold text-white col-span-full mb-1">
          Metrics Reference
        </h3>
        {METRICS_INFO.map((info) => (
          <div
            key={info.label}
            className="bg-black/40 p-3 md:p-4 rounded-xl border border-gray-800/80"
          >
            <h4 className={`font-bold text-xs md:text-sm mb-1 ${info.color}`}>{info.label}</h4>
            <p className="text-[10px] md:text-xs text-gray-400 leading-relaxed">
              {info.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
