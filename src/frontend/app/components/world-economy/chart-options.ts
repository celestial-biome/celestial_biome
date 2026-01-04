import type { EChartsOption } from 'echarts';
import type { SeriesData } from './utils';
import { COUNTRY_COLORS, COUNTRY_ORDER } from './utils';

// --- Helpers ---

const baseTooltip = {
  backgroundColor: 'rgba(10,10,12,0.95)',
  borderColor: 'rgba(255,255,255,0.2)',
  textStyle: { color: '#fff', fontSize: 12 },
  extraCssText: 'backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.5);',
};

const baseGrid = { left: '3%', right: '120px', bottom: '5%', containLabel: true };

const baseLegend: EChartsOption['legend'] = {
  type: 'scroll',
  orient: 'vertical',
  right: 0,
  top: 'middle',
  textStyle: { color: '#a1a1aa' },
  pageIconColor: '#fff',
  pageTextStyle: { color: '#fff' },
  data: COUNTRY_ORDER,
};

// データシリーズに色と順序を適用するヘルパー
// biome-ignore lint/suspicious/noExplicitAny: ECharts用オブジェクト(変換後)も受け取れるようにanyを許容
const formatSeries = (series: any[]) => {
  // 定義順に並べ替え
  const sortedSeries = [...series].sort(
    (a, b) => COUNTRY_ORDER.indexOf(a.name) - COUNTRY_ORDER.indexOf(b.name),
  );

  return sortedSeries.map((s) => ({
    ...s,
    itemStyle: { color: COUNTRY_COLORS[s.name] || '#ccc' },
    lineStyle: { width: 2 },
  }));
};

// --- 1. 株価パフォーマンス (正規化) ---
export const getStockOption = (series: SeriesData[]): EChartsOption => {
  const normalizedSeries = series.map((s) => {
    let data = s.data;
    if (data.length > 0) {
      const firstVal = data[0].value;
      if (firstVal !== 0) {
        data = data.map((d) => ({
          ...d,
          value: (d.value / firstVal) * 100,
        }));
      }
    }
    return {
      name: s.name,
      type: 'line',
      showSymbol: false,
      smooth: true,
      data: data.map((d) => [d.date, d.value]),
      emphasis: { focus: 'series' },
    };
  });

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      ...baseTooltip,
      // biome-ignore lint/suspicious/noExplicitAny: ECharts型定義回避
      valueFormatter: (value: any) => (value as number)?.toFixed(1),
    },
    legend: baseLegend,
    grid: baseGrid,
    xAxis: {
      type: 'time',
      boundaryGap: ['0%', '0%'],
      axisLabel: { color: '#a1a1aa' },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'Index (Start=100)',
      scale: true,
      axisLabel: { color: '#a1a1aa' },
      splitLine: { lineStyle: { color: '#27272a' } },
    },
    series: formatSeries(normalizedSeries),
  };
};

// --- 2. インフレ率 ---
export const getInflationOption = (series: SeriesData[]): EChartsOption => {
  const formattedData = series.map((s) => ({
    name: s.name,
    type: 'line',
    showSymbol: true,
    symbolSize: 6,
    smooth: true,
    data: s.data.map((d) => [d.date, d.value]),
    emphasis: { focus: 'series' },
  }));

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      ...baseTooltip,
      // biome-ignore lint/suspicious/noExplicitAny: ECharts型定義回避
      valueFormatter: (value: any) => `${(value as number)?.toFixed(2)}%`,
    },
    legend: baseLegend,
    grid: baseGrid,
    xAxis: {
      type: 'time',
      boundaryGap: ['0%', '0%'],
      axisLabel: { color: '#a1a1aa' },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'Rate (%)',
      scale: true,
      axisLabel: { color: '#a1a1aa' },
      splitLine: { lineStyle: { color: '#27272a' } },
    },
    series: formatSeries(formattedData),
  };
};

// --- 3. GDP推移 ---
export const getGdpOption = (series: SeriesData[]): EChartsOption => {
  const formattedData = series.map((s) => ({
    name: s.name,
    type: 'line',
    showSymbol: true,
    symbolSize: 6,
    data: s.data.map((d) => [d.date, d.value]),
    emphasis: { focus: 'series' },
  }));

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      ...baseTooltip,
      // biome-ignore lint/suspicious/noExplicitAny: ECharts型定義回避
      valueFormatter: (value: any) => `$${((value as number) / 1e9)?.toFixed(0)} B`,
    },
    legend: baseLegend,
    grid: baseGrid,
    xAxis: {
      type: 'time',
      boundaryGap: ['0%', '0%'],
      axisLabel: { color: '#a1a1aa' },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'US$ (Billions)',
      nameGap: 30,
      axisLabel: {
        color: '#a1a1aa',
        formatter: (value: number) => `${value / 1e9}B`,
      },
      splitLine: { lineStyle: { color: '#27272a' } },
    },
    series: formatSeries(formattedData),
  };
};
