import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
// ヘッダーコンポーネントをインポート
import AuthStatus from './components/AuthStatus';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Celestial Biome',
  description: 'Visualize the rhythm of the planet and cosmos.',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico', // スマホ用にも favicon.ico を使用（apple-touch-icon.png があればそちらを推奨）
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white`}
      >
        <AuthProvider>
          {/* ★追加: ここに置くことで全ページ共通ヘッダーになります */}
          <AuthStatus />

          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
