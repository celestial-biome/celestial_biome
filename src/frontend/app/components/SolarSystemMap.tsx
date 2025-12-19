'use client';

import dynamic from 'next/dynamic';
import type { Data } from 'plotly.js';
import { useEffect, useMemo, useState } from 'react';

// PlotlyはSSR非対応なのでdynamic import
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type PlanetData = {
  x: number[];
  y: number[];
};

type ApiResponse = {
  timestamps: string[];
  bodies: Record<string, PlanetData>;
};

export default function SolarSystemMap() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 初回マウント時にデータ取得
  useEffect(() => {
    async function fetchData() {
      try {
        // next.config.ts の rewrite 経由で Backend API を叩く
        const res = await fetch('/api/v1/astronomy/positions/?days=365&steps=50');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Failed to fetch astronomy data:', error);
      }
    }
    fetchData();
  }, []);

  // アニメーションループ
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && data) {
      interval = setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % data.timestamps.length);
      }, 30); // 更新間隔(ms)
    }
    return () => clearInterval(interval);
  }, [isPlaying, data]);

  // 描画データの生成
  const plotData = useMemo((): Data[] => {
    if (!data) return [];

    const traces: Data[] = [];
    const planetColors: Record<string, string> = {
      mercury: '#b7b7b7',
      venus: '#e8d7a5',
      earth: '#4da3ff',
      mars: '#ff5a5a',
      jupiter: '#f4a261',
      saturn: '#e9c46a',
      uranus: '#7bdff2',
      neptune: '#5e60ce',
      pluto: '#c9ada7',
    };

    Object.entries(data.bodies).forEach(([name, coords]) => {
      // 1. 軌道ライン
      traces.push({
        x: coords.x,
        y: coords.y,
        mode: 'lines',
        line: { width: 1, color: planetColors[name] || '#fff' },
        opacity: 0.3,
        hoverinfo: 'skip',
        type: 'scatter',
      });
      // 2. 現在位置マーカー
      traces.push({
        x: [coords.x[frameIndex]],
        y: [coords.y[frameIndex]],
        mode: 'markers',
        marker: { size: 6, color: planetColors[name] || '#fff' },
        name: name,
        type: 'scatter',
      });
    });

    // 3. 太陽
    traces.push({
      x: [0],
      y: [0],
      mode: 'markers',
      marker: { size: 12, color: '#ff6600' },
      name: 'Sun',
      type: 'scatter',
    });

    return traces;
  }, [data, frameIndex]);

  if (!data) return <div className="text-white p-10">Loading Ephemeris...</div>;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4">
      <div className="flex justify-between w-full mb-4 text-white">
        <h2 className="text-xl font-bold">Celestial Biome Map</h2>
        <div className="flex gap-4 items-center">
          <span>{data.timestamps[frameIndex].split('T')[0]}</span>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold transition-colors"
          >
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
        </div>
      </div>

      <div className="w-full aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-2xl relative">
        <Plot
          data={plotData}
          layout={{
            autosize: true,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            showlegend: false,
            margin: { t: 0, b: 0, l: 0, r: 0 },
            xaxis: { visible: false, range: [-45, 45], fixedrange: true },
            yaxis: { visible: false, range: [-45, 45], scaleanchor: 'x', fixedrange: true },
          }}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false, staticPlot: true }}
        />
      </div>
    </div>
  );
}
