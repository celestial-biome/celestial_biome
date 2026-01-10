import { useMemo } from 'react';
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
      blurScope: 'coordinateSystem';
    };
    data: number[];
  }[];
};

// 引数でデータを受け取る
export function useEarthquakes(initialData: Earthquake[] | null) {
  // サーバーからデータが渡されなかった場合は空配列
  const data = initialData || [];

  // サーバー側で取得済みなのでローディングは完了扱いとする
  // (必要であれば null チェックで分岐も可能)
  const loading = false;

  // 1. Top 5 (マグニチュード順)
  const topQuakes = useMemo(() => {
    return [...data].sort((a, b) => b.magnitude - a.magnitude).slice(0, 5);
  }, [data]);

  // 2. 地域別の積み上げグラフ用データ (Daily Activity)
  const timeSeriesData = useMemo((): StackedSeriesData => {
    if (data.length === 0) return { dates: [], series: [] };

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

    const sortedDates = Array.from(dateSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );
    const sortedRegions = Array.from(regionSet).sort();

    const series = sortedRegions.map((region) => {
      const regionData = sortedDates.map((date) => {
        return counts[date]?.[region] || 0;
      });

      return {
        name: region,
        type: 'bar' as const,
        stack: 'total' as const,
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
