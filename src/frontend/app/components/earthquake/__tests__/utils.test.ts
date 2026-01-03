import { describe, expect, it } from 'vitest';
import { cn, formatTsShort, METRICS_INFO } from '../utils';

describe('earthquake/utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('w-10', 'h-10')).toBe('w-10 h-10');
      expect(cn('p-4', 'p-2')).toBe('p-2'); // Tailwind merge check
      expect(cn('flex', undefined, null, 'items-center')).toBe('flex items-center');
    });
  });

  describe('formatTsShort', () => {
    it('should format timestamp correctly', () => {
      // テスト環境のタイムゾーンに依存しないよう、特定のロケール/タイムゾーンで検証するか、
      // 単純なフォーマットの構造をチェックします
      const ts = '2026-01-01T12:00:00Z';
      const formatted = formatTsShort(ts);
      // "M/D hh:mm" 形式などが含まれているか（ロケールにより多少異なるため柔軟に）
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}/);
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('METRICS_INFO', () => {
    it('should have 4 metrics defined', () => {
      expect(METRICS_INFO).toHaveLength(4);
    });

    it('should have required properties', () => {
      METRICS_INFO.forEach((item) => {
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('color');
        expect(item).toHaveProperty('description');
      });
    });
  });
});
