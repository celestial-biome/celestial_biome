import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DepthScatterChart,
  EarthquakeMapChart,
  MagHistChart,
  RegionRankChart,
  TimeSeriesChart,
} from '../EarthquakeCharts';
import type { StackedSeriesData } from '../useEarthquakes';
import type { Earthquake } from '../utils';

// --- Mocks ---

/**
 * next/dynamic をモック化し、テスト環境では非同期読み込みをバイパスして
 * 即時にモックコンポーネントをレンダリングさせます。
 */
vi.mock('next/dynamic', () => ({
  default: () => {
    return function MockComponent(props: { option: object }) {
      return <div data-testid="react-echarts" data-option={JSON.stringify(props.option)} />;
    };
  },
}));

/**
 * echarts 本体と echarts-for-react のモック定義
 */
vi.mock('echarts', () => ({
  getMap: vi.fn().mockReturnValue(null),
  registerMap: vi.fn(),
}));

vi.mock('echarts-for-react', () => ({
  default: (props: { option: object }) => (
    <div data-testid="react-echarts" data-option={JSON.stringify(props.option)} />
  ),
}));

// --- Mock Data ---

const mockQuakes: Earthquake[] = [
  {
    usgs_id: '1',
    timestamp: '2025-01-01T00:00:00Z',
    magnitude: 5.0,
    place: 'Test Place',
    depth: 10,
    latitude: 0,
    longitude: 0,
  },
];

// --- Lifecycle ---

/**
 * 複数のテスト間で DOM が蓄積されるのを防ぐため、各テスト後にクリーンアップを実行します。
 * これにより "Found multiple elements" エラーを解消します。
 */
afterEach(() => {
  cleanup();
});

// --- Tests ---

describe('EarthquakeCharts Components', () => {
  it('EarthquakeMapChart がローカルのローディング状態を表示すること', () => {
    render(<EarthquakeMapChart data={mockQuakes} />);
    // マップは内部の useEffect (fetch) を待つため、初期は Loading が表示される
    expect(screen.getByText(/Loading World Map.../i)).toBeDefined();
  });

  it('MagHistChart が正しくレンダリングされること', () => {
    render(<MagHistChart data={mockQuakes} />);
    const chart = screen.getByTestId('react-echarts');
    const option = JSON.parse(chart.getAttribute('data-option') || '{}');

    expect(option.animation).toBe(false);
    // 5.0 は 5-6 のバケットに入る（インデックス3）
    expect(option.series[0].data[3]).toBe(1);
  });

  it('DepthScatterChart が正しくレンダリングされること', () => {
    render(<DepthScatterChart data={mockQuakes} />);
    const chart = screen.getByTestId('react-echarts');
    const option = JSON.parse(chart.getAttribute('data-option') || '{}');

    // [depth, magnitude, place, timestamp]
    expect(option.series[0].data[0]).toEqual([10, 5, 'Test Place', '2025-01-01T00:00:00Z']);
  });

  it('RegionRankChart がランキングデータを表示すること', () => {
    const mockRanking: [string, number][] = [['Japan', 10]];
    render(<RegionRankChart data={mockRanking} />);

    const chart = screen.getByTestId('react-echarts');
    const option = JSON.parse(chart.getAttribute('data-option') || '{}');
    expect(option.yAxis.data).toContain('Japan');
  });

  it('TimeSeriesChart が時系列データを表示すること', () => {
    const mockStackedData: StackedSeriesData = {
      dates: ['2025-01-01'],
      series: [{ name: 'Test Region', type: 'bar', data: [1] }],
    };
    render(<TimeSeriesChart data={mockStackedData} />);

    const chart = screen.getByTestId('react-echarts'); // cleanup により1つだけ見つかる
    const option = JSON.parse(chart.getAttribute('data-option') || '{}');

    expect(option.xAxis.data).toEqual(['2025-01-01']);
    expect(option.series[0].name).toBe('Test Region');
  });
});
