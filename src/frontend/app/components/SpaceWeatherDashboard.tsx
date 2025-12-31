'use client';

import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import dynamic from 'next/dynamic';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

// SSR 無効化
const ReactECharts = dynamic(async () => (await import('echarts-for-react')).default, {
  ssr: false,
});

type WeatherData = {
  timestamp: string;
  xray_flux?: number;
  solar_wind_speed?: number;
  imf_bz?: number;
  kp_index?: number;
};

// --- 用語解説データ ---
const METRICS_INFO = [
  {
    label: 'GOES X-Ray Flux',
    description: '太陽フレアの強度（対数）。Mクラス以上で無線通信障害のリスク。',
    color: 'text-orange-400',
  },
  {
    label: 'Solar Wind Speed',
    description: '太陽風速度。高速風（500km/s超）は地磁気撹乱の要因。',
    color: 'text-emerald-400',
  },
  {
    label: 'IMF Bz (GSM)',
    description: '磁場の南北成分。南向き（マイナス）で磁気嵐のリスク増。',
    color: 'text-yellow-400',
  },
  {
    label: 'Planetary Kp Index',
    description: '地磁気乱れ指数（0-9）。5以上で磁気嵐。',
    color: 'text-orange-500',
  },
] as const;

function cn(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ');
}

function formatTs(ts: number, timeZone: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
  }).format(new Date(ts));
}

function formatTsShort(ts: number) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  }).format(new Date(ts));
}

function flareClass(x: number | null | undefined) {
  if (x == null || Number.isNaN(x)) return { label: '—', tone: 'text-zinc-300' };
  if (x >= 1e-4) return { label: 'X', tone: 'text-rose-300' };
  if (x >= 1e-5) return { label: 'M', tone: 'text-orange-300' };
  if (x >= 1e-6) return { label: 'C', tone: 'text-amber-300' };
  if (x >= 1e-7) return { label: 'B', tone: 'text-emerald-300' };
  return { label: 'A', tone: 'text-sky-300' };
}

// Mobile: パディングを減らして高さを抑える
function StatChip({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[10px] md:text-[11px] text-zinc-400">{label}</div>
      <div className={cn('text-sm md:text-base font-semibold tracking-wide tabular-nums', tone)}>
        {value}
      </div>
      {sub ? <div className="text-[10px] md:text-[11px] text-zinc-500 truncate">{sub}</div> : null}
    </div>
  );
}

// Mobile: パディング調整 (px-3 pt-3)
function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl md:rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-start justify-between gap-2 px-3 pt-3 md:px-5 md:pt-5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-[10px] md:text-xs text-zinc-400 truncate">{subtitle}</p>
          ) : null}
        </div>
        <div className="shrink-0">{right}</div>
      </div>
      <div className="px-1 pb-2 pt-2 md:px-2 md:pb-4 md:pt-3">{children}</div>
    </section>
  );
}

// --- ECharts Options Helpers (変更なし) ---
function baseTooltip() {
  return {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      label: { backgroundColor: 'rgba(0,0,0,0.65)' },
      lineStyle: { color: 'rgba(255,255,255,0.18)' },
      crossStyle: { color: 'rgba(255,255,255,0.18)' },
    },
    backgroundColor: 'rgba(10,10,12,0.85)', // 少し濃くして視認性アップ
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    textStyle: { color: 'rgba(255,255,255,0.92)', fontSize: 12 },
    extraCssText:
      'backdrop-filter: blur(8px); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);',
    confine: true, // ツールチップが画面外にはみ出ないようにする
  } as const;
}

function xAxisTime(showLabels: boolean) {
  return {
    type: 'time',
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.14)' } },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: showLabels
      ? {
          color: 'rgba(255,255,255,0.55)',
          fontSize: 10, // モバイル用に少し小さく
          formatter: (value: number) => {
            const d = new Date(value);
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            return `${mm}/${dd} ${hh}:00`;
          },
        }
      : { show: false },
  } as const;
}

function yAxisValue() {
  return {
    type: 'value',
    axisLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.14)' } },
    axisTick: { show: false },
    axisLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: 4 },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
  } as const;
}

function yAxisLog() {
  return {
    type: 'log',
    min: 1e-9,
    max: 1e-2,
    axisLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.14)' } },
    axisTick: { show: false },
    axisLabel: {
      color: 'rgba(255,255,255,0.55)',
      fontSize: 10,
      margin: 4,
      formatter: (v: number) => {
        // 10のマイナス乗を簡潔に
        if (v === 1e-2) return '10⁻²';
        if (v === 1e-4) return '10⁻⁴';
        if (v === 1e-6) return '10⁻⁶';
        if (v === 1e-8) return '10⁻⁸';
        return '';
      },
    },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
  } as const;
}

// KPI Logic
function findLastFinite<T>(arr: T[], pick: (t: T) => number | undefined | null) {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = pick(arr[i]);
    if (v != null && Number.isFinite(v)) return { value: v, item: arr[i] };
  }
  return null;
}

type XY = [number, number | null];

function nearestY(points: XY[], x: number): number | null {
  if (!points.length) return null;
  let lo = 0;
  let hi = points.length - 1;

  if (x <= points[0]![0]) return points[0]![1];
  if (x >= points[hi]![0]) return points[hi]![1];

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = points[mid]![0];
    if (t === x) return points[mid]![1];
    if (t < x) lo = mid + 1;
    else hi = mid - 1;
  }

  const left = Math.max(0, hi);
  const right = Math.min(points.length - 1, lo);
  const dl = Math.abs(points[left]![0] - x);
  const dr = Math.abs(points[right]![0] - x);
  return dl <= dr ? points[left]![1] : points[right]![1];
}

// X-ray帯
const XRAY_BANDS = [
  {
    id: 'A',
    y1: 1e-8,
    y2: 1e-7,
    baseOpacity: 0.28,
    activeOpacity: 0.95,
    fill: 'rgba(255,255,255,1)',
    fontSize: 10,
    fontWeight: 600,
  },
  {
    id: 'B',
    y1: 1e-7,
    y2: 1e-6,
    baseOpacity: 0.3,
    activeOpacity: 0.95,
    fill: 'rgba(255,255,255,1)',
    fontSize: 10,
    fontWeight: 600,
  },
  {
    id: 'C',
    y1: 1e-6,
    y2: 1e-5,
    baseOpacity: 0.33,
    activeOpacity: 0.98,
    fill: 'rgba(255,255,255,1)',
    fontSize: 10,
    fontWeight: 700,
  },
  {
    id: 'M',
    y1: 1e-5,
    y2: 1e-4,
    baseOpacity: 0.35,
    activeOpacity: 1.0,
    fill: 'rgba(251,146,60,1)',
    fontSize: 12,
    fontWeight: 900,
  },
  {
    id: 'X',
    y1: 1e-4,
    y2: 1e-2,
    baseOpacity: 0.35,
    activeOpacity: 1.0,
    fill: 'rgba(239,68,68,1)',
    fontSize: 12,
    fontWeight: 900,
  },
] as const;

function bandIdFromXray(v: number | null): (typeof XRAY_BANDS)[number]['id'] | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (v >= 1e-4) return 'X';
  if (v >= 1e-5) return 'M';
  if (v >= 1e-6) return 'C';
  if (v >= 1e-7) return 'B';
  if (v >= 1e-8) return 'A';
  return null;
}

export default function SpaceWeatherDashboard() {
  const [data, setData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const [readyCount, setReadyCount] = useState(0);
  const [xrayChart, setXrayChart] = useState<echarts.ECharts | null>(null);
  const xraySeriesRef = useRef<XY[]>([]);
  const hoverBandRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/v1/astronomy/space-weather/`);
        if (!res.ok) throw new Error('Failed to fetch data');
        const jsonData = (await res.json()) as WeatherData[];
        setData(jsonData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (readyCount < 4) return;
    try {
      echarts.connect('spaceWeatherGroup');
    } catch {
      // ignore
    }
  }, [readyCount]);

  const seriesData = useMemo(() => {
    const toPoint = (ts: string, v: number | undefined) => {
      const t = new Date(ts).getTime();
      return [t, v ?? null] as XY;
    };
    const xray = data.map((d) => toPoint(d.timestamp, d.xray_flux));
    const wind = data.map((d) => toPoint(d.timestamp, d.solar_wind_speed));
    const bz = data.map((d) => toPoint(d.timestamp, d.imf_bz));
    const kp = data.map((d) => toPoint(d.timestamp, d.kp_index));
    return { xray, wind, bz, kp };
  }, [data]);

  useEffect(() => {
    xraySeriesRef.current = seriesData.xray;
  }, [seriesData.xray]);

  const lastXray = useMemo(() => findLastFinite(data, (d) => d.xray_flux), [data]);
  const lastWind = useMemo(() => findLastFinite(data, (d) => d.solar_wind_speed), [data]);
  const lastBz = useMemo(() => findLastFinite(data, (d) => d.imf_bz), [data]);
  const lastKp = useMemo(() => findLastFinite(data, (d) => d.kp_index), [data]);

  const flare = flareClass(lastXray?.value);

  // --- Charts Options ---
  // grid.right を微調整してスマホでの描画領域を広げる

  const xrayOption: EChartsOption = useMemo(() => {
    const tooltip = baseTooltip();
    return {
      animation: false,
      grid: { left: 40, right: 20, top: 10, bottom: 14 }, // マージン縮小
      tooltip: {
        ...tooltip,
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const ts = p?.value?.[0];
          const v = p?.value?.[1];
          const val = v == null ? '—' : Number(v).toExponential(2);
          return `
            <div style="font-size:10px; color:rgba(255,255,255,0.65); margin-bottom:4px;">${formatTsShort(ts)}</div>
            <div style="display:flex; justify-content:space-between; gap:10px;">
              <span style="color:rgba(255,255,255,0.65)">X-ray</span>
              <b style="font-family:monospace">${val}</b>
            </div>
          `;
        },
      },
      xAxis: xAxisTime(false),
      yAxis: yAxisLog(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
      series: [
        {
          name: 'X-ray',
          type: 'line',
          showSymbol: false,
          data: seriesData.xray,
          lineStyle: { width: 2, color: 'rgba(251,146,60,0.95)' },
          connectNulls: false,
          emphasis: { focus: 'series' },
          markArea: {
            silent: true,
            data: [
              [{ yAxis: 1e-8, itemStyle: { color: 'rgba(74,222,128,0.06)' } }, { yAxis: 1e-7 }],
              [{ yAxis: 1e-7, itemStyle: { color: 'rgba(163,230,53,0.06)' } }, { yAxis: 1e-6 }],
              [{ yAxis: 1e-6, itemStyle: { color: 'rgba(250,204,21,0.08)' } }, { yAxis: 1e-5 }],
              [{ yAxis: 1e-5, itemStyle: { color: 'rgba(251,146,60,0.14)' } }, { yAxis: 1e-4 }],
              [{ yAxis: 1e-4, itemStyle: { color: 'rgba(239,68,68,0.18)' } }, { yAxis: 1e-2 }],
            ],
          },
        },
      ],
    };
  }, [seriesData.xray]);

  const windOption: EChartsOption = useMemo(() => {
    const tooltip = baseTooltip();
    return {
      animation: false,
      grid: { left: 40, right: 10, top: 10, bottom: 14 },
      tooltip: {
        ...tooltip,
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const ts = p?.value?.[0];
          const v = p?.value?.[1];
          const val = v == null ? '—' : `${Math.round(v)} km/s`;
          return `
            <div style="font-size:10px; color:rgba(255,255,255,0.65); margin-bottom:4px;">${formatTsShort(ts)}</div>
            <div style="display:flex; justify-content:space-between; gap:10px;">
              <span style="color:rgba(255,255,255,0.65)">Wind</span>
              <b style="font-family:monospace">${val}</b>
            </div>
          `;
        },
      },
      xAxis: xAxisTime(false),
      yAxis: yAxisValue(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
      series: [
        {
          name: 'Solar Wind Speed',
          type: 'line',
          showSymbol: false,
          data: seriesData.wind,
          lineStyle: { width: 2, color: 'rgba(52,211,153,0.95)' },
          connectNulls: false,
          emphasis: { focus: 'series' },
        },
      ],
    };
  }, [seriesData.wind]);

  const bzOption: EChartsOption = useMemo(() => {
    const tooltip = baseTooltip();
    return {
      animation: false,
      grid: { left: 40, right: 10, top: 10, bottom: 14 },
      tooltip: {
        ...tooltip,
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const ts = p?.value?.[0];
          const v = p?.value?.[1];
          const val = v == null ? '—' : `${Number(v).toFixed(1)} nT`;
          return `
            <div style="font-size:10px; color:rgba(255,255,255,0.65); margin-bottom:4px;">${formatTsShort(ts)}</div>
            <div style="display:flex; justify-content:space-between; gap:10px;">
              <span style="color:rgba(255,255,255,0.65)">Bz</span>
              <b style="font-family:monospace">${val}</b>
            </div>
          `;
        },
      },
      xAxis: xAxisTime(false),
      yAxis: yAxisValue(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
      series: [
        {
          name: 'IMF Bz',
          type: 'line',
          showSymbol: false,
          data: seriesData.bz,
          lineStyle: { width: 2, color: 'rgba(250,204,21,0.95)' },
          connectNulls: false,
          emphasis: { focus: 'series' },
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            lineStyle: { color: 'rgba(255,255,255,0.14)' },
            data: [{ yAxis: 0 }],
          },
        },
      ],
    };
  }, [seriesData.bz]);

  const kpOption: EChartsOption = useMemo(() => {
    const tooltip = baseTooltip();
    return {
      animation: false,
      grid: { left: 40, right: 10, top: 10, bottom: 40 },
      tooltip: {
        ...tooltip,
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const ts = p?.value?.[0];
          const v = p?.value?.[1];
          const val = v == null ? '—' : `${Math.round(v)}`;
          return `
            <div style="font-size:10px; color:rgba(255,255,255,0.65); margin-bottom:4px;">${formatTsShort(ts)}</div>
            <div style="display:flex; justify-content:space-between; gap:10px;">
              <span style="color:rgba(255,255,255,0.65)">Kp</span>
              <b style="font-family:monospace">${val}</b>
            </div>
          `;
        },
      },
      xAxis: xAxisTime(true),
      yAxis: {
        ...yAxisValue(),
        min: 0,
        max: 9,
        interval: 1,
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        {
          type: 'slider',
          xAxisIndex: 0,
          height: 16,
          bottom: 5,
          borderColor: 'rgba(255,255,255,0.10)',
          fillerColor: 'rgba(255,255,255,0.06)',
          backgroundColor: 'rgba(255,255,255,0.02)',
          handleStyle: { color: 'rgba(255,255,255,0.12)' },
          textStyle: { color: 'rgba(255,255,255,0.40)', fontSize: 10 },
        },
      ],
      series: [
        {
          name: 'Kp',
          type: 'line',
          step: 'end',
          showSymbol: false,
          data: seriesData.kp,
          lineStyle: { width: 2, color: 'rgba(251,146,60,0.95)' },
          connectNulls: false,
          emphasis: { focus: 'series' },
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            lineStyle: { color: 'rgba(251,146,60,0.30)', type: 'dashed' },
            data: [{ yAxis: 5 }],
          },
        },
      ],
    };
  }, [seriesData.kp]);

  // ---- X-ray Graphic Labels (Chart Ref logic) ----
  // (ロジックは以前のままですが、文字サイズなどを少し調整)
  useEffect(() => {
    if (!xrayChart || data.length === 0) return;
    if ((xrayChart as any).isDisposed?.()) return;

    const GRID_RIGHT = 20;
    const INSET = 6;
    const xmin = new Date(data[0]!.timestamp).getTime();
    const xmax = new Date(data[data.length - 1]!.timestamp).getTime();

    const getXInsideCurrentView = () => {
      const opt: any = xrayChart.getOption();
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
        const r = xrayChart.convertToPixel({ seriesIndex: 0 }, [x, y]);
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

        const y = (p1[1]! + p2[1]!) / 2;
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
      }).filter(Boolean) as any[];
    };

    let raf = 0;
    const updateLabels = () => {
      if ((xrayChart as any).isDisposed?.()) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const graphics = buildGraphics(hoverBandRef.current);
        if (!graphics.length) return;
        xrayChart.setOption({ graphic: graphics }, { replaceMerge: ['graphic'], lazyUpdate: true });
      });
    };

    const onUpdateAxisPointer = (evt: any) => {
      const axisInfo =
        evt?.axesInfo?.find((a: any) => a.axisDimension === 'x') ?? evt?.axesInfo?.[0];
      const x = axisInfo?.value;
      if (typeof x !== 'number') return;
      const y = nearestY(xraySeriesRef.current, x);
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
    xrayChart.on('finished', updateLabels);
    xrayChart.on('dataZoom', updateLabels);
    xrayChart.on('updateAxisPointer', onUpdateAxisPointer);
    xrayChart.on('globalout', onGlobalOut);
    window.addEventListener('resize', updateLabels);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      xrayChart.off('finished', updateLabels);
      xrayChart.off('dataZoom', updateLabels);
      xrayChart.off('updateAxisPointer', onUpdateAxisPointer);
      xrayChart.off('globalout', onGlobalOut);
      window.removeEventListener('resize', updateLabels);
    };
  }, [xrayChart, data]);

  const onChartReadyXray = (chart: echarts.ECharts) => {
    chart.group = 'spaceWeatherGroup';
    setXrayChart(chart);
    setReadyCount((c) => Math.min(4, c + 1));
  };
  const onChartReadyOther = (chart: echarts.ECharts) => {
    chart.group = 'spaceWeatherGroup';
    setReadyCount((c) => Math.min(4, c + 1));
  };

  if (loading) return <div className="text-white p-4">Loading Space Weather Data...</div>;
  if (!data.length) return <div className="text-white p-4">No data available.</div>;

  return (
    // Mobile: space-y-4 に短縮。 max-w-6xlは維持するが、左右余白は親コンテナに依存
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

          {/* Timestamp & Status: Mobileではグリッドでコンパクトに */}
          <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:gap-2">
            <div className="rounded-lg md:rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs text-zinc-300 tabular-nums text-center">
              UTC {formatTs(nowMs, 'UTC').split(' ')[1]}
            </div>
            <div className="rounded-lg md:rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs text-zinc-300 tabular-nums text-center">
              JST {formatTs(nowMs, 'Asia/Tokyo').split(' ')[1]}
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

        {/* KPI Grid: Gapを縮める */}
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

        {/* Charts: Mobileは1カラムだが高さを抑える */}
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
            {/* Mobile: 220px, PC: 260px */}
            <div className="h-[220px] md:h-[260px]">
              <ReactECharts
                option={xrayOption}
                style={{ width: '100%', height: '100%' }}
                opts={{ renderer: 'canvas' }}
                onChartReady={onChartReadyXray}
              />
            </div>
          </Card>

          <Card title="Solar Wind Speed" subtitle="km/s">
            <div className="h-[220px] md:h-[260px]">
              <ReactECharts
                option={windOption}
                style={{ width: '100%', height: '100%' }}
                opts={{ renderer: 'canvas' }}
                onChartReady={onChartReadyOther}
              />
            </div>
          </Card>

          <Card title="IMF Bz (GSM)" subtitle="nT">
            <div className="h-[220px] md:h-[260px]">
              <ReactECharts
                option={bzOption}
                style={{ width: '100%', height: '100%' }}
                opts={{ renderer: 'canvas' }}
                onChartReady={onChartReadyOther}
              />
            </div>
          </Card>

          <Card title="Planetary Kp Index" subtitle="0–9">
            <div className="h-[220px] md:h-[260px]">
              <ReactECharts
                option={kpOption}
                style={{ width: '100%', height: '100%' }}
                opts={{ renderer: 'canvas' }}
                onChartReady={onChartReadyOther}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* 用語解説: Mobileではテキストサイズ調整 */}
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
