'use client';

import * as echarts from 'echarts';
import { useEffect, useState } from 'react';
import { BzChart, KpChart, WindChart, XrayChart } from './SpaceWeatherCharts';
import { Card, StatChip } from './ui-parts';
import { useSpaceWeather } from './useSpaceWeather';
import { cn, formatTs, formatTsShort, METRICS_INFO, type WeatherData } from './utils';

interface Props {
  initialData: WeatherData[] | null;
}

export default function SpaceWeatherDashboard({ initialData }: Props) {
  // フックに初期データを渡す
  const { data, nowMs, seriesData, lastXray, lastWind, lastBz, lastKp, flare } =
    useSpaceWeather(initialData);

  const [readyCount, setReadyCount] = useState(0);

  // 全チャートが準備できたら同期させる
  useEffect(() => {
    if (readyCount < 4) return;
    try {
      echarts.connect('spaceWeatherGroup');
    } catch {
      // ignore
    }
  }, [readyCount]);

  const onChartReady = (chart: echarts.ECharts) => {
    chart.group = 'spaceWeatherGroup';
    setReadyCount((c) => Math.min(4, c + 1));
  };

  // 1. データ取得失敗時の表示
  if (!initialData) {
    return (
      <div className="p-4 bg-red-900/20 text-red-400 rounded-md border border-red-900/50">
        Data could not be retrieved.
      </div>
    );
  }

  // 2. データが空の場合の表示
  if (!data.length) {
    return <div className="text-white p-4">No data available.</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 md:space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[radial-gradient(900px_500px_at_20%_-10%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(900px_500px_at_80%_0%,rgba(251,113,133,0.10),transparent_55%),linear-gradient(to_bottom,rgba(0,0,0,0.86),rgba(0,0,0,0.92))] p-3 md:p-6">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl text-white font-bold">Space Weather</h2>
            <p className="mt-1 text-[10px] md:text-xs text-zinc-400 leading-snug">
              Last 7 Days (Sync Zoom/Hover)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:gap-2">
            <div className="rounded-lg md:rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs text-zinc-300 tabular-nums text-center">
              {/* nowMs が null の場合はプレースホルダーを表示 */}
              UTC {nowMs ? formatTs(nowMs, 'UTC').split(' ')[1] : '--:--:--'}
            </div>
            <div className="rounded-lg md:rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs text-zinc-300 tabular-nums text-center">
              JST {nowMs ? formatTs(nowMs, 'Asia/Tokyo').split(' ')[1] : '--:--:--'}
            </div>
            <div
              className={cn(
                'col-span-2 md:col-span-1 rounded-lg md:rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm font-semibold text-center',
                flare.tone,
              )}
            >
              Flare Class: {flare.label}
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 md:gap-3 md:grid-cols-4">
          <StatChip
            label="GOES X-ray"
            value={lastXray ? lastXray.value.toExponential(2) : '—'}
            sub={lastXray ? formatTsShort(new Date(lastXray.item.timestamp).getTime()) : undefined}
            tone={flare.tone}
          />
          <StatChip
            label="Solar Wind"
            value={lastWind ? `${Math.round(lastWind.value)} km/s` : '—'}
            tone="text-emerald-200"
          />
          <StatChip
            label="IMF Bz"
            value={lastBz ? `${lastBz.value.toFixed(1)} nT` : '—'}
            tone={lastBz && lastBz.value < 0 ? 'text-amber-200' : 'text-zinc-200'}
          />
          <StatChip
            label="Kp Index"
            value={lastKp ? `${Math.round(lastKp.value)}` : '—'}
            tone="text-orange-200"
          />
        </div>

        {/* Charts */}
        <div className="mt-4 md:mt-6 grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
          <Card
            title="GOES X-ray Flux"
            subtitle="W/m² (log)"
            right={
              <span className={cn('text-xs md:text-sm font-semibold', flare.tone)}>
                {flare.label}
              </span>
            }
          >
            <XrayChart data={seriesData.xray} onChartReady={onChartReady} />
          </Card>

          <Card title="Solar Wind Speed" subtitle="km/s">
            <WindChart data={seriesData.wind} onChartReady={onChartReady} />
          </Card>

          <Card title="IMF Bz (GSM)" subtitle="nT">
            <BzChart data={seriesData.bz} onChartReady={onChartReady} />
          </Card>

          <Card title="Planetary Kp Index" subtitle="0–9">
            <KpChart data={seriesData.kp} onChartReady={onChartReady} />
          </Card>
        </div>
      </div>

      {/* Metrics Reference */}
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
