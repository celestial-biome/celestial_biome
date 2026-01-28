import type { LineSeriesOption } from 'echarts';
import { describe, expect, it } from 'vitest';
import { getWindOption, getXrayOption } from '../chart-options';

// ダミーデータ
const mockData: [number, number | null][] = [
  [1600000000000, 1.5e-5],
  [1600003600000, 2.0e-5],
];

describe('Chart Options Generator', () => {
  it('X-rayチャートのオプションが正しく生成されること', () => {
    const option = getXrayOption(mockData);

    // 特定の重要なプロパティをチェック
    expect(option.yAxis).toHaveProperty('type', 'log');

    // series を LineSeriesOption の配列としてキャスト
    const series = option.series as LineSeriesOption[];
    expect(series[0]).toHaveProperty('name', 'X-ray');

    // データが正しく渡されているか
    // series[0].data は適切な型定義があるため、安全に比較できます
    expect(series[0].data).toEqual(mockData);

    // 全体の構成が変わっていないかスナップショットで保存
    expect(option).toMatchSnapshot();
  });

  it('Windチャートのオプションが正しく生成されること', () => {
    const option = getWindOption(mockData);

    // yAxis の型チェック
    expect(option.yAxis).toHaveProperty('type', 'value'); // 線形軸

    const series = option.series as LineSeriesOption[];
    expect(series[0]).toHaveProperty('name', 'Solar Wind Speed');

    expect(option).toMatchSnapshot();
  });
});
