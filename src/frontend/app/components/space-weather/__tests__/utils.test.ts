import { describe, expect, it } from 'vitest';
import { bandIdFromXray, cn, findLastFinite, flareClass } from '../utils';

describe('Space Weather Utils', () => {
  describe('flareClass', () => {
    it('各クラスの閾値を正しく判定できること', () => {
      expect(flareClass(0.0002).label).toBe('X'); // 1e-4以上
      expect(flareClass(0.00005).label).toBe('M'); // 1e-5以上
      expect(flareClass(0.000005).label).toBe('C'); // 1e-6以上
      expect(flareClass(0.0000005).label).toBe('B'); // 1e-7以上
      expect(flareClass(0.00000005).label).toBe('A'); // それ未満
    });

    it('無効な値の場合はダッシュを返すこと', () => {
      expect(flareClass(null).label).toBe('—');
      expect(flareClass(undefined).label).toBe('—');
      expect(flareClass(NaN).label).toBe('—');
    });
  });

  describe('bandIdFromXray', () => {
    it('X線量から正しいバンドIDを返すこと', () => {
      expect(bandIdFromXray(2e-4)).toBe('X');
      expect(bandIdFromXray(2e-5)).toBe('M');
      expect(bandIdFromXray(2e-8)).toBe('A');
    });

    it('無効な値の場合はnullを返すこと', () => {
      expect(bandIdFromXray(null)).toBeNull();
    });
  });

  describe('findLastFinite', () => {
    it('配列の後ろから最初の有効な値を返すこと', () => {
      const data = [
        { val: 10, id: 1 },
        { val: null, id: 2 },
        { val: 20, id: 3 },
        { val: null, id: 4 },
      ];
      // 後ろ(id:4)から見て、最初に数字があるのは id:3
      const result = findLastFinite(data, (d) => d.val);
      expect(result?.value).toBe(20);
      expect(result?.item.id).toBe(3);
    });

    it('有効な値がない場合はnullを返すこと', () => {
      const data = [{ val: null }, { val: undefined }];
      const result = findLastFinite(data, (d) => d.val);
      expect(result).toBeNull();
    });
  });

  describe('cn (classNames)', () => {
    it('条件付きクラスを正しく結合すること', () => {
      expect(cn('base', false && 'hidden', 'active')).toBe('base active');
      expect(cn('p-4', undefined, null, 'm-2')).toBe('p-4 m-2');
    });
  });
});
