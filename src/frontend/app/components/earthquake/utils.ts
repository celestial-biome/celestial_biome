import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Types ---
export type Earthquake = {
  id?: number;
  usgs_id: string;
  timestamp: string;
  magnitude: number;
  place: string;
  depth: number;
  latitude: number;
  longitude: number;
};

// --- Utilities ---

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTsShort(ts: string | number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ★ 以下を追加: Metrics Reference の定義
export const METRICS_INFO = [
  {
    label: 'Magnitude (M)',
    color: 'text-sky-400', // Cyan/Blue系
    description:
      '放出されるエネルギーの大きさを表す対数スケールです。数値が 1 増える（例: 5.0 から 6.0）と、エネルギーは約 32 倍になります。',
  },
  {
    label: 'Hypocenter Depth',
    color: 'text-rose-400', // Red/Orange系
    description:
      '地震の破壊が始まった深さを指します。一般的に、震源が浅い（70km未満）地震ほど、地表での揺れが激しくなり被害が大きくなる傾向があります。',
  },
  {
    label: 'USGS Feed',
    color: 'text-emerald-400', // Green系
    description:
      '米国地質調査所 (USGS) から取得したリアルタイムデータです。過去 7 日間に世界中で観測されたマグニチュード 2.5 以上の地震を含みます。',
  },
  {
    label: 'Frequency',
    color: 'text-indigo-400', // Purple/Indigo系
    description:
      '地域ごとの日別地震発生回数です。特定の地域でグラフが高くなっている場合、余震活動や群発地震が発生している可能性があります。',
  },
];
