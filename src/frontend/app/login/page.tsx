'use client';

import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { fetchWithAuth } from '@/lib/api-client';
import { auth } from '@/lib/firebase';
import {
  buttonClasses,
  CelestialCard,
  inputClasses,
  labelClasses,
} from '../components/ui/CelestialCard';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 共通のログイン成功後処理
  const onLoginSuccess = async () => {
    try {
      // ログインログを記録
      await fetchWithAuth('/api/v1/auth/log/', {
        method: 'POST',
        body: JSON.stringify({ action: 'LOGIN' }),
      });
    } catch (e) {
      console.error('Login log failed:', e);
    }
    router.push('/');
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // 成功処理へ
      await onLoginSuccess();
      // biome-ignore lint/suspicious/noExplicitAny: <あとで修正>
    } catch (err: any) {
      console.error(err);
      setError('ログインに失敗しました。');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // 成功処理へ
      await onLoginSuccess();
      // biome-ignore lint/suspicious/noExplicitAny: <あとで修正>
    } catch (err: any) {
      console.error(err);
      setError('Googleログインに失敗しました。');
    }
  };

  return (
    <CelestialCard title="Login Portal">
      {error && (
        <div className="p-4 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label htmlFor="email" className={labelClasses}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            className={inputClasses}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClasses}>
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            className={inputClasses}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className={buttonClasses}>
          Initialize Session
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-900 text-gray-500">OR</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center px-4 py-3 border border-gray-700 rounded-lg text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-all"
      >
        <span className="mr-2">G</span> Continue with Google
      </button>

      <div className="text-center mt-6">
        <p className="text-sm text-gray-500">
          New to Celestial Biome?{' '}
          <Link href="/signup" className="text-blue-400 hover:text-blue-300 transition-colors">
            Create Account
          </Link>
        </p>
      </div>
    </CelestialCard>
  );
}
