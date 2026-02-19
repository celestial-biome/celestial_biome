'use client';

import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchWithAuth } from '@/lib/api-client';
import { auth } from '@/lib/firebase';

export default function AuthStatus() {
  const { user, displayName: contextDisplayName, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Firebaseからログアウトする前にバックエンドにログを送信
      // 失敗してもログアウト自体は止めないように catch する
      await fetchWithAuth('/api/v1/auth/log/', {
        method: 'POST',
        body: JSON.stringify({ action: 'LOGOUT' }),
      }).catch((err) => console.error('Logout log failed:', err));

      await signOut(auth);
      router.refresh();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  if (loading) {
    // ローディング中も高さを確保してレイアウトシフトを防ぐ
    return <div className="w-full h-16 bg-gray-950 border-b border-gray-800" />;
  }

  return (
    <div className="w-full bg-gray-950/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        {/* ロゴエリア */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:animate-pulse" />
          <span className="font-bold text-lg text-gray-100 tracking-wide">Celestial Biome</span>
        </Link>

        {/* 右側アクションエリア */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Logged in as</span>
                <span className="text-sm font-medium text-gray-300 font-mono">
                  {contextDisplayName ?? user.displayName ?? user.email}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-md transition-all"
                >
                  Config
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-red-400 hover:text-red-300 bg-red-900/10 hover:bg-red-900/30 border border-red-900/30 rounded-md transition-all"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg shadow-blue-900/20 transition-all"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
