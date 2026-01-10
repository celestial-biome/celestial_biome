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
      const series: any = option.series?.[0];

      expect(series.type).toBe('scatter');
      expect(series.data).toHaveLength(2);
      expect(series.data[0].name).toBe('Tokyo, Japan');
      // [lng, lat, mag]
      expect(series.data[0].value).toEqual([139.7, 35.6, 5.5]);
    });

    it('should assign colors based on magnitude', () => {
      const option = getMapOption(mockData);
      const series: any = option.series?.[0];
      const colorFunc = series.itemStyle.color;

      // M5.5 -> Orange (#f97316)
      expect(colorFunc({ data: { mag: 5.5 } })).toBe('#f97316');
      // M7.2 -> Red (#ef4444)
      expect(colorFunc({ data: { mag: 7.2 } })).toBe('#ef4444');
    });
  });

  describe('getMagHistOption', () => {
    it('should have animation disabled', () => {
      const option = getMagHistOption(mockData);
      expect(option.animation).toBe(false);
    });

    it('should bucket magnitudes correctly', () => {
      const option = getMagHistOption(mockData);
      const series: any = option.series?.[0];

      // Bins: ['2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9+']
      // 5.5 -> Index 3 ('5-6')
      // 7.2 -> Index 5 ('7-8')
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
      const series: any = option.series?.[0];

      // [depth, magnitude, place, timestamp]
      expect(series.data[0]).toEqual([30, 5.5, 'Tokyo, Japan', '2025-01-01T10:00:00Z']);
      expect(series.data[1]).toEqual([10, 7.2, 'California, USA', '2025-01-02T12:00:00Z']);
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

      // yAxis data (reversed)
      const yAxis: any = option.yAxis;
      expect(yAxis.data).toEqual(['USA', 'Japan']);

      // series data (reversed)
      const series: any = option.series?.[0];
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
            emphasis: { focus: 'series', blurScope: 'coordinateSystem' },
            data: [1, 0],
          },
        ],
      };
      const option = getTimeSeriesOption(stackedData);

      expect((option.xAxis as any).data).toEqual(['1/1', '1/2']);
      expect(option.series).toEqual(stackedData.series);
    });
  });
});
