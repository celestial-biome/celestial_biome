import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpaceWeather } from '../useSpaceWeather';

// モックデータ
const mockApiResponse = [
  {
    timestamp: '2025-01-01T00:00:00Z',
    xray_flux: 1e-5,
    solar_wind_speed: 400,
    imf_bz: -2,
    kp_index: 3,
  },
  {
    timestamp: '2025-01-01T01:00:00Z',
    xray_flux: 5e-5,
    solar_wind_speed: 450,
    imf_bz: 1,
    kp_index: 4,
  },
];

describe('useSpaceWeather Hook', () => {
  beforeEach(() => {
    // fetchのモック化
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('初期状態はloadingがtrueであること', () => {
    // 未解決のPromiseを返すことでロード中を再現
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useSpaceWeather());
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  it('データ取得に成功した場合、正しく整形して返すこと', async () => {
    // 成功レスポンスのモック
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const { result } = renderHook(() => useSpaceWeather());

    // loadingがfalseになるまで待機
    await waitFor(() => expect(result.current.loading).toBe(false));

    // データの中身を検証
    expect(result.current.data).toHaveLength(2);

    // seriesData（グラフ用データ）が整形されているか
    expect(result.current.seriesData.xray).toHaveLength(2);
    expect(result.current.seriesData.xray[0][1]).toBe(1e-5); // 最初のデータのXray値

    // 最新値(lastXray)が正しく取得できているか（配列の最後の要素）
    expect(result.current.lastXray?.value).toBe(5e-5);

    // フレアクラスの判定
    expect(result.current.flare.label).toBe('M'); // 5e-5 は Mクラス
  });

  it('APIエラー時にエラーログを出力し、ローディングを終了すること', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useSpaceWeather());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(consoleSpy).toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });
});
