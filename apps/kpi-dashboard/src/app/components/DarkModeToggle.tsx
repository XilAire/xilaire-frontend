'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

export default function DarkModeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  const applyTheme = (theme: string) => {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  };

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;

        const { data: setting, error: settingError } = await supabase
          .from('settings')
          .select('theme')
          .eq('user_id', user?.id)
          .single();
        // PGRST116 = “no rows found” is OK
        if (settingError && settingError.code !== 'PGRST116') throw settingError;

        const theme =
          setting?.theme ?? localStorage.getItem('theme') ?? 'light';
        applyTheme(theme);
      } catch (err) {
        console.error('Failed to load theme:', err);
        applyTheme(localStorage.getItem('theme') ?? 'light');
      }
    })();
  }, []);

  const toggle = async () => {
    const nextTheme = darkMode ? 'light' : 'dark';
    applyTheme(nextTheme);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      const { error: upsertError } = await supabase
        .from('settings')
        .upsert(
          { user_id: user.id, theme: nextTheme },
          { onConflict: 'user_id' }
        );
      if (upsertError) throw upsertError;

      toast.success(`Switched to ${nextTheme} mode`);
    } catch (err) {
      console.error('Error saving theme preference:', err);
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
