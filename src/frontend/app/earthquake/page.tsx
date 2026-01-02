import Link from 'next/link';
import EarthquakeDashboard from '../components/earthquake';

export default function EarthquakePage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-black text-white">
      <div className="w-full max-w-5xl mb-8 flex items-center">
        <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Back to Portal
        </Link>
      </div>

      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-6 font-mono">Earthquake Dashboard</h1>
        <EarthquakeDashboard />
      </div>
    </main>
  );
}
