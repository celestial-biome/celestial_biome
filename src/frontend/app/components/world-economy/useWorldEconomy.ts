import { useMemo } from 'react';
// ★ EconomyApiResponse を utils から確実にインポートする
import type { EconomyApiResponse, SeriesData } from './utils';

export function useWorldEconomy(data: EconomyApiResponse | null) {
  const chartData = useMemo(() => {
    if (!data) return { stockSeries: [], gdpSeries: [], inflationSeries: [] };

    const stockSeries: SeriesData[] = [];
    const gdpSeries: SeriesData[] = [];
    const inflationSeries: SeriesData[] = [];

    const countries = Object.keys(data);
    for (const country of countries) {
      const countryData = data[country];

      if (countryData.STOCK) {
        stockSeries.push({ name: country, data: countryData.STOCK });
      }
      if (countryData.GDP) {
        gdpSeries.push({ name: country, data: countryData.GDP });
      }

      // 現状は INFLATION キーのみを見ている
      if (countryData.INFLATION) {
        inflationSeries.push({ name: country, data: countryData.INFLATION });
      }
    }

    return { stockSeries, gdpSeries, inflationSeries };
  }, [data]);

  return {
    data,
    ...chartData,
  };
}
