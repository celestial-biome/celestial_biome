'use client';

import * as echarts from 'echarts'; // registerMapのために追加
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import {
  getDepthScatterOption,
  getMagHistOption,
  getMapOption,
  getRegionRankOption,
  getTimeSeriesOption,
} from './chart-options';
import type { StackedSeriesData } from './useEarthquakes';
import { cn, type Earthquake } from './utils';

// SSR回避
const ReactECharts = dynamic(async () => (await import('echarts-for-react')).default, {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-zinc-600">
      Loading Chart...
    </div>
  ),
});

type BaseChartProps = {
  className?: string;
};

// --- 1. 世界震源マップ (修正版) ---
export function EarthquakeMapChart({ data, className }: BaseChartProps & { data: Earthquake[] }) {
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    const loadMapData = async () => {
      // すでに登録済みなら再取得しない
      if (echarts.getMap('world')) {
        setIsMapLoaded(true);
        return;
      }

      try {
        // Apache ECharts 公式のテスト用GeoJSONを利用 (本番ではローカルファイル配置を推奨)
        const response = await fetch(
          'https://raw.githubusercontent.com/apache/echarts/master/test/data/map/json/world.json',
        );
        if (!response.ok) throw new Error('Network response was not ok');

        const geoJson = await response.json();
        echarts.registerMap('world', geoJson);
        setIsMapLoaded(true);
      } catch (error) {
        console.error('Failed to load world map data:', error);
      }
    };

    loadMapData();
  }, []);

  const option = useMemo(() => {
    if (!isMapLoaded) return {};
    return getMapOption(data);
  }, [data, isMapLoaded]);

  return (
    <div className={cn('relative w-full h-full min-h-[300px]', className)}>
      {!isMapLoaded ? (
        <div className="flex items-center justify-center h-full text-zinc-500 animate-pulse text-xs">
          Loading World Map...
        </div>
      ) : (
        <ReactECharts
          option={option}
          style={{ width: '100%', height: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      )}
    </div>
  );
}

// --- 以下は変更なし ---

// --- 2. マグニチュード分布 ---
export function MagHistChart({ data, className }: BaseChartProps & { data: Earthquake[] }) {
  const option = useMemo(() => getMagHistOption(data), [data]);
  return (
    <div className={cn('relative w-full h-full min-h-[200px]', className)}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

// --- 3. 深さ vs マグニチュード ---
export function DepthScatterChart({ data, className }: BaseChartProps & { data: Earthquake[] }) {
  const option = useMemo(() => getDepthScatterOption(data), [data]);
  return (
    <div className={cn('relative w-full h-full min-h-[200px]', className)}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

// --- 4. 地域別ランキング ---
export function RegionRankChart({
  data,
  className,
}: BaseChartProps & { data: [string, number][] }) {
  const option = useMemo(() => getRegionRankOption(data), [data]);
  return (
    <div className={cn('relative w-full h-full min-h-[300px]', className)}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

// --- 5. 時系列推移 (修正) ---
export function TimeSeriesChart({ data, className }: BaseChartProps & { data: StackedSeriesData }) {
  // data が StackedSeriesData 型になったので、そのまま渡す
  const option = useMemo(() => getTimeSeriesOption(data), [data]);

  return (
    <div className={cn('relative w-full h-full min-h-[200px]', className)}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
