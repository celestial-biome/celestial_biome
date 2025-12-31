import { useEffect, useMemo, useState } from 'react';
import { findLastFinite, flareClass, type WeatherData, type XY } from './utils';

export function useSpaceWeather() {
  const [data, setData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);

  // 現在時刻更新
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // データ取得
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

  // チャート用データ整形
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

  // 最新値とステータス
  const lastXray = useMemo(() => findLastFinite(data, (d) => d.xray_flux), [data]);
  const lastWind = useMemo(() => findLastFinite(data, (d) => d.solar_wind_speed), [data]);
  const lastBz = useMemo(() => findLastFinite(data, (d) => d.imf_bz), [data]);
  const lastKp = useMemo(() => findLastFinite(data, (d) => d.kp_index), [data]);

  const flare = flareClass(lastXray?.value);

  return {
    data,
    loading,
    nowMs,
    seriesData,
    lastXray,
    lastWind,
    lastBz,
    lastKp,
    flare,
  };
}
