// File: apps/kpi-dashboard/src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
// ← two levels up from src/app/dashboard → into src/components
import SummaryCard       from '../../components/SummaryCard';
import KpiChart          from '../../components/KpiChart';
// ← two levels up into src/lib
import { fetchKpiMetrics } from '../../lib/fetchKpiMetrics';

export default function DashboardPage() {
  const [summary, setSummary] = useState({
    runs: 0,
    errors: 0,
    tickets: 0,
  });

  // KPI Chart dropdown states
  const [bot, setBot]             = useState('Nova');
  const [metric, setMetric]       = useState('runs');
  const [startDate, setStartDate] = useState('2025-07-01');
  const [endDate, setEndDate]     = useState('2025-07-10');

  // Fetch summary KPIs (runs, errors, tickets)
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const metrics = await fetchKpiMetrics(startDate, endDate);
        const totals = metrics.reduce((acc: Record<string, number>, curr: any) => {
          const key = curr.metric.toLowerCase();
          acc[key] = (acc[key] || 0) + Number(curr.value);
          return acc;
        }, {});
        setSummary({
          runs:   totals.runs   || 0,
          errors: totals.errors || 0,
          tickets: totals.tickets || 0,
        });
      } catch (err) {
        console.error('Failed to fetch KPI summary:', err);
      }
    };
    fetchSummary();
  }, [startDate, endDate]);

  // Optionally fetch ticket count separately if not part of metrics
  useEffect(() => {
    const fetchTicketCount = async () => {
      try {
        const res = await fetch('/api/tickets');
        if (!res.ok) throw new Error('Failed to fetch tickets');
        const data = await res.json();
        setSummary(prev => ({ ...prev, tickets: data.count || 0 }));
      } catch (err) {
        console.error('Failed to fetch ticket count:', err);
      }
    };
    fetchTicketCount();
  }, []);

  return (
    <div className="space-y-8 px-6 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Welcome to the XilAire Dashboard
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard title="Runs Today"   value={summary.runs} />
        <SummaryCard title="Errors Today" value={summary.errors} />
        <SummaryCard title="Tickets Today" value={summary.tickets} />
      </div>

      {/* KPI Chart */}
      <div className="space-y-4">
        <KpiChart
          bot={bot}
          metric={metric}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </div>
  );
}
