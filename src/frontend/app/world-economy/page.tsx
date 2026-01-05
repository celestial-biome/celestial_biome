import Link from 'next/link';
import WorldEconomyDashboard from '../components/world-economy';
import type { EconomyApiResponse } from '../components/world-economy/utils';

export const revalidate = 3600;

async function getEconomyData(): Promise<EconomyApiResponse | null> {
  // 優先順位:
  // 1. INTERNAL_API_URL: Docker内通信用 (例: http://backend:8000)
  // 2. NEXT_PUBLIC_API_URL: クライアント用 (例: http://localhost:8000)
  // 3. フォールバック: http://localhost:8000
  const apiUrl =
    process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    const res = await fetch(`${apiUrl}/api/v1/economy/world-economy/`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error(`Failed to fetch data: ${res.status} ${res.statusText}`);
      return null;
    }
    return res.json();
  } catch (error) {
    console.error('Error fetching economy data:', error);
    return null;
  }
}

export default async function WorldEconomyPage() {
  const data = await getEconomyData();

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-black text-white">
      <div className="w-full max-w-5xl mb-8 flex items-center">
        <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Back to Portal
        </Link>
      </div>

      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-6 font-mono">World Economy Dashboard</h1>
        <WorldEconomyDashboard initialData={data} />
      </div>
    </main>
  );
}
