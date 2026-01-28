import { useMemo } from 'react';
// ★ EconomyApiResponse を utils から確実にインポートする
import type { EconomyApiResponse, SeriesData } from './utils';

export function useWorldEconomy(data: EconomyApiResponse | null) {
  const chartData = useMemo(() => {
    if (!data) return { stockSeries: [], gdpSeries: [], inflationSeries: [] };

    // --- Staging環境用デバッグログ ---
    const firstCountry = Object.keys(data)[0];
    if (firstCountry) {
      const countryObj = data[firstCountry];
      const keys = Object.keys(countryObj);
      console.group('📊 World Economy Data Debug (Staging)');
      console.log('Sample Country:', firstCountry);
      console.log('Available Keys in JSON:', keys);
      console.log('Has INFLATION?:', keys.includes('INFLATION'));
      console.log('Has CPI?:', keys.includes('CPI'));
      console.log('Raw Country Object:', countryObj);
      console.groupEnd();
    }

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
