# Celestial Biome — Frontend

Celestial Biome のフロントエンドアプリケーションです。Next.js (App Router) + TypeScript で構築されており、宇宙天気・地震・経済データをリアルタイムで可視化します。

## Tech Stack

| Technology         | Version     | Note                         |
| ------------------ | ----------- | ---------------------------- |
| Next.js            | 16          | App Router                   |
| TypeScript         | 5.x         |                              |
| Node.js            | v22 LTS     |                              |
| Tailwind CSS       | v4          |                              |
| Biome              | Latest      | Lint / Format（ESLint/Prettier 使用禁止） |
| openapi-typescript | Latest      | Backend スキーマから型を自動生成 |
| Vitest             | Latest      | Unit & Component Testing     |
| ECharts            | 6.x         | Charts & Graphs              |

## Getting Started

依存関係をインストールします。

```bash
cd src/frontend
npm install
```

開発サーバーを起動します（プロジェクトルートの Docker Compose を使用する場合は不要）。

```bash
npm run dev
```

- App: http://localhost:3000

## Code Quality

```bash
# Lint & Format（コミット前に実行）
npx biome check --write .
```

Biome は pre-commit フックで自動実行されます。ESLint / Prettier は使用禁止です。

## Testing

```bash
# src/frontend で実行
npm test
```

主なテストファイル:

- `utils.test.ts`: ロジック関数の単体テスト
- `chart-options.test.ts`: グラフ設定（ECharts）のスナップショットテスト
- `ui-parts.test.tsx`: UI コンポーネントの描画テスト
- `useSpaceWeather.test.ts`: カスタムフックとデータ取得フローのテスト

## Type Generation (Schema Driven)

Backend の OpenAPI スキーマ (`schema.yml`) から TypeScript 型を自動生成します。

```bash
# schema.yml を更新後に実行
npx openapi-typescript ../backend/schema.yml -o src/types/api.d.ts
```

詳細はルートの `README.md` — **Schema Driven Development** セクションを参照してください。
