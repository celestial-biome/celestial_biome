import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpaceWeather } from '../useSpaceWeather';
import type { WeatherData } from '../utils';

// モックデータ
const mockApiResponse: WeatherData[] = [
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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('データがnullの場合、デフォルト値(空配列)と初期状態を返すこと', () => {
    // データなし(null)でフックを初期化
    const { result } = renderHook(() => useSpaceWeather(null));

    // データは空配列として扱われる
    expect(result.current.data).toEqual([]);
    expect(result.current.hasData).toBe(false);

    // チャートデータも空
    expect(result.current.seriesData.xray).toEqual([]);

    // Hydrationエラー回避ロジックの確認：
    // renderHookはマウントとエフェクト実行を行うため、
    // テスト時点ではすでにクライアントサイド処理が走り、nowMsは数値になっている
    expect(result.current.nowMs).not.toBeNull();
    expect(typeof result.current.nowMs).toBe('number');
  });

  it('データが渡された場合、正しく整形して値を返すこと', () => {
    // データありでフックを初期化
    const { result } = renderHook(() => useSpaceWeather(mockApiResponse));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.hasData).toBe(true);

    // seriesData（グラフ用データ）が正しく変換されているか
    expect(result.current.seriesData.xray).toHaveLength(2);
    expect(result.current.seriesData.xray[0][1]).toBe(1e-5); // 最初のデータのXray値

    // 最新値(lastXray)が正しく取得できているか（配列の最後の要素）
    expect(result.current.lastXray?.value).toBe(5e-5);

    // フレアクラスの判定
    expect(result.current.flare.label).toBe('M'); // 5e-5 は Mクラス
  });

  it('マウント後に現在時刻(nowMs)が更新されること', () => {
    const { result } = renderHook(() => useSpaceWeather(mockApiResponse));

    // マウント直後の値を取得
    const initialTime = result.current.nowMs;
    expect(typeof initialTime).toBe('number');

    // 時間を1秒進める
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // 時間が更新されていることを確認
    // (FakeTimersを使用しているため、確実に値が増えているはず)
    expect(result.current.nowMs).toBeGreaterThan(initialTime as number);
  });
});
