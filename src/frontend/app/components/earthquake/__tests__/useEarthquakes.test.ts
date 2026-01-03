import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEarthquakes } from '../useEarthquakes';

// fetchのグローバルモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockApiData = [
  {
    usgs_id: '1',
    timestamp: '2025-01-01T10:00:00.000Z', // 1/1
    magnitude: 6.0,
    place: 'Near Coast, Japan',
    depth: 10,
    latitude: 35,
    longitude: 139,
  },
  {
    usgs_id: '2',
    timestamp: '2025-01-01T20:00:00.000Z', // 1/1 (同日)
    magnitude: 5.0,
    place: 'Tokyo, Japan',
    depth: 20,
    latitude: 36,
    longitude: 140,
  },
  {
    usgs_id: '3',
    timestamp: '2025-01-02T10:00:00.000Z', // 1/2 (別日)
    magnitude: 7.0,
    place: 'California, USA',
    depth: 5,
    latitude: 34,
    longitude: -118,
  },
];

describe('useEarthquakes Hook', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch data and set loading state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiData,
    });

    const { result } = renderHook(() => useEarthquakes());

    // 初期状態
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);

    // データ取得後
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data).toEqual(mockApiData);
  });

  it('should calculate top 5 quakes sorted by magnitude', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiData,
    });

    const { result } = renderHook(() => useEarthquakes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // M7.0 -> M6.0 -> M5.0 の順になるはず
    const top = result.current.topQuakes;
    expect(top[0].magnitude).toBe(7.0);
    expect(top[1].magnitude).toBe(6.0);
    expect(top[2].magnitude).toBe(5.0);
  });

  it('should generate timeSeriesData correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiData,
    });

    const { result } = renderHook(() => useEarthquakes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const { dates, series } = result.current.timeSeriesData;

    // 日付がソートされているか
    // ローカル時間依存があるため、日付の文字列は環境によるが、2日分あることを確認
    expect(dates).toHaveLength(2);

    // 地域ごとのシリーズ
    // "Japan" と "USA" (placeのカンマ区切り末尾)
    expect(series.map((s) => s.name)).toEqual(expect.arrayContaining(['Japan', 'USA']));

    const japanSeries = series.find((s) => s.name === 'Japan');
    const usaSeries = series.find((s) => s.name === 'USA');

    // Japan: 1/1に2回, 1/2に0回 (あるいは日付順序による)
    // USA: 1/1に0回, 1/2に1回
    // 合計数でチェック
    const totalJapan = japanSeries?.data.reduce((a, b) => a + b, 0);
    const totalUsa = usaSeries?.data.reduce((a, b) => a + b, 0);

    expect(totalJapan).toBe(2);
    expect(totalUsa).toBe(1);
  });

  it('should generate regionRanking correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiData,
    });

    const { result } = renderHook(() => useEarthquakes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const ranking = result.current.regionRanking;
    // Japan: 2, USA: 1
    expect(ranking).toEqual([
      ['Japan', 2],
      ['USA', 1],
    ]);
  });

  it('should handle fetch error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useEarthquakes());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
