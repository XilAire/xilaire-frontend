'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

const defaultSettings = {
  theme: 'light',
  notifications_enabled: true,
  default_bot: 'Nova',
  default_metric: 'runs',
};

export default function SettingsPage() {
  const [theme, setTheme] = useState(defaultSettings.theme);
  const [notificationsEnabled, setNotificationsEnabled] = useState(defaultSettings.notifications_enabled);
  const [defaultBot, setDefaultBot] = useState(defaultSettings.default_bot);
  const [defaultMetric, setDefaultMetric] = useState(defaultSettings.default_metric);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ⬇️ Apply theme to HTML root on change
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // ⬇️ Load from Supabase on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings/load');
        if (res.ok) {
          const data = await res.json();
          setTheme(data.theme || defaultSettings.theme);
          setNotificationsEnabled(data.notifications_enabled ?? defaultSettings.notifications_enabled);
          setDefaultBot(data.default_bot || defaultSettings.default_bot);
          setDefaultMetric(data.default_metric || defaultSettings.default_metric);

          // Update localStorage for dashboard defaults
          localStorage.setItem('defaultBot', data.default_bot || defaultSettings.default_bot);
          localStorage.setItem('defaultMetric', data.default_metric || defaultSettings.default_metric);
        }
      } catch (err) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, notifications_enabled: notificationsEnabled, default_bot: defaultBot, default_metric: defaultMetric }),
      });

      if (!res.ok) throw new Error('Failed to save');
      toast.success('Settings saved!');

      // Persist to localStorage
      localStorage.setItem('defaultBot', defaultBot);
      localStorage.setItem('defaultMetric', defaultMetric);
    } catch (err) {
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setTheme(defaultSettings.theme);
    setNotificationsEnabled(defaultSettings.notifications_enabled);
    setDefaultBot(defaultSettings.default_bot);
    setDefaultMetric(defaultSettings.default_metric);
    toast('Reset to default');

    // Optionally save reset
    saveSettings();
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">
      <h2 className="text-2xl font-bold">User Settings</h2>

      {loading ? (
        <p>Loading settings...</p>
      ) : (
        <>
          {/* Theme */}
          <div>
            <label className="block mb-1 font-medium">Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Notifications */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notifications"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="notifications" className="font-medium">Enable Notifications</label>
          </div>

          {/* Default Bot */}
          <div>
            <label className="block mb-1 font-medium">Default Bot</label>
            <select
              value={defaultBot}
              onChange={(e) => setDefaultBot(e.target.value)}
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="Nova">Nova</option>
              <option value="Clara">Clara</option>
              <option value="RevBot">RevBot</option>
              <option value="Pulse">Pulse</option>
              <option value="Elliot">Elliot</option>
              <option value="FixBot">FixBot</option>
              <option value="Aero">Aero</option>
              <option value="Lexa">Lexa</option>
              <option value="LedgerBot">LedgerBot</option>
              <option value="SysBot">SysBot</option>
              <option value="OpsBot">OpsBot</option>
            </select>
          </div>

          {/* Default Metric */}
          <div>
            <label className="block mb-1 font-medium">Default Metric</label>
            <select
              value={defaultMetric}
              onChange={(e) => setDefaultMetric(e.target.value)}
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="runs">Runs</option>
              <option value="errors">Errors</option>
              <option value="tickets">Tickets</option>
              <option value="uptime">Uptime</option>
              <option value="alerts">Alerts</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex space-x-4 mt-6">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={resetToDefault}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reset to Default
            </button>
          </div>
        </>
      )}
    </div>
  );
}
