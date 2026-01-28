import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Types ---

export type EconomyDataPoint = {
  date: string;
  value: number;
};

export type SeriesData = {
  name: string;
  data: EconomyDataPoint[];
};

// APIレスポンスの型
export type EconomyApiResponse = {
  [countryCode: string]: {
    STOCK?: EconomyDataPoint[];
    GDP?: EconomyDataPoint[];
    INFLATION?: EconomyDataPoint[];
    CPI?: EconomyDataPoint[];
  };
};

// --- Utilities ---

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 国別カラー定義
export const COUNTRY_COLORS: Record<string, string> = {
  USA: '#60a5fa', // Blue (Tailwind blue-400)
  JPN: '#38bdf8', // Light Blue (sky-400)
  CHN: '#f472b6', // Pink (pink-400)
  IND: '#ef4444', // Red (red-500)
  DEU: '#4ade80', // Green (green-400)
  GBR: '#2dd4bf', // Teal (teal-400)
  FRA: '#facc15', // Yellow (yellow-400)
  CAN: '#fb923c', // Orange (orange-400)
  AUS: '#a78bfa', // Purple (violet-400)
};

// 凡例の表示順序
export const COUNTRY_ORDER = ['USA', 'JPN', 'CHN', 'IND', 'DEU', 'GBR', 'FRA', 'CAN', 'AUS'];

// --- Constants ---

export const METRICS_INFO = [
  {
    label: 'Stock Index (Normalized)',
    color: 'text-sky-400',
    description:
      '主要株価指数のパフォーマンス比較です。2000年（またはデータ開始時点）を基準値 100 として正規化しており、各国の成長率を相対的に比較できます。',
  },
  {
    label: 'Real GDP',
    color: 'text-emerald-400',
    description:
      '実質国内総生産 (Constant 2015 US$) です。インフレの影響を除いた経済規模の推移を表します。国の経済的な豊かさを測る最も基本的な指標です。',
  },
  {
    label: 'Inflation Rate (CPI)',
    color: 'text-rose-400',
    description:
      '消費者物価指数の対前年上昇率です。プラスであればインフレ（物価上昇）、マイナスであればデフレ（物価下落）を示唆し、中央銀行の政策決定に大きく影響します。',
  },
  {
    label: 'Data Source',
    color: 'text-indigo-400',
    description:
      '株価データは Yahoo Finance、GDPおよびインフレ率は World Bank (世界銀行) の Open Data API から取得・統合されています。',
  },
];
