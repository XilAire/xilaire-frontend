// File: xilaire-frontend/src/app/ClientLayout.tsx
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

// ← fixed relative paths into src/components
import Sidebar        from './components/Sidebar';
import DarkModeToggle from './components/DarkModeToggle';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.remove('light', 'dark');
    if (theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(dark ? 'dark' : 'light');
    } else {
      document.documentElement.classList.add(theme);
    }
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 bg-gray-50 dark:bg-gray-900 overflow-auto">
        <div className="flex justify-end mb-4">
          <DarkModeToggle />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
