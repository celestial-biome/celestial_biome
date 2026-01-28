import { useMemo } from 'react';
import type { EconomyApiResponse, SeriesData } from './utils';

// 引数でデータを受け取る形に変更
export function useWorldEconomy(data: EconomyApiResponse | null) {
  // チャート用データへの変換 (メモ化)
  const chartData = useMemo(() => {
    // データがない場合のデフォルト値を返す
    if (!data) return { stockSeries: [], gdpSeries: [], inflationSeries: [] };

    const stockSeries: SeriesData[] = [];
    const gdpSeries: SeriesData[] = [];
    const inflationSeries: SeriesData[] = [];

    const countries = Object.keys(data);

    for (const country of countries) {
      const countryData = data[country];

      // 株価 (STOCK)
      if (countryData.STOCK) {
        stockSeries.push({ name: country, data: countryData.STOCK });
      }

      // GDP
      if (countryData.GDP) {
        gdpSeries.push({ name: country, data: countryData.GDP });
      }

      // インフレ率 (INFLATION または CPI)
      const inflationData = countryData.INFLATION || countryData.CPI;
      if (inflationData) {
        inflationSeries.push({ name: country, data: inflationData });
      }
    }

    return { stockSeries, gdpSeries, inflationSeries };
  }, [data]);

  return {
    data,
    ...chartData,
  };
}
