// File: apps/kpi-dashboard/src/app/dashboard/KpiDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import KpiChart      from '../components/KpiChart';
import SummaryCard   from '../components/SummaryCard';
import { fetchKpiMetrics } from '../../lib/fetchKpiMetrics';
import { toast }     from 'react-hot-toast';

export default function KpiDashboard() {
  const [bot, setBot]             = useState('');
  const [metric, setMetric]       = useState('');
  const [startDate, setStartDate] = useState('2025-07-01');
  const [endDate, setEndDate]     = useState('2025-07-17');

  const [total, setTotal]         = useState(0);
  const [avgPerDay, setAvgPerDay] = useState(0);
  const [daysTracked, setDaysTracked] = useState(0);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Load saved user settings on mount
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const res  = await fetch('/api/settings/load');
        const data = await res.json();
        setBot(data.default_bot   || 'Nova');
        setMetric(data.default_metric || 'runs');
      } catch {
        setBot('Nova');
        setMetric('runs');
      } finally {
        setLoadingSettings(false);
      }
    };
    loadDefaults();
  }, []);

  // Fetch KPI metrics after settings loaded
  useEffect(() => {
    if (!bot || !metric) return;

    const loadSummary = async () => {
      try {
        const res = await fetchKpiMetrics(startDate, endDate, bot, metric);
        const sum = res.reduce((acc, item) => acc + Number(item.value), 0);
        setTotal(sum);
        setDaysTracked(res.length);
        setAvgPerDay(sum / (res.length || 1));
      } catch {
        toast.error('Failed to load summary KPI data');
      }
    };
    loadSummary();
  }, [startDate, endDate, bot, metric]);

  const handleSendToTeams = async () => {
    try {
      await fetch('/api/notify-teams', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bot, metric, total, startDate, endDate }),
      });
      toast.success('Sent to Microsoft Teams');
    } catch {
      toast.error('Failed to send to Teams');
    }
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
      <h1 className="text-2xl font-bold">KPI Dashboard</h1>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          value={bot}
          onChange={(e) => setBot(e.target.value)}
          className="border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="Nova">Nova</option>
          <option value="Clara">Clara</option>
          <option value="RevBot">RevBot</option>
          <option value="Pulse">Pulse</option>
        </select>

        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className="border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="runs">Runs</option>
          <option value="errors">Errors</option>
          <option value="tickets">Tickets</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="Total" value={total} />
        <SummaryCard title="Avg / Day" value={parseFloat(avgPerDay.toFixed(2))} />
        <SummaryCard title="Days Tracked" value={daysTracked} />
      </div>

      {/* KPI Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        {loadingSettings ? (
          <p>Loading user settings...</p>
        ) : (
          <KpiChart bot={bot} metric={metric} startDate={startDate} endDate={endDate} />
        )}
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto mt-6">
        <h2 className="text-lg font-semibold mb-2">Bot Comparison</h2>
        <table className="min-w-full text-sm dark:text-white">
          <thead>
            <tr className="text-left bg-gray-100 dark:bg-gray-700">
              <th className="py-2 px-4">Bot</th>
              <th className="py-2 px-4">Runs</th>
              <th className="py-2 px-4">Errors</th>
              <th className="py-2 px-4">Tickets</th>
            </tr>
          </thead>
          <tbody>
            {['Nova', 'Clara', 'RevBot'].map((b) => (
              <tr key={b} className="border-t dark:border-gray-700">
                <td className="py-2 px-4 font-medium">{b}</td>
                <td className="py-2 px-4">{Math.floor(Math.random() * 150)}</td>
                <td className="py-2 px-4">{Math.floor(Math.random() * 10)}</td>
                <td className="py-2 px-4">{Math.floor(Math.random() * 20)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insights & Actions */}
      <div className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold">Insights & Actions</h2>
        <ul className="list-disc pl-6 text-sm text-gray-700 dark:text-gray-300">
          <li>Nova triggered the highest number of automations this week.</li>
          <li>Clara had 0 errors – system is stable.</li>
          <li>Consider reviewing automation load on RevBot (spike on 7/12).</li>
        </ul>
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => toast.success('Exported CSV (mock)')}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Export CSV
          </button>
          <button
            onClick={handleSendToTeams}
            className="bg-gray-200 dark:bg-gray-700 dark:text-white px-4 py-2 rounded"
          >
            Send to Teams
          </button>
        </div>
      </div>
    </div>
  );
}
