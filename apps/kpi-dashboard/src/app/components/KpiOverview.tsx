// File: xilaire-frontend/src/app/components/KpiOverview.tsx
'use client';

import { useEffect, useState } from 'react';
// from src/app/components → go up two levels into src/lib
import { fetchKpiMetrics } from '../../lib/fetchKpiMetrics';

type Metric = {
  id: number;
  bot: string;
  metric: string;
  value: number;
  timestamp: string;
};

export default function KpiOverview() {
  const [metrics, setMetrics] = useState<Metric[]>([]);

  // default to last 7 days
  const today      = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  useEffect(() => {
    const load = async () => {
      // pass startDate and endDate
      const data = await fetchKpiMetrics(sevenDaysAgo, today);
      setMetrics(data);
    };
    load();
  }, [sevenDaysAgo, today]);

  const grouped = metrics.reduce((acc, curr) => {
    const key = `${curr.bot}_${curr.metric}`;
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
