import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Card, StatChip } from '../ui-parts';

describe('UI Parts', () => {
  afterEach(() => {
    cleanup();
  });

  describe('StatChip', () => {
    it('ラベルと値を正しく表示すること', () => {
      render(<StatChip label="Test Label" value="123.45" />);

      expect(screen.getByText('Test Label')).toBeDefined();
      expect(screen.getByText('123.45')).toBeDefined();
    });

    it('サブテキストがある場合に表示すること', () => {
      render(<StatChip label="Label" value="100" sub="Updated just now" />);
      expect(screen.getByText('Updated just now')).toBeDefined();
    });

    it('tone（色クラス）が適用されること', () => {
      const { container } = render(<StatChip label="Flare" value="X1.0" tone="text-red-500" />);
      // クラスが含まれているか確認
      expect(container.querySelector('.text-red-500')).toBeDefined();
    });
  });

  describe('Card', () => {
    it('タイトルと子供の要素を表示すること', () => {
      render(
        <Card title="My Card Title">
          <div data-testid="child-content">Child Content</div>
        </Card>,
      );

      expect(screen.getByText('My Card Title')).toBeDefined();
      expect(screen.getByTestId('child-content')).toBeDefined();
    });

    it('サブタイトルと右側の要素を表示すること', () => {
      render(
        <Card
          title="Title"
          subtitle="Subtitle here"
          right={<span data-testid="right-elem">Right</span>}
        >
          Test
        </Card>,
      );

      expect(screen.getByText('Subtitle here')).toBeDefined();
      expect(screen.getByTestId('right-elem')).toBeDefined();
    });
  });
});
