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
    expect(option.series?.[0]).toHaveProperty('name', 'X-ray');

    // データが正しく渡されているか
    const seriesData = (option.series as any)[0].data;
    expect(seriesData).toEqual(mockData);

    // 全体の構成が変わっていないかスナップショットで保存
    // (初回実行時に __snapshots__ ディレクトリが作成されます)
    expect(option).toMatchSnapshot();
  });

  it('Windチャートのオプションが正しく生成されること', () => {
    const option = getWindOption(mockData);
    expect(option.yAxis).toHaveProperty('type', 'value'); // 線形軸
    expect(option.series?.[0]).toHaveProperty('name', 'Solar Wind Speed');
    expect(option).toMatchSnapshot();
  });
});
