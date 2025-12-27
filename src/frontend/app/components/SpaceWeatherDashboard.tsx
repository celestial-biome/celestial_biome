'use client';

import React, { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
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

export default function SpaceWeatherDashboard() {
  const [data, setData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 環境変数経由のAPI URL、またはローカルプロキシ
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

  // 共通のX軸フォーマット
  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-black/80 rounded-xl space-y-2">
      <h2 className="text-xl text-white font-bold mb-4">Space Weather Dashboard (Last 7 Days)</h2>

      {/* 1. X-Ray Flux (Log scale) */}
      <div className="h-[250px] w-full">
        <h3 className="text-sm text-gray-300 ml-2">GOES X-Ray Flux (W/m²)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="spaceWeather">
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="timestamp" hide />
            <YAxis scale="log" domain={['auto', 'auto']} stroke="#ccc" />
            <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
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
        <h3 className="text-sm text-gray-300 ml-2">Solar Wind Speed (km/s)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="spaceWeather">
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="timestamp" hide />
            <YAxis domain={['auto', 'auto']} stroke="#ccc" />
            <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
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
        <h3 className="text-sm text-gray-300 ml-2">IMF Bz (nT)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="spaceWeather">
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="timestamp" hide />
            <YAxis stroke="#ccc" />
            <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
            <Line type="monotone" dataKey="imf_bz" stroke="#FFBB28" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 4. Kp Index */}
      <div className="h-[200px] w-full">
        <h3 className="text-sm text-gray-300 ml-2">Planetary Kp Index</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="spaceWeather">
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="timestamp" tickFormatter={formatXAxis} stroke="#ccc" minTickGap={50} />
            <YAxis domain={[0, 9]} ticks={[0, 3, 5, 9]} stroke="#ccc" />
            <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
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
  );
}
