import { useEffect, useMemo, useState } from 'react';
import type { Earthquake } from './utils';

// グラフ用にデータを構造化する型
export type StackedSeriesData = {
  dates: string[];
  series: {
    name: string;
    type: 'bar';
    stack: 'total';
    emphasis: {
      focus: 'series';
      blurScope: 'coordinateSystem'; // 重要: 他の要素をぼかす
    };
    data: number[];
  }[];
};

export function useEarthquakes() {
  const [data, setData] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(true);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/v1/geology/earthquakes/`);
        if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
        const jsonData = (await res.json()) as Earthquake[];
        setData(jsonData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 1. Top 5 (マグニチュード順)
  const topQuakes = useMemo(() => {
    return [...data].sort((a, b) => b.magnitude - a.magnitude).slice(0, 5);
  }, [data]);

  // 2. 地域別の積み上げグラフ用データ (Daily Activity)
  const timeSeriesData = useMemo((): StackedSeriesData => {
    if (data.length === 0) return { dates: [], series: [] };

    // 日付と地域のセットアップ
    const dateSet = new Set<string>();
    const regionSet = new Set<string>();
    const counts: Record<string, Record<string, number>> = {};

    for (const d of data) {
      const dateKey = new Date(d.timestamp).toLocaleDateString();

      // 地域名抽出
      const parts = d.place.split(',');
      const region = parts.length > 1 ? parts[parts.length - 1].trim() : d.place;

      dateSet.add(dateKey);
      regionSet.add(region);

      if (!counts[dateKey]) counts[dateKey] = {};
      counts[dateKey][region] = (counts[dateKey][region] || 0) + 1;
    }

    // ソート
    const sortedDates = Array.from(dateSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );
    const sortedRegions = Array.from(regionSet).sort();

    // ECharts Series 形式に変換
    const series = sortedRegions.map((region) => {
      const regionData = sortedDates.map((date) => {
        return counts[date]?.[region] || 0;
      });

      return {
        name: region,
        type: 'bar' as const,
        stack: 'total' as const,
        // ★ ハイライト効果の設定
        emphasis: {
          focus: 'series' as const,
          blurScope: 'coordinateSystem' as const,
        },
        data: regionData,
      };
    });

    return { dates: sortedDates, series };
  }, [data]);

  // 3. 地域別ランキング (Top 10)
  const regionRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of data) {
      const parts = d.place.split(',');
      const region = parts.length > 1 ? parts[parts.length - 1].trim() : d.place;
      counts[region] = (counts[region] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [data]);

  return {
    data,
    loading,
    topQuakes,
    timeSeriesData,
    regionRanking,
  };
}
