'use client';

import { useMemo } from 'react';
import { Card } from '../space-weather/ui-parts';
import { useWorldEconomy } from './useWorldEconomy';
import { type EconomyApiResponse, METRICS_INFO } from './utils';
import { GdpChart, InflationChart, StockChart } from './WorldEconomyCharts';

// --- Stat Card Component ---
const StatCard = ({
  label,
  value,
  subValue,
  color = 'text-white',
}: {
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between h-full">
    <div className="text-xs text-zinc-400 mb-1">{label}</div>
    <div>
      <div className={`text-2xl font-bold font-mono tracking-tight ${color}`}>{value}</div>
      {subValue && <div className="text-xs text-zinc-500 mt-1">{subValue}</div>}
    </div>
  </div>
);

// --- Metrics Logic ---
const calculateMetrics = (data: EconomyApiResponse | null) => {
  if (!data) return null;
  const countries = Object.keys(data);

  // 1. USA Stock
  const usaStock = data.USA?.STOCK?.slice(-1)[0];
  const usaStockVal = usaStock ? usaStock.value.toFixed(2) : '-';

  // 2. Top Performer
  let topPerfCountry = '-';
  let maxGrowth = -Infinity;
  countries.forEach((c) => {
    const stock = data[c]?.STOCK;
    if (stock && stock.length > 0) {
      const first = stock[0].value;
      const last = stock[stock.length - 1].value;
      const growth = (last / first - 1) * 100;
      if (growth > maxGrowth) {
        maxGrowth = growth;
        topPerfCountry = c;
      }
    }
  });

  // 3. Max Inflation
  let maxInfCountry = '-';
  let maxInfVal = -Infinity;
  countries.forEach((c) => {
    const inf = data[c]?.INFLATION;
    if (inf && inf.length > 0) {
      const last = inf[inf.length - 1].value;
      if (last > maxInfVal) {
        maxInfVal = last;
        maxInfCountry = c;
      }
    }
  });

  // 4. Total GDP
  let totalGdp = 0;
  countries.forEach((c) => {
    const gdp = data[c]?.GDP;
    if (gdp && gdp.length > 0) {
      totalGdp += gdp[gdp.length - 1].value;
    }
  });

  return {
    usaStockVal,
    topPerfCountry,
    maxGrowth: Number.isFinite(maxGrowth) ? `+${maxGrowth.toFixed(1)}%` : '-',
    maxInfCountry,
    maxInfVal: Number.isFinite(maxInfVal) ? `${maxInfVal.toFixed(2)}%` : '-',
    totalGdp: `${(totalGdp / 1e12).toFixed(2)}T`,
  };
};

// Propsの型定義を追加
interface Props {
  initialData: EconomyApiResponse | null;
}

export default function WorldEconomyDashboard({ initialData }: Props) {
  // フックに初期データを渡す
  const { stockSeries, gdpSeries, inflationSeries } = useWorldEconomy(initialData);
  const metrics = useMemo(() => calculateMetrics(initialData), [initialData]);

  // データが空の場合の表示
  if (!initialData) {
    return (
      <div className="p-4 bg-red-900/20 text-red-400 rounded-md border border-red-900/50">
        Data could not be retrieved.
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 p-4">
      {/* --- 1. Header & Metrics --- */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl text-white font-bold tracking-tight">
              Global Economic Dashboard
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              G7 + AUS/CHN/IND (Source: Yahoo Finance, World Bank)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="🇺🇸 S&P 500 (Last Close)"
            value={metrics?.usaStockVal || '-'}
            color="text-sky-400"
          />
          <StatCard
            label="📈 Top Growth (Since 2000)"
            value={metrics?.topPerfCountry || '-'}
            subValue={metrics?.maxGrowth}
            color="text-emerald-400"
          />
          <StatCard
            label="🔥 Highest Inflation (CPI)"
            value={metrics?.maxInfCountry || '-'}
            subValue={metrics?.maxInfVal}
            color="text-rose-400"
          />
          <StatCard
            label="💰 Total GDP (Tracked)"
            value={`$${metrics?.totalGdp}`}
            subValue="USD (Trillions)"
            color="text-indigo-400"
          />
        </div>
      </div>

      {/* --- 2. Main Charts --- */}
      <div className="flex flex-col gap-8">
        <Card title="Stock Market Performance" subtitle="Normalized (Start=100)">
          <StockChart data={stockSeries} className="h-[400px]" />
        </Card>

        <Card title="Real GDP Trend" subtitle="Constant 2015 US$ (Billions)">
          <GdpChart data={gdpSeries} className="h-[400px]" />
        </Card>

        <Card title="Inflation Rate (CPI)" subtitle="Annual % Change">
          <InflationChart data={inflationSeries} className="h-[400px]" />
        </Card>
      </div>

      {/* --- 3. Reference Section --- */}
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
