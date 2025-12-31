import type { EChartsOption } from 'echarts';
import { formatTsShort, type XY } from './utils';

// --- Helpers ---
function baseTooltip() {
  return {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      label: { backgroundColor: 'rgba(0,0,0,0.65)' },
      lineStyle: { color: 'rgba(255,255,255,0.18)' },
      crossStyle: { color: 'rgba(255,255,255,0.18)' },
    },
    backgroundColor: 'rgba(10,10,12,0.85)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    textStyle: { color: 'rgba(255,255,255,0.92)', fontSize: 12 },
    extraCssText:
      'backdrop-filter: blur(8px); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);',
    confine: true,
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
          fontSize: 10,
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

// --- Option Generators ---
export const getXrayOption = (data: XY[]): EChartsOption => {
  const tooltip = baseTooltip();
  return {
    animation: false,
    grid: { left: 40, right: 20, top: 10, bottom: 14 },
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
    yAxis: {
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
          if (v === 1e-2) return '10⁻²';
          if (v === 1e-4) return '10⁻⁴';
          if (v === 1e-6) return '10⁻⁶';
          if (v === 1e-8) return '10⁻⁸';
          return '';
        },
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
    },
    dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    series: [
      {
        name: 'X-ray',
        type: 'line',
        showSymbol: false,
        data: data,
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
};

export const getWindOption = (data: XY[]): EChartsOption => {
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
        data: data,
        lineStyle: { width: 2, color: 'rgba(52,211,153,0.95)' },
        connectNulls: false,
        emphasis: { focus: 'series' },
      },
    ],
  };
};

export const getBzOption = (data: XY[]): EChartsOption => {
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
        data: data,
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
};

export const getKpOption = (data: XY[]): EChartsOption => {
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
        data: data,
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
};
