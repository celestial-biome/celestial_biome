'use client';

import {
  GoogleAuthProvider,
  sendPasswordResetEmail, // 追加
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
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

  // モード管理: 'LOGIN' or 'RESET'
  const [mode, setMode] = useState<'LOGIN' | 'RESET'>('LOGIN');

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // 成功メッセージ用

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
      await onLoginSuccess();
      // biome-ignore lint/suspicious/noExplicitAny: Firebase Error型定義の簡略化
    } catch (err: any) {
      console.error(err);
      // エラーメッセージの改善
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setError('メールアドレスまたはパスワードが間違っています。');
      } else {
        setError('ログインに失敗しました。しばらく待ってから再度お試しください。');
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      await onLoginSuccess();
      // biome-ignore lint/suspicious/noExplicitAny: Firebase Error型定義の簡略化
    } catch (err: any) {
      console.error(err);
      setError('Googleログインに失敗しました。');
    }
  };

  // パスワードリセット処理
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email) {
      setError('メールアドレスを入力してください。');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('パスワード再設定メールを送信しました。メールをご確認ください。');
      // 送信後は入力欄をクリアせず、ユーザーが確認できるようにする
      // biome-ignore lint/suspicious/noExplicitAny: Firebase Error型定義の簡略化
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        // セキュリティ上、存在しない場合も送信したように振る舞うのがベストプラクティスですが、
        // 利便性のため明確なエラーを出すか、あるいは汎用的なメッセージにします。
        // ここではユーザーにわかりやすく伝えます。
        setError('このメールアドレスは登録されていません。');
      } else {
        setError('メール送信に失敗しました。しばらく待ってから再度お試しください。');
      }
    }
  };

  // モード切り替え時のリセット
  const toggleMode = (newMode: 'LOGIN' | 'RESET') => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <CelestialCard title={mode === 'LOGIN' ? 'Login Portal' : 'Reset Password'}>
      {/* エラーメッセージ表示 */}
      {error && (
        <div className="mb-4 p-4 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg">
          {error}
        </div>
      )}

      {/* 成功メッセージ表示 */}
      {successMessage && (
        <div className="mb-4 p-4 text-sm text-green-400 bg-green-900/20 border border-green-900/50 rounded-lg">
          {successMessage}
        </div>
      )}

      {mode === 'LOGIN' ? (
        /* ================= ログインフォーム ================= */
        <>
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
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className={labelClasses.replace('mb-2', '')}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => toggleMode('RESET')}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
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
        </>
      ) : (
        /* ================= パスワードリセットフォーム ================= */
        <form onSubmit={handleResetPassword} className="space-y-6">
          <p className="text-sm text-gray-400">
            登録したメールアドレスを入力してください。パスワード再設定用のリンクを送信します。
          </p>

          <div>
            <label htmlFor="reset-email" className={labelClasses}>
              Email Address
            </label>
            <input
              id="reset-email"
              type="email"
              required
              className={inputClasses}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          <button type="submit" className={buttonClasses}>
            Send Reset Link
          </button>

          <button
            type="button"
            onClick={() => toggleMode('LOGIN')}
            className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors mt-4"
          >
            Back to Login
          </button>
        </form>
      )}

      {/* 新規登録リンク (ログインモード時のみ表示) */}
      {mode === 'LOGIN' && (
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            New to Celestial Biome?{' '}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300 transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      )}
    </CelestialCard>
  );
}
