'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { getGdpOption, getInflationOption, getStockOption } from './chart-options';
import type { SeriesData } from './utils';
import { cn } from './utils';

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

// --- 1. Stock Chart ---
export function StockChart({ data, className }: BaseChartProps & { data: SeriesData[] }) {
  const option = useMemo(() => getStockOption(data), [data]);
  return (
    <div className={cn('relative w-full h-full min-h-[300px]', className)}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

// --- 2. Inflation Chart ---
export function InflationChart({ data, className }: BaseChartProps & { data: SeriesData[] }) {
  const option = useMemo(() => getInflationOption(data), [data]);
  return (
    <div className={cn('relative w-full h-full min-h-[300px]', className)}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

// --- 3. GDP Chart ---
export function GdpChart({ data, className }: BaseChartProps & { data: SeriesData[] }) {
  const option = useMemo(() => getGdpOption(data), [data]);
  return (
    <div className={cn('relative w-full h-full min-h-[300px]', className)}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
