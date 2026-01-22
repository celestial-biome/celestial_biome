// 型定義
export type WeatherData = {
  timestamp: string;
  xray_flux?: number;
  solar_wind_speed?: number;
  imf_bz?: number;
  kp_index?: number;
};

export type XY = [number, number | null];

// 定数データ
export const METRICS_INFO = [
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

export const XRAY_BANDS = [
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

// ユーティリティ関数
export function cn(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ');
}

export function formatTs(ts: number, timeZone: string) {
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

export function formatTsShort(ts: number) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  }).format(new Date(ts));
}

export function flareClass(x: number | null | undefined) {
  if (x == null || Number.isNaN(x)) return { label: '—', tone: 'text-zinc-300' };
  if (x >= 1e-4) return { label: 'X', tone: 'text-rose-300' };
  if (x >= 1e-5) return { label: 'M', tone: 'text-orange-300' };
  if (x >= 1e-6) return { label: 'C', tone: 'text-amber-300' };
  if (x >= 1e-7) return { label: 'B', tone: 'text-emerald-300' };
  return { label: 'A', tone: 'text-sky-300' };
}

export function findLastFinite<T>(arr: T[], pick: (t: T) => number | undefined | null) {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = pick(arr[i]);
    if (v != null && Number.isFinite(v)) return { value: v, item: arr[i] };
  }
  return null;
}

export function nearestY(points: XY[], x: number): number | null {
  if (!points.length) return null;
  let lo = 0;
  let hi = points.length - 1;

  if (x <= points[0]?.[0]) return points[0]?.[1];
  if (x >= points[hi]?.[0]) return points[hi]?.[1];

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = points[mid]?.[0];
    if (t === x) return points[mid]?.[1];
    if (t < x) lo = mid + 1;
    else hi = mid - 1;
  }

  const left = Math.max(0, hi);
  const right = Math.min(points.length - 1, lo);
  const dl = Math.abs(points[left]?.[0] - x);
  const dr = Math.abs(points[right]?.[0] - x);
  return dl <= dr ? points[left]?.[1] : points[right]?.[1];
}

export function bandIdFromXray(v: number | null): (typeof XRAY_BANDS)[number]['id'] | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (v >= 1e-4) return 'X';
  if (v >= 1e-5) return 'M';
  if (v >= 1e-6) return 'C';
  if (v >= 1e-7) return 'B';
  if (v >= 1e-8) return 'A';
  return null;
}
