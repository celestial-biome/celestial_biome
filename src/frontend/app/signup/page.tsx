'use client';
// ★追加: Google Auth 関連
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  buttonClasses,
  CelestialCard,
  inputClasses,
  labelClasses,
} from '../components/ui/CelestialCard';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/');
      // biome-ignore lint/suspicious/noExplicitAny: <あとで修正>
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('このメールアドレスは既に使用されています。');
      } else {
        setError('登録に失敗しました。');
      }
    }
  };

  // Googleログイン処理
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/');
      // biome-ignore lint/suspicious/noExplicitAny: <あとで修正>
    } catch (err: any) {
      console.error(err);
      setError('Googleログインに失敗しました。');
    }
  };

  return (
    <CelestialCard title="Create Account">
      {error && (
        <div className="p-4 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg">
          {error}
        </div>
      )}
      <form onSubmit={handleSignUp} className="space-y-6">
        <div>
          <label htmlFor="signup-email" className={labelClasses}>
            Email Address
          </label>
          <input
            id="signup-email"
            type="email"
            required
            className={inputClasses}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="signup-password" className={labelClasses}>
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            required
            minLength={6}
            className={inputClasses}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className={buttonClasses.replace('bg-blue-600', 'bg-green-600 hover:bg-green-500')}
        >
          Register
        </button>
      </form>

      {/* Googleログインボタンエリア */}
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
        <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300">
          Return to Login
        </Link>
      </div>
    </CelestialCard>
  );
}
