import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useEarthquakes } from '../useEarthquakes';
import type { Earthquake } from '../utils';

// テスト用モックデータ
const mockEarthquakes: Earthquake[] = [
  {
    usgs_id: 'us1001',
    place: '10km SSE of Tokyo, Japan',
    magnitude: 5.5,
    timestamp: '2025-01-01T10:00:00Z',
    depth: 35,
    latitude: 35.6,
    longitude: 139.6,
    url: 'http://example.com/1',
  },
  {
    usgs_id: 'us1002',
    place: '20km E of Taipei, Taiwan',
    magnitude: 6.2, // これが最大
    timestamp: '2025-01-01T12:00:00Z',
    depth: 10,
    latitude: 25.0,
    longitude: 121.5,
    url: 'http://example.com/2',
  },
  {
    usgs_id: 'us1003',
    // 修正: カンマを追加して "Japan" として集計されるように変更
    place: 'Near Coast, Japan',
    magnitude: 4.0,
    timestamp: '2025-01-02T09:00:00Z',
    depth: 50,
    latitude: 36.0,
    longitude: 140.0,
    url: 'http://example.com/3',
  },
];

describe('useEarthquakes Hook', () => {
  it('初期データがnullの場合、空の状態を返すこと', () => {
    const { result } = renderHook(() => useEarthquakes(null));

    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.topQuakes).toEqual([]);
    expect(result.current.regionRanking).toEqual([]);
    expect(result.current.timeSeriesData.dates).toEqual([]);
  });

  it('データが渡された場合、正しく加工して値を返すこと', () => {
    const { result } = renderHook(() => useEarthquakes(mockEarthquakes));

    // データがそのままセットされているか
    expect(result.current.data).toHaveLength(3);
    expect(result.current.loading).toBe(false);

    // 1. Top 5 (マグニチュード順) の検証
    const top = result.current.topQuakes;
    expect(top).toHaveLength(3);
    expect(top[0].usgs_id).toBe('us1002'); // M6.2が先頭
    expect(top[0].magnitude).toBe(6.2);
    expect(top[2].magnitude).toBe(4.0);

    // 2. 地域別ランキング (Region Ranking) の検証
    // 地域名はカンマ区切りの最後 ("Japan", "Taiwan", "Japan") -> Japan: 2, Taiwan: 1
    const ranking = result.current.regionRanking;

    // 修正により Japan が2つ分カウントされ、要素数は2になるはず
    expect(ranking).toHaveLength(2);

    // Japanが2回出現しているのでランキング1位
    expect(ranking[0]).toEqual(['Japan', 2]);
    expect(ranking[1]).toEqual(['Taiwan', 1]);

    // 3. 時系列データ (Time Series) の検証
    const tsData = result.current.timeSeriesData;
    // 日付は 1/1 と 1/2 の2つ
    expect(tsData.dates).toHaveLength(2);
    // Seriesには Japan と Taiwan があるはず
    expect(tsData.series).toHaveLength(2);

    // データの中身を簡易チェック (Japanのデータ)
    const japanSeries = tsData.series.find((s) => s.name === 'Japan');
    expect(japanSeries).toBeDefined();
    // 1/1に1回, 1/2に1回 (合計2)
    expect(japanSeries?.data.reduce((a, b) => a + b, 0)).toBe(2);
  });
});
