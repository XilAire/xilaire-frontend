'use client';

import { useEffect, useState } from 'react';
import { fetchKpiMetrics } from '@/lib/fetchKpiMetrics';

type Metric = {
  id: number;
  bot: string;
  metric: string;
  value: number;
  timestamp: string;
};

export default function KpiOverview() {
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await fetchKpiMetrics();
      setMetrics(data);
    };
    load();
  }, []);

  const grouped = metrics.reduce((acc, curr) => {
    const bot = curr.bot;
    const key = `${bot}_${curr.metric}`;
    acc[key] = (acc[key] || 0) + curr.value;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(grouped).map(([key, val]) => (
        <div
          key={key}
          className="bg-white rounded-xl shadow p-4 border text-center"
        >
          <div className="text-sm text-gray-500">{key}</div>
          <div className="text-2xl font-bold">{val}</div>
        </div>
      ))}
    </div>
  );
}
