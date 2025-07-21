'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

export default function DarkModeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const res = await fetch('/api/settings/load');
        const data = await res.json();
        const theme = data.theme || 'light';

        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        setDarkMode(isDark);
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('theme', theme);
      } catch (err) {
        console.error('Failed to load theme:', err);
      }
    };

    loadTheme();
  }, []);

  const toggle = async () => {
    const isDark = !darkMode;
    setDarkMode(isDark);

    const theme = isDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);

    try {
      await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      });
      toast.success(`Switched to ${theme} mode`);
    } catch (err) {
      toast.error('Failed to save theme preference');
    }
  };

  return (
    <button
      onClick={toggle}
      className="text-sm px-3 py-1 rounded bg-white text-black dark:bg-gray-800 dark:text-white border dark:border-gray-600"
    >
      {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
    </button>
  );
}
