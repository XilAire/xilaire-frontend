'use client';

import { useEffect, useState } from 'react';

type AutomationLog = {
  id: string;
  bot: string;
  automation: string;
  status: 'success' | 'failure';
  triggered_by: string;
  timestamp: string;
};

export default function AutomationsPage() {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [botFilter, setBotFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const init = async () => {
      const localBot = localStorage.getItem('automation_bot_filter');
      const localStatus = localStorage.getItem('automation_status_filter');

      if (localBot) setBotFilter(localBot);
      if (localStatus) setStatusFilter(localStatus);

      // Load default bot from user settings only if no filter in localStorage
      if (!localBot) {
        try {
          const res = await fetch('/api/settings/load');
          if (res.ok) {
            const settings = await res.json();
            setBotFilter(settings.default_bot || '');
          }
        } catch (err) {
          console.error('Failed to load user settings');
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    localStorage.setItem('automation_bot_filter', botFilter);
    localStorage.setItem('automation_status_filter', statusFilter);
  }, [botFilter, statusFilter]);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (botFilter) params.append('bot', botFilter);
        if (statusFilter) params.append('status', statusFilter);
        params.append('limit', pageSize.toString());
        params.append('offset', ((page - 1) * pageSize).toString());

        const res = await fetch(`/api/automations?${params.toString()}`);
        const data = await res.json();
        setLogs(data.logs || []);
      } catch (err) {
        console.error('Failed to load automation logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [botFilter, statusFilter, page]);

  const exportToCsv = () => {
    const csv = [
      ['Bot', 'Automation', 'Status', 'Triggered By', 'Timestamp'],
      ...logs.map((log) => [
        log.bot,
        log.automation,
        log.status,
        log.triggered_by,
        new Date(log.timestamp).toLocaleString()
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `automation_logs_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
      <h1 className="text-2xl font-bold">Automation Logs</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={botFilter}
          onChange={(e) => setBotFilter(e.target.value)}
          className="border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">All Bots</option>
          <option value="Nova">Nova</option>
          <option value="RevBot">RevBot</option>
          <option value="Clara">Clara</option>
          <option value="Pulse">Pulse</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>

        <button
          onClick={exportToCsv}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded"
        >
          Export CSV
        </button>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2">Bot</th>
              <th className="px-4 py-2">Automation</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Triggered By</th>
              <th className="px-4 py-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center">Loading...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center">No automation logs found.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t dark:border-gray-700">
                  <td className="px-4 py-2">{log.bot}</td>
                  <td className="px-4 py-2">{log.automation}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      log.status === 'success'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{log.triggered_by}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-4 mt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1 border rounded dark:border-gray-600"
        >
          Previous
        </button>
        <span className="text-sm">Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 border rounded dark:border-gray-600"
        >
          Next
        </button>
      </div>
    </div>
  );
}
