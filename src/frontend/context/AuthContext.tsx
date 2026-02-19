'use client';

import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { auth } from '@/lib/firebase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  /** 表示用。refreshUser で更新されるため nav などで確実に最新が表示される */
  displayName: string | null;
  /** プロフィール更新後など、Firebase の最新ユーザー情報で state を更新する */
  refreshUser: () => Promise<void>;
  /** refreshUser 時にインクリメントされ、表示の再描画を促す */
  userVersion: number;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  displayName: null,
  refreshUser: async () => {},
  userVersion: 0,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVersion, setUserVersion] = useState(0);

  const refreshUser = async () => {
    const current = auth.currentUser;
    if (current) {
      await current.reload();
      const updated = auth.currentUser;
      // 同期的に state を反映してから戻る（遷移前に nav が最新表示になるようにする）
      flushSync(() => {
        setUser(updated);
        setDisplayName(updated?.displayName ?? updated?.email ?? null);
        setUserVersion((v) => v + 1);
      });
    }
  };

  useEffect(() => {
    // ログイン状態の変化を監視
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setDisplayName(user?.displayName ?? user?.email ?? null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, displayName, loading, refreshUser, userVersion }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
