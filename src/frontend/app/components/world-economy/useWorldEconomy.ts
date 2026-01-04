import { useEffect, useMemo, useState } from 'react';
import type { EconomyApiResponse, SeriesData } from './utils';

export function useWorldEconomy() {
  const [data, setData] = useState<EconomyApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        // APIエンドポイントの変更を反映
        const res = await fetch(`${apiUrl}/api/v1/economy/world-economy/`);

        if (!res.ok) throw new Error(`Failed to fetch data: ${res.statusText}`);

        const jsonData = (await res.json()) as EconomyApiResponse;
        setData(jsonData);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // チャート用データへの変換 (メモ化)
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
      if (countryData.INFLATION) {
        inflationSeries.push({ name: country, data: countryData.INFLATION });
      }
    }

    return { stockSeries, gdpSeries, inflationSeries };
  }, [data]);

  return {
    data,
    loading,
    error,
    ...chartData,
  };
}
