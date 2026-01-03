import { cleanup, render, screen, waitFor } from '@testing-library/react';
import * as echarts from 'echarts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// import '@testing-library/jest-dom'; // 削除: インストール不要にするため除外

import {
  DepthScatterChart,
  EarthquakeMapChart,
  MagHistChart,
  RegionRankChart,
  TimeSeriesChart,
} from '../EarthquakeCharts';
import type { Earthquake } from '../utils';

// --- Mocks ---

// echarts-for-react のモック
vi.mock('echarts-for-react', () => ({
  default: ({ option, style }: any) => (
    <div data-testid="echart-mock" data-option={JSON.stringify(option)} style={style}>
      Mock Chart
    </div>
  ),
}));

// echarts 自体のモック
vi.mock('echarts', async () => {
  const actual = await vi.importActual<typeof echarts>('echarts');
  return {
    ...actual,
    registerMap: vi.fn(),
    getMap: vi.fn(),
  };
});

// fetch のモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockData: Earthquake[] = [
  {
    usgs_id: '1',
    timestamp: '2025-01-01T10:00:00Z',
    magnitude: 5.0,
    place: 'Test Place',
    depth: 10,
    latitude: 0,
    longitude: 0,
  },
];

// --- Tests ---

describe('EarthquakeCharts Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 重要: テストごとにDOMをクリーンアップして、以前の描画内容が残らないようにする
  afterEach(() => {
    cleanup();
  });

  describe('EarthquakeMapChart', () => {
    it('should load world map and render chart', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'FeatureCollection', features: [] }),
      });
      // getMap が最初は null を返す (未ロード状態)
      vi.mocked(echarts.getMap).mockReturnValue(null);

      render(<EarthquakeMapChart data={mockData} />);

      // Loadingが表示されるか (getByは要素がないとthrowするので、存在確認になる)
      expect(screen.getByText('Loading World Map...')).toBeTruthy();

      // ロード完了後
      await waitFor(() => {
        expect(echarts.registerMap).toHaveBeenCalledWith('world', expect.anything());
      });

      // チャートが表示されるか
      await waitFor(() => {
        expect(screen.getByTestId('echart-mock')).toBeTruthy();
      });

      // オプション確認
      const mockEl = screen.getByTestId('echart-mock');
      const option = JSON.parse(mockEl.getAttribute('data-option') || '{}');
      expect(option).toHaveProperty('geo');
    });

    it('should skip fetching if map is already registered', async () => {
      // すでにロード済みの場合
      vi.mocked(echarts.getMap).mockReturnValue({} as any);

      render(<EarthquakeMapChart data={mockData} />);

      // すぐにチャートが表示される
      await waitFor(() => {
        expect(screen.getByTestId('echart-mock')).toBeTruthy();
      });

      // fetch は呼ばれないはず
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('MagHistChart', () => {
    it('should render with correct options', () => {
      render(<MagHistChart data={mockData} />);
      const mockEl = screen.getByTestId('echart-mock');
      expect(mockEl).toBeTruthy();

      const option = JSON.parse(mockEl.getAttribute('data-option') || '{}');
      expect(option.xAxis.type).toBe('category');
      expect(option.series[0].type).toBe('bar');
    });
  });

  describe('DepthScatterChart', () => {
    it('should render with correct options', () => {
      render(<DepthScatterChart data={mockData} />);
      const mockEl = screen.getByTestId('echart-mock');
      expect(mockEl).toBeTruthy();

      const option = JSON.parse(mockEl.getAttribute('data-option') || '{}');
      expect(option.xAxis.name).toBe('Depth(km)');
      expect(option.series[0].type).toBe('scatter');
    });
  });

  describe('RegionRankChart', () => {
    it('should render with correct options', () => {
      const rankData: [string, number][] = [['Japan', 5]];
      render(<RegionRankChart data={rankData} />);
      const mockEl = screen.getByTestId('echart-mock');
      expect(mockEl).toBeTruthy();

      const option = JSON.parse(mockEl.getAttribute('data-option') || '{}');
      expect(option.yAxis.type).toBe('category');
      expect(option.yAxis.data).toEqual(['Japan']);
    });
  });

  describe('TimeSeriesChart', () => {
    it('should render with correct options', () => {
      const stackedData = {
        dates: ['1/1'],
        series: [
          {
            name: 'Test',
            type: 'bar' as const,
            stack: 'total' as const,
            emphasis: { focus: 'series' as const, blurScope: 'coordinateSystem' as const },
            data: [1],
          },
        ],
      };
      render(<TimeSeriesChart data={stackedData} />);
      const mockEl = screen.getByTestId('echart-mock');
      expect(mockEl).toBeTruthy();

      const option = JSON.parse(mockEl.getAttribute('data-option') || '{}');
      expect(option.xAxis.data).toEqual(['1/1']);
      expect(option.series).toHaveLength(1);
    });
  });
});
