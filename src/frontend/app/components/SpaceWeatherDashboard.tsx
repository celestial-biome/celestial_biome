'use client';

import React, { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type WeatherData = {
  timestamp: string;
  xray_flux?: number;
  solar_wind_speed?: number;
  imf_bz?: number;
  kp_index?: number;
};

// --- 用語解説データ ---
const METRICS_INFO = [
  {
    label: 'GOES X-Ray Flux',
    description:
      '太陽フレアの強度を示す指標（対数スケール）。強度に応じてA, B, C, M, Xのクラスに分類されます。Mクラス以上が発生すると、地球の電離層が乱され、無線通信障害（デリンジャー現象）を引き起こす可能性があります。',
    color: 'text-orange-400',
  },
  {
    label: 'Solar Wind Speed',
    description:
      '太陽から吹き出すプラズマ（太陽風）の速度。通常は300〜400km/s程度ですが、コロナホールからの高速風やCME（コロナ質量放出）が到達すると500km/s以上に上昇し、地磁気を乱す大きな要因となります。',
    color: 'text-emerald-400',
  },
  {
    label: 'IMF Bz (GSM)',
    description:
      '惑星間空間磁場（IMF）の南北成分。この値が「マイナス（南向き）」になると、地球の磁力線と結合してエネルギーが流入しやすくなり、磁気嵐やオーロラ活動が活発化します。',
    color: 'text-yellow-400',
  },
  {
    label: 'Planetary Kp Index',
    description:
      '地磁気の乱れ具合を0〜9の階級で表した指数。数値が大きいほど乱れが大きく、一般にKp=5以上で「磁気嵐」と判定されます。数値が高いと低緯度でもオーロラが見える可能性があります。',
    color: 'text-orange-500',
  },
];

export default function SpaceWeatherDashboard() {
  const [data, setData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/v1/astronomy/space-weather/`);

        if (!res.ok) throw new Error('Failed to fetch data');

        const jsonData = await res.json();
        setData(jsonData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-white p-4">Loading Space Weather Data...</div>;
  if (!data.length) return <div className="text-white p-4">No data available.</div>;

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* グラフエリア */}
      {/* 修正: p-4 -> p-6, space-y-2 -> space-y-10 (間隔を大きく広げました) */}
      <div className="p-6 bg-black/80 rounded-xl space-y-10">
        <h2 className="text-xl text-white font-bold mb-6">Space Weather Dashboard (Last 7 Days)</h2>

        {/* 1. X-Ray Flux */}
        <div className="h-[250px] w-full">
          <h3 className="text-sm text-gray-300 ml-2 mb-2">GOES X-Ray Flux (W/m²)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} syncId="spaceWeather" margin={{ right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="timestamp" hide />
              <YAxis
                scale="log"
                domain={[1e-9, 1e-2]}
                ticks={[1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2]}
                stroke="#ccc"
              />
              <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', color: '#fff' }} />

              {/* A Class (1e-8 ~ 1e-7) */}
              <ReferenceArea y1={1e-8} y2={1e-7} fill="#4ade80" fillOpacity={0.05} stroke="none">
                <Label
                  value="A"
                  position="right"
                  fill="#666"
                  fontSize={12}
                  style={{ alignmentBaseline: 'middle' }}
                />
              </ReferenceArea>
              {/* B Class (1e-7 ~ 1e-6) */}
              <ReferenceArea y1={1e-7} y2={1e-6} fill="#a3e635" fillOpacity={0.05} stroke="none">
                <Label
                  value="B"
                  position="right"
                  fill="#888"
                  fontSize={12}
                  style={{ alignmentBaseline: 'middle' }}
                />
              </ReferenceArea>
              {/* C Class (1e-6 ~ 1e-5) */}
              <ReferenceArea y1={1e-6} y2={1e-5} fill="#facc15" fillOpacity={0.08} stroke="none">
                <Label
                  value="C"
                  position="right"
                  fill="#aaa"
                  fontSize={12}
                  style={{ alignmentBaseline: 'middle' }}
                />
              </ReferenceArea>
              {/* M Class (1e-5 ~ 1e-4) */}
              <ReferenceArea y1={1e-5} y2={1e-4} fill="#fb923c" fillOpacity={0.15} stroke="none">
                <Label
                  value="M"
                  position="right"
                  fill="#fb923c"
                  fontWeight="bold"
                  fontSize={14}
                  style={{ alignmentBaseline: 'middle' }}
                />
              </ReferenceArea>
              {/* X Class (1e-4 ~ 1e-2) */}
              <ReferenceArea y1={1e-4} y2={1e-2} fill="#ef4444" fillOpacity={0.2} stroke="none">
                <Label
                  value="X"
                  position="right"
                  fill="#ef4444"
                  fontWeight="bold"
                  fontSize={14}
                  style={{ alignmentBaseline: 'middle' }}
                />
              </ReferenceArea>

              <Line
                type="monotone"
                dataKey="xray_flux"
                stroke="#ff7300"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 2. Solar Wind Speed */}
        <div className="h-[200px] w-full">
          <h3 className="text-sm text-gray-300 ml-2 mb-2">Solar Wind Speed (km/s)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} syncId="spaceWeather" margin={{ right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="timestamp" hide />
              <YAxis domain={['auto', 'auto']} stroke="#ccc" />
              <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', color: '#fff' }} />
              <Line
                type="monotone"
                dataKey="solar_wind_speed"
                stroke="#00C49F"
                dot={false}
                strokeWidth={1.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 3. IMF Bz */}
        <div className="h-[200px] w-full">
          <h3 className="text-sm text-gray-300 ml-2 mb-2">IMF Bz (nT)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} syncId="spaceWeather" margin={{ right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="timestamp" hide />
              <YAxis stroke="#ccc" />
              <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', color: '#fff' }} />
              <Line
                type="monotone"
                dataKey="imf_bz"
                stroke="#FFBB28"
                dot={false}
                strokeWidth={1.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 4. Kp Index */}
        <div className="h-[200px] w-full">
          <h3 className="text-sm text-gray-300 ml-2 mb-2">Planetary Kp Index</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} syncId="spaceWeather" margin={{ right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="#ccc"
                minTickGap={50}
              />
              <YAxis domain={[0, 9]} ticks={[0, 3, 5, 9]} stroke="#ccc" />
              <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', color: '#fff' }} />
              <Line
                type="stepAfter"
                dataKey="kp_index"
                stroke="#FF8042"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 用語解説セクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-900/80 rounded-xl">
        <h3 className="text-lg font-bold text-white col-span-full mb-2">Metrics Reference</h3>
        {METRICS_INFO.map((info) => (
          <div key={info.label} className="bg-black/40 p-3 rounded border border-gray-800">
            <h4 className={`font-bold text-sm mb-1 ${info.color}`}>{info.label}</h4>
            <p className="text-xs text-gray-400 leading-relaxed">{info.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
