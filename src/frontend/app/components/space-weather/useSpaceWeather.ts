import { useEffect, useMemo, useState } from 'react';
import { findLastFinite, flareClass, type WeatherData, type XY } from './utils';

// 引数でデータを受け取る形に変更
export function useSpaceWeather(initialData: WeatherData[] | null) {
  // サーバーから渡されたデータを使用 (データがない場合は空配列)
  const data = initialData || [];

  // 現在時刻更新
  // Hydration Error回避のため、サーバーと不一致になる初期値(Date.now())は避け、nullで初期化
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    // クライアントマウント直後に時刻をセット
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // チャート用データ整形
  const seriesData = useMemo(() => {
    // データがない場合は空の結果を返す
    if (!data.length) {
      return { xray: [], wind: [], bz: [], kp: [] };
    }

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

  // 最新値とステータス
  const lastXray = useMemo(() => findLastFinite(data, (d) => d.xray_flux), [data]);
  const lastWind = useMemo(() => findLastFinite(data, (d) => d.solar_wind_speed), [data]);
  const lastBz = useMemo(() => findLastFinite(data, (d) => d.imf_bz), [data]);
  const lastKp = useMemo(() => findLastFinite(data, (d) => d.kp_index), [data]);

  const flare = flareClass(lastXray?.value);

  return {
    data,
    // データ取得状況のフラグ (nullなら取得失敗とみなす)
    hasData: !!initialData,
    nowMs,
    seriesData,
    lastXray,
    lastWind,
    lastBz,
    lastKp,
    flare,
  };
}
