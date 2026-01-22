'use client';

import type * as echarts from 'echarts';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getBzOption, getKpOption, getWindOption, getXrayOption } from './chart-options';
import { bandIdFromXray, nearestY, XRAY_BANDS, type XY } from './utils';

// SSR 無効化ラッパー
const ReactECharts = dynamic(async () => (await import('echarts-for-react')).default, {
  ssr: false,
});

// 共通プロップス
type ChartProps = {
  onChartReady?: (chart: echarts.ECharts) => void;
};

// --- X-ray Chart Component (複雑なロジックを内包) ---
export function XrayChart({ data, onChartReady }: ChartProps & { data: XY[] }) {
  const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null);
  const hoverBandRef = useRef<string | null>(null);
  const dataRef = useRef(data); // 最新のデータを参照用に保持

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const option = useMemo(() => getXrayOption(data), [data]);

  // グラフィック（ラベル）更新ロジック
  useEffect(() => {
    if (!chartInstance || data.length === 0) return;
    // biome-ignore lint/suspicious/noExplicitAny: <あとで修正>
    if ((chartInstance as any).isDisposed?.()) return;

    const GRID_RIGHT = 20;
    const INSET = 6;

    const xmin = data[0]?.[0];
    const xmax = data[data.length - 1]?.[0];

    const getXInsideCurrentView = () => {
      // biome-ignore lint/suspicious/noExplicitAny: <あとで修正>
      const opt: any = chartInstance.getOption();
      const dz = opt?.dataZoom?.[0] ?? {};
      if (typeof dz.startValue === 'number' && typeof dz.endValue === 'number') {
        return (dz.startValue + dz.endValue) / 2;
      }
      const start = typeof dz.start === 'number' ? dz.start : 0;
      const end = typeof dz.end === 'number' ? dz.end : 100;
      const x0 = xmin + (xmax - xmin) * (start / 100);
      const x1 = xmin + (xmax - xmin) * (end / 100);
      return (x0 + x1) / 2;
    };

    const safePix = (x: number, y: number) => {
      try {
        const r = chartInstance.convertToPixel({ seriesIndex: 0 }, [x, y]);
        return Array.isArray(r) && r.length >= 2 ? (r as number[]) : null;
      } catch {
        return null;
      }
    };

    const buildGraphics = (activeId: string | null) => {
      const x = getXInsideCurrentView();
      if (!Number.isFinite(x)) return [];

      return XRAY_BANDS.map((b) => {
        const p1 = safePix(x, b.y1);
        const p2 = safePix(x, b.y2);
        if (!p1 || !p2) return null;

        // もし undefined なら 0 として扱う、などのフォールバックを入れる
        const y = ((p1[1] ?? 0) + (p2[1] ?? 0)) / 2;
        const active = activeId === b.id;
        const opacity = active ? b.activeOpacity : b.baseOpacity;
        const weight = active ? Math.max(800, b.fontWeight) : b.fontWeight;

        return {
          id: `band-label-${b.id}`,
          type: 'text',
          right: GRID_RIGHT + INSET,
          top: y - b.fontSize / 2,
          silent: true,
          z: 100,
          style: {
            text: b.id,
            fill: b.fill,
            opacity,
            fontSize: b.fontSize,
            fontWeight: weight,
            fontFamily: 'sans-serif',
            align: 'right',
            verticalAlign: 'middle',
          },
        };
        // biome-ignore lint/suspicious/noExplicitAny: <あとで修正>
      }).filter(Boolean) as any[];
    };

    let raf = 0;
    const updateLabels = () => {
      // biome-ignore lint/suspicious/noExplicitAny: <あとで修正>
      if ((chartInstance as any).isDisposed?.()) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const graphics = buildGraphics(hoverBandRef.current);
        if (!graphics.length) return;
        chartInstance.setOption(
          { graphic: graphics },
          { replaceMerge: ['graphic'], lazyUpdate: true },
        );
      });
    };
    // biome-ignore lint/suspicious/noExplicitAny: <あとで修正>
    const onUpdateAxisPointer = (evt: any) => {
      const axisInfo =
        // biome-ignore lint/suspicious/noExplicitAny: <あとで修正>
        evt?.axesInfo?.find((a: any) => a.axisDimension === 'x') ?? evt?.axesInfo?.[0];
      const x = axisInfo?.value;
      if (typeof x !== 'number') return;

      const y = nearestY(dataRef.current, x);
      const id = bandIdFromXray(y);
      if (hoverBandRef.current !== id) {
        hoverBandRef.current = id;
        updateLabels();
      }
    };

    const onGlobalOut = () => {
      if (hoverBandRef.current !== null) {
        hoverBandRef.current = null;
        updateLabels();
      }
    };

    requestAnimationFrame(updateLabels);
    chartInstance.on('finished', updateLabels);
    chartInstance.on('dataZoom', updateLabels);
    chartInstance.on('updateAxisPointer', onUpdateAxisPointer);
    chartInstance.on('globalout', onGlobalOut);
    window.addEventListener('resize', updateLabels);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      chartInstance.off('finished', updateLabels);
      chartInstance.off('dataZoom', updateLabels);
      chartInstance.off('updateAxisPointer', onUpdateAxisPointer);
      chartInstance.off('globalout', onGlobalOut);
      window.removeEventListener('resize', updateLabels);
    };
  }, [chartInstance, data]);

  return (
    <div className="h-[220px] md:h-[260px]">
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
        onChartReady={(c) => {
          setChartInstance(c);
          onChartReady?.(c);
        }}
      />
    </div>
  );
}

// --- Other Charts ---
export function WindChart({ data, onChartReady }: ChartProps & { data: XY[] }) {
  const option = useMemo(() => getWindOption(data), [data]);
  return (
    <div className="h-[220px] md:h-[260px]">
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
        onChartReady={onChartReady}
      />
    </div>
  );
}

export function BzChart({ data, onChartReady }: ChartProps & { data: XY[] }) {
  const option = useMemo(() => getBzOption(data), [data]);
  return (
    <div className="h-[220px] md:h-[260px]">
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
        onChartReady={onChartReady}
      />
    </div>
  );
}

export function KpChart({ data, onChartReady }: ChartProps & { data: XY[] }) {
  const option = useMemo(() => getKpOption(data), [data]);
  return (
    <div className="h-[220px] md:h-[260px]">
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
        onChartReady={onChartReady}
      />
    </div>
  );
}
