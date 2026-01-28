import type {
  BarSeriesOption,
  ScatterSeriesOption,
  XAXisComponentOption,
  YAXisComponentOption,
} from 'echarts';
import { describe, expect, it } from 'vitest';
import {
  getDepthScatterOption,
  getMagHistOption,
  getMapOption,
  getRegionRankOption,
  getTimeSeriesOption,
} from '../chart-options';
import type { StackedSeriesData } from '../useEarthquakes';
import type { Earthquake } from '../utils';

// モックデータ
const mockData: Earthquake[] = [
  {
    usgs_id: '1',
    timestamp: '2025-01-01T10:00:00Z',
    magnitude: 5.5,
    place: 'Tokyo, Japan',
    depth: 30,
    latitude: 35.6,
    longitude: 139.7,
  },
  {
    usgs_id: '2',
    timestamp: '2025-01-02T12:00:00Z',
    magnitude: 7.2,
    place: 'California, USA',
    depth: 10,
    latitude: 34.0,
    longitude: -118.2,
  },
];

describe('earthquake/chart-options', () => {
  describe('getMapOption', () => {
    it('should have animation disabled', () => {
      const option = getMapOption(mockData);
      expect(option.animation).toBe(false);
    });

    it('should generate correct scatter data', () => {
      const option = getMapOption(mockData);
      // ScatterSeriesOption にキャスト
      const series = option.series?.[0] as ScatterSeriesOption;
      const data = series.data as MapDataPoint[];

      expect(series.type).toBe('scatter');
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('Tokyo, Japan');
      // [lng, lat, mag]
      expect(data[0].value).toEqual([139.7, 35.6, 5.5]);
    });

    it('should assign colors based on magnitude', () => {
      const option = getMapOption(mockData);
      const series = option.series?.[0] as ScatterSeriesOption;

      // itemStyle.color が関数の場合を想定
      const colorFunc = series.itemStyle?.color;
      if (typeof colorFunc === 'function') {
        // M5.5 -> Orange (#f97316)
        expect(colorFunc({ data: { mag: 5.5 } })).toBe('#f97316');
        // M7.2 -> Red (#ef4444)
        expect(colorFunc({ data: { mag: 7.2 } })).toBe('#ef4444');
      } else {
        throw new Error('itemStyle.color should be a function');
      }
    });
  });

  describe('getMagHistOption', () => {
    it('should have animation disabled', () => {
      const option = getMagHistOption(mockData);
      expect(option.animation).toBe(false);
    });

    it('should bucket magnitudes correctly', () => {
      const option = getMagHistOption(mockData);
      const series = option.series?.[0] as BarSeriesOption;

      // Bins: ['2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9+']
      const expectedData = [0, 0, 0, 1, 0, 1, 0, 0];
      expect(series.data).toEqual(expectedData);
    });
  });

  describe('getDepthScatterOption', () => {
    it('should have animation disabled', () => {
      const option = getDepthScatterOption(mockData);
      expect(option.animation).toBe(false);
    });

    it('should map depth and magnitude correctly', () => {
      const option = getDepthScatterOption(mockData);
      const series = option.series?.[0] as ScatterSeriesOption;
      const data = series.data as [number, number, string, string][];

      // [depth, magnitude, place, timestamp]
      expect(data[0]).toEqual([30, 5.5, 'Tokyo, Japan', '2025-01-01T10:00:00Z']);
      expect(data[1]).toEqual([10, 7.2, 'California, USA', '2025-01-02T12:00:00Z']);
    });
  });

  describe('getRegionRankOption', () => {
    it('should have animation disabled', () => {
      const rankingData: [string, number][] = [
        ['Japan', 10],
        ['USA', 5],
      ];
      const option = getRegionRankOption(rankingData);
      expect(option.animation).toBe(false);
    });

    it('should display ranking data', () => {
      const rankingData: [string, number][] = [
        ['Japan', 10],
        ['USA', 5],
      ];
      const option = getRegionRankOption(rankingData);

      const yAxis = option.yAxis as YAXisComponentOption;
      expect(yAxis.data).toEqual(['USA', 'Japan']);

      const series = option.series?.[0] as BarSeriesOption;
      expect(series.data).toEqual([5, 10]);
    });
  });

  describe('getTimeSeriesOption', () => {
    it('should have animation disabled', () => {
      const stackedData: StackedSeriesData = { dates: [], series: [] };
      const option = getTimeSeriesOption(stackedData);
      expect(option.animation).toBe(false);
    });

    it('should pass through stacked series data', () => {
      const stackedData: StackedSeriesData = {
        dates: ['1/1', '1/2'],
        series: [
          {
            name: 'Japan',
            type: 'bar',
            stack: 'total',
            emphasis: { focus: 'series' as const, blurScope: 'coordinateSystem' as const },
            data: [1, 0],
          } as BarSeriesOption,
        ],
      };
      const option = getTimeSeriesOption(stackedData);

      const xAxis = option.xAxis as XAXisComponentOption;
      expect(xAxis.data).toEqual(['1/1', '1/2']);
      expect(option.series).toEqual(stackedData.series);
    });
  });
});
