'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext'; // ログイン状態を管理
import { predictCelestialInference } from '@/lib/inference-api'; // 推論APIクライアント

/**
 * CelestialChat Component
 * 宇宙・地球・経済のデータを統合したGemini 2.0 Flashによる相関推論UI。
 * ログインガード、参照データ（証拠）のチップ表示機能を備える。
 */
export default function CelestialChat() {
  const { user, loading: authLoading } = useAuth(); // 認証コンテキストからユーザー情報を取得
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [contextUsed, setContextUsed] = useState(''); // BigQueryから取得した参照データを保持
  const [loading, setLoading] = useState(false);

  /**
   * 推論リクエストのハンドリング
   */
  const handleAsk = async () => {
    if (!prompt) return;
    setLoading(true);
    setAnswer('');
    setContextUsed('');

    try {
      // 3テーブル（宇宙・地震・経済）を統合したバックエンドへリクエスト
      const data = await predictCelestialInference(prompt);

      setAnswer(data.content);
      setContextUsed(data.context_used || ''); // 証拠データをセット
    } catch (err) {
      console.error('Chat Error:', err);
      setAnswer('星々との通信に失敗しました。認証の有効期限が切れている可能性があります。');
    } finally {
      setLoading(false);
    }
  };

  /**
   * BigQueryから返ってきたテキストデータ（証拠）を解析してチップとして描画する
   */
  const renderDataChips = (context: string) => {
    return context
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => {
        // タイムスタンプ部分をスキップし、指標名と値を抽出するパースロジック
        const parts = line.split(': ');
        const content = parts[parts.length - 1] || line; // "KP_INDEX = 5" などを取得

        // キーワードに応じたアイコンと色の定義
        let icon = '📊';
        let color = 'text-gray-400 border-gray-800 bg-gray-900/20';

        if (line.includes('KP_INDEX') || line.includes('WIND') || line.includes('Metric:')) {
          icon = '🛰️'; // 宇宙天気
          color = 'text-purple-300 border-purple-500/30 bg-purple-900/20';
        } else if (line.includes('M') && line.includes('at')) {
          icon = '🌋'; // 地震
          color = 'text-red-300 border-red-500/30 bg-red-900/20';
        } else if (
          line.includes('STOCK') ||
          line.includes('INDICATOR') ||
          line.match(/[A-Z]{3} /)
        ) {
          icon = '📈'; // 経済
          color = 'text-blue-300 border-blue-500/30 bg-blue-900/20';
        }

        return (
          <div
            key={line}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono transition-all hover:scale-105 ${color}`}
          >
            <span>{icon}</span>
            <span className="whitespace-nowrap">{content}</span>
          </div>
        );
      })
      .slice(0, 8); // 表示が多すぎないように調整
  };

  // --- ログインガード ---
  if (authLoading)
    return (
      <div className="mt-8 text-center text-purple-400 animate-pulse font-mono uppercase tracking-widest">
        Synchronizing...
      </div>
    );

  if (!user) {
    return (
      <div className="mt-8 p-8 bg-gray-900/40 rounded-3xl border border-dashed border-purple-500/30 text-center backdrop-blur-sm">
        <p className="text-purple-200/70 mb-4 font-serif italic">
          宇宙の知性に触れるには、意識の同期（ログイン）が必要です。
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 border border-purple-500/30 rounded-full transition-all text-sm font-mono"
        >
          Enter the Biome
        </Link>
      </div>
    );
  }

  // --- チャットメインUI ---
  return (
    <div className="mt-8 p-6 bg-gray-900/60 rounded-3xl border border-purple-500/20 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* ヘッダーエリア */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${loading ? 'bg-purple-500 animate-ping' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'}`}
          />
          <h3 className="text-lg font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-blue-300">
            Celestial Insights
          </h3>
        </div>
        {contextUsed && (
          <div className="hidden sm:block text-[9px] text-gray-500 font-mono uppercase tracking-[0.2em] animate-pulse">
            Evidence Synced
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {/* プロンプト入力エリア */}
        <div className="relative group">
          <textarea
            className="w-full bg-black/40 border border-gray-800 rounded-2xl p-4 text-white focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none transition-all resize-none font-sans placeholder:text-gray-600"
            placeholder="例：昨夜のM6級地震と現在の太陽風は、投資家心理にどう影響する？"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />
          <button
            type="button"
            onClick={handleAsk}
            disabled={loading || !prompt}
            className="absolute bottom-3 right-3 bg-gradient-to-br from-purple-600 to-blue-700 hover:from-purple-500 hover:to-blue-600 disabled:from-gray-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            {loading ? 'Analyzing...' : 'Ask Universe'}
          </button>
        </div>

        {/* 推論の根拠（データチップ） */}
        {contextUsed && (
          <div className="flex flex-wrap gap-2 py-1 animate-in fade-in slide-in-from-top-1 duration-500">
            {renderDataChips(contextUsed)}
          </div>
        )}

        {/* Geminiからの回答エリア */}
        {answer && (
          <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 text-gray-200 leading-relaxed font-serif italic text-lg shadow-inner animate-in slide-in-from-bottom-2 duration-700">
            {answer}
          </div>
        )}
      </div>
    </div>
  );
}
