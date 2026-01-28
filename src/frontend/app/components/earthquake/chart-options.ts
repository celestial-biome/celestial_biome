import type { BarSeriesOption, EChartsOption, ScatterSeriesOption } from 'echarts';
import type { StackedSeriesData } from './useEarthquakes';
import type { Earthquake } from './utils';

// --- Types ---

/**
 * マップ上の各震源データの型定義
 */
interface QuakeScatterData {
  name: string;
  value: [number, number, number]; // [lon, lat, mag]
  mag: number;
  depth: number;
  ts: number;
}

// --- Helpers ---

const baseTooltip = {
  backgroundColor: 'rgba(10,10,12,0.95)',
  borderColor: 'rgba(255,255,255,0.2)',
  textStyle: { color: '#fff', fontSize: 12 },
  extraCssText: 'backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.5);',
};

const getMarker = (color: string) =>
  `<span style="display:inline-block;margin-right:6px;border-radius:2px;width:10px;height:10px;background-color:${color};"></span>`;

// --- 1. 世界震源マップ ---
export const getMapOption = (data: Earthquake[]): EChartsOption => ({
  animation: false,
  backgroundColor: 'transparent',
  tooltip: {
    ...baseTooltip,
    formatter: (params: unknown) => {
      // ScatterSeries のデータ構造としてキャスト
      const p = params as { name: string; data: QuakeScatterData };
      const item = p.data;
      return `
        <div style="font-weight:bold; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:2px;">
          ${p.name}
        </div>
        <div style="font-size:11px; line-height:1.5;">
          <span style="color:#a1a1aa;">Magnitude:</span> <b>M${item.mag.toFixed(1)}</b><br/>
          <span style="color:#a1a1aa;">Depth:</span> <b>${item.depth}km</b><br/>
          <span style="color:#a1a1aa;">Time:</span> ${new Date(item.ts).toLocaleString()}
        </div>
      `;
    },
  },
  geo: {
    map: 'world',
    roam: true,
    label: { show: false },
    itemStyle: {
      areaColor: '#27272a',
      borderColor: '#52525b',
    },
    emphasis: {
      itemStyle: { areaColor: '#3f3f46' },
    },
  },
  series: [
    {
      name: 'Quakes',
      type: 'scatter',
      coordinateSystem: 'geo',
      data: data.map((d) => ({
        name: d.place,
        value: [d.longitude, d.latitude, d.magnitude],
        mag: d.magnitude,
        depth: d.depth,
        ts: d.timestamp,
      })),
      symbolSize: (val: unknown) => {
        const v = val as [number, number, number];
        return Math.max(3, v[2] ** 2.8 / 3);
      },
      itemStyle: {
        color: (params: unknown) => {
          const p = params as { data: QuakeScatterData };
          const m = p.data.mag;
          return m >= 6 ? '#ef4444' : m >= 4.5 ? '#f97316' : '#22d3ee';
        },
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.5)',
      },
    } as ScatterSeriesOption,
  ],
});

// --- 2. マグニチュード頻度 ---
export const getMagHistOption = (data: Earthquake[]): EChartsOption => {
  const bins = Array(8).fill(0);
  const labels = ['2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9+'];

  for (const d of data) {
    const idx = Math.min(Math.max(Math.floor(d.magnitude) - 2, 0), 7);
    bins[idx]++;
  }

  return {
    animation: false,
    tooltip: {
      trigger: 'axis',
      ...baseTooltip,
      axisPointer: { type: 'shadow' },
    },
    grid: { top: 20, bottom: 30, left: 40, right: 20 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: '#a1a1aa' },
      axisLine: { lineStyle: { color: '#3f3f46' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#27272a' } },
      axisLabel: { color: '#a1a1aa' },
    },
    series: [
      {
        type: 'bar',
        data: bins,
        itemStyle: { color: '#38bdf8', borderRadius: [4, 4, 0, 0] },
      } as BarSeriesOption,
    ],
  };
};

// --- 3. 深さ vs マグニチュード ---
export const getDepthScatterOption = (data: Earthquake[]): EChartsOption => ({
  animation: false,
  tooltip: {
    ...baseTooltip,
    formatter: (params: unknown) => {
      // data: [depth, mag, place, timestamp]
      const p = params as { value: [number, number, string, number] };
      const [depth, mag, place, timestamp] = p.value;
      const time = new Date(timestamp).toLocaleString();

      return `
        <div style="font-weight:bold; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:2px;">
           M${mag}
        </div>
        <div style="font-size:10px; color:#a1a1aa; margin-bottom:4px;">
           ${time}
        </div>
        Depth: ${depth}km<br/>
        <span style="font-size:10px; color:#ccc;">${place}</span>
      `;
    },
  },
  grid: { top: 20, bottom: 30, left: 40, right: 20 },
  xAxis: {
    type: 'value',
    name: 'Depth(km)',
    nameLocation: 'middle',
    nameGap: 25,
    splitLine: { show: false },
    axisLabel: { color: '#a1a1aa' },
    axisLine: { lineStyle: { color: '#3f3f46' } },
  },
  yAxis: {
    type: 'value',
    name: 'Mag',
    min: 2,
    splitLine: { lineStyle: { color: '#27272a' } },
    axisLabel: { color: '#a1a1aa' },
  },
  visualMap: {
    show: false,
    type: 'continuous',
    dimension: 1,
    min: 2.5,
    max: 7,
    inRange: {
      color: [
        '#30123b',
        '#466be3',
        '#28bbec',
        '#32f298',
        '#d2e21b',
        '#fe9b2d',
        '#ea371a',
      ].reverse(),
    },
    calculable: true,
  },
  series: [
    {
      type: 'scatter',
      symbolSize: 6,
      data: data.map((d) => [d.depth, d.magnitude, d.place, d.timestamp]),
    } as ScatterSeriesOption,
  ],
});

// --- 4. 地域別ランキング ---
export const getRegionRankOption = (rankingData: [string, number][]): EChartsOption => ({
  animation: false,
  tooltip: {
    trigger: 'axis',
    ...baseTooltip,
    axisPointer: { type: 'shadow' },
  },
  grid: { top: 10, bottom: 20, left: 100, right: 30 },
  xAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#27272a' } },
    axisLabel: { show: false },
  },
  yAxis: {
    type: 'category',
    data: rankingData.map((d) => d[0]).reverse(),
    axisLabel: {
      color: '#e4e4e7',
      width: 90,
      overflow: 'truncate',
      interval: 0,
    },
    axisLine: { show: false },
    axisTick: { show: false },
  },
  series: [
    {
      type: 'bar',
      data: rankingData.map((d) => d[1]).reverse(),
      itemStyle: {
        color: '#818cf8',
        borderRadius: [0, 4, 4, 0] as [number, number, number, number],
      },
      label: {
        show: true,
        position: 'right',
        color: '#fff',
        formatter: '{c}',
      },
    } as BarSeriesOption,
  ],
});

// --- 5. 時系列推移 ---
export const getTimeSeriesOption = (stackedData: StackedSeriesData): EChartsOption => ({
  animation: false,
  tooltip: {
    trigger: 'item',
    ...baseTooltip,
    formatter: (params: unknown) => {
      const p = params as { color: string; seriesName: string; value: number; name: string };
      const { color, seriesName, value, name: date } = p;

      return `
        <div style="min-width: 120px;">
          <div style="font-size:10px; color:#a1a1aa; margin-bottom:4px;">${date}</div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
             ${getMarker(color)}
             <span style="font-size:13px; font-weight:bold; color:#fff; max-width:180px; white-space:normal; line-height:1.2;">
               ${seriesName}
             </span>
          </div>
          <div style="background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#a1a1aa;">Events:</span>
            <span style="font-size:14px; font-weight:bold; font-family:monospace; color:#fff;">${value}</span>
          </div>
        </div>
      `;
    },
  },
  legend: {
    type: 'scroll',
    top: 0,
    textStyle: { color: '#a1a1aa' },
    pageIconColor: '#fff',
    pageTextStyle: { color: '#fff' },
  },
  grid: { top: 40, bottom: 30, left: 40, right: 20 },
  xAxis: {
    type: 'category',
    data: stackedData.dates,
    axisLabel: { color: '#a1a1aa' },
    axisTick: { alignWithLabel: true },
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#27272a' } },
    axisLabel: { color: '#a1a1aa' },
  },
  color: [
    '#5470c6',
    '#91cc75',
    '#fac858',
    '#ee6666',
    '#73c0de',
    '#3ba272',
    '#fc8452',
    '#9a60b4',
    '#ea7ccc',
    '#2f4554',
    '#61a0a8',
    '#d48265',
    '#91c7ae',
    '#749f83',
    '#ca8622',
    '#bda29a',
    '#6e7074',
  ],
  series: stackedData.series as BarSeriesOption[],
});
