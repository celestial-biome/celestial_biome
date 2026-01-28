'use client';

import { FirebaseError } from 'firebase/app'; // FirebaseError をインポート
import {
  deleteUser,
  sendPasswordResetEmail,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchWithAuth } from '@/lib/api-client';
import { auth } from '@/lib/firebase';
import {
  buttonClasses,
  CelestialCard,
  inputClasses,
  labelClasses,
} from '../components/ui/CelestialCard';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user, loading, router]);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      // プロフィール名の更新
      await updateProfile(user, { displayName });

      // メールの更新 (検証メールの送信)
      if (email !== user.email) {
        await verifyBeforeUpdateEmail(user, email);
        setMessage({
          type: 'info',
          text: 'Verification email sent to new address. Please check your inbox.',
        });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }

      // バックエンドDBへの同期
      await fetchWithAuth('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ display_name: displayName }),
      });
    } catch (err) {
      if (err instanceof FirebaseError) {
        setMessage({ type: 'error', text: `Failed to update: ${err.message}` });
      } else {
        setMessage({ type: 'error', text: 'An unexpected error occurred.' });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage({ type: 'info', text: 'Password reset email sent.' });
    } catch (err) {
      if (err instanceof FirebaseError) {
        setMessage({ type: 'error', text: err.message });
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteUser(user);
      router.push('/signup');
    } catch (err) {
      if (err instanceof FirebaseError) {
        if (err.code === 'auth/requires-recent-login') {
          setMessage({
            type: 'error',
            text: 'Please re-login to delete your account.',
          });
        } else {
          setMessage({ type: 'error', text: err.message });
        }
      }
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-500 animate-pulse">
        Loading profile...
      </div>
    );
  }

  // ★変更: CelestialCard でラップし、ダークテーマスタイルを適用
  return (
    <CelestialCard title="User Configuration">
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg border text-sm ${
            message.type === 'success'
              ? 'bg-green-900/20 border-green-900/50 text-green-400'
              : message.type === 'info'
                ? 'bg-blue-900/20 border-blue-900/50 text-blue-400'
                : 'bg-red-900/20 border-red-900/50 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        {/* メールアドレス入力欄 */}
        <div>
          <label htmlFor="profile-email" className={labelClasses}>
            Email Address
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="profile-email"
              type="email"
              disabled={!isEditingEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClasses} ${!isEditingEmail ? 'opacity-60 cursor-not-allowed bg-gray-800/50' : ''}`}
            />
            <button
              type="button"
              onClick={() => {
                if (isEditingEmail) setEmail(user.email || ''); // キャンセル時は元に戻す
                setIsEditingEmail(!isEditingEmail);
              }}
              className="px-4 py-2 text-sm font-medium border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors whitespace-nowrap"
            >
              {isEditingEmail ? 'Undo' : 'Change'}
            </button>
          </div>
          {isEditingEmail && (
            <p className="mt-2 text-xs text-orange-400">
              ※確認メールが送信されます。リンクをクリックして変更を完了してください。
            </p>
          )}
        </div>

        {/* 表示名入力欄 */}
        <div>
          <label htmlFor="displayName" className={labelClasses}>
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClasses}
          />
        </div>

        <div>
          <button type="submit" disabled={isUpdating} className={buttonClasses}>
            {isUpdating ? 'Processing...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* セキュリティ設定エリア */}
      <div className="mt-10 border-t border-gray-800 pt-8">
        <h3 className="text-lg font-medium text-white mb-6">Security & Danger Zone</h3>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handlePasswordReset}
            className="w-full text-left text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            → Send Password Reset Email
          </button>

          {/* ★追加: アカウント削除ボタン */}
          <div className="pt-4 mt-4 border-t border-red-900/20">
            <p className="text-xs text-gray-500 mb-3">
              Deleting your account will permanently remove all your data from our servers.
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="w-full py-2 px-4 bg-red-900/10 hover:bg-red-900/30 text-red-500 border border-red-900/30 rounded-lg transition-colors text-sm font-bold"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Return to Portal
        </button>
      </div>
    </CelestialCard>
  );
}
