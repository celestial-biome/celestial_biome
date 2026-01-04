import type { EChartsOption } from 'echarts';
import type { SeriesData } from './utils';
import { COUNTRY_COLORS, COUNTRY_ORDER } from './utils'; // 追加

// --- Helpers ---

const baseTooltip = {
  backgroundColor: 'rgba(10,10,12,0.95)',
  borderColor: 'rgba(255,255,255,0.2)',
  textStyle: { color: '#fff', fontSize: 12 },
  extraCssText: 'backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.5);',
};

// Streamlit風レイアウト: 凡例を右に出すため、右側に余白(padding)を設ける
const baseGrid = { left: '3%', right: '120px', bottom: '5%', containLabel: true };
const baseLegend = {
  type: 'scroll',
  orient: 'vertical', // 縦並び
  right: 0, // 右端
  top: 'middle', // 中央揃え
  textStyle: { color: '#a1a1aa' },
  pageIconColor: '#fff',
  pageTextStyle: { color: '#fff' },
  data: COUNTRY_ORDER, // 表示順序を固定
};

// データシリーズに色と順序を適用するヘルパー
const formatSeries = (series: SeriesData[]) => {
  // 定義順に並べ替え
  const sortedSeries = [...series].sort(
    (a, b) => COUNTRY_ORDER.indexOf(a.name) - COUNTRY_ORDER.indexOf(b.name),
  );

  return sortedSeries.map((s) => ({
    name: s.name,
    itemStyle: { color: COUNTRY_COLORS[s.name] || '#ccc' }, // カラー適用
    lineStyle: { width: 2 },
    ...s,
  }));
};

// --- 1. 株価パフォーマンス (正規化) ---
export const getStockOption = (series: SeriesData[]): EChartsOption => {
  // 正規化処理
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
      valueFormatter: (value: number) => value.toFixed(1),
    },
    legend: baseLegend, // 右側凡例
    grid: baseGrid,
    xAxis: {
      type: 'time',
      boundaryGap: false,
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
    // 色と順序を適用
    series: formatSeries(normalizedSeries),
  };
};

// --- 2. インフレ率 ---
export const getInflationOption = (series: SeriesData[]): EChartsOption => {
  const formattedData = series.map((s) => ({
    name: s.name,
    type: 'line',
    showSymbol: true, // ドットを表示
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
      valueFormatter: (value: number) => `${value.toFixed(2)}%`,
    },
    legend: baseLegend,
    grid: baseGrid,
    xAxis: {
      type: 'time',
      boundaryGap: false,
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
      valueFormatter: (value: number) => `$${(value / 1e9).toFixed(0)} B`,
    },
    legend: baseLegend,
    grid: baseGrid,
    xAxis: {
      type: 'time',
      boundaryGap: false,
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
