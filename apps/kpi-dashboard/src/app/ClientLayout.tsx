'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Sidebar from './components/Sidebar';
import DarkModeToggle from './components/DarkModeToggle';

const publicRoutes = ['/signup', '/login'];

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (savedTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(savedTheme);
    }

    setMounted(true);
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      const isPublic = publicRoutes.includes(pathname);

      if (!session && !isPublic) {
        router.push('/login');
      }

      if (session && pathname === '/login') {
        router.push('/dashboard');
      }

      setLoadingAuth(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') router.push('/dashboard');
      if (event === 'SIGNED_OUT') router.push('/login');
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  if (!mounted || loadingAuth) return null;

  const isPublic = publicRoutes.includes(pathname);

  return (
    <div className="flex min-h-screen">
      {!isPublic && <Sidebar />}
      <main className="flex-1">
        {!isPublic && (
          <div className="flex justify-end items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <DarkModeToggle />
              <button
                onClick={async () => {
                  const { error } = await supabase.auth.signOut();
                  if (error) {
                    console.error('Logout error:', error.message);
                  }
                }}
                className="text-sm px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
              >
                Log Out
              </button>
            </div>
          </div>
        )}
        <div className="p-4">{children}</div>
      </main>
    </div>
  );
}
