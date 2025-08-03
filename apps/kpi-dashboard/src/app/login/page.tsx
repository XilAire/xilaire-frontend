'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    console.log('Login response:', data);
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else if (!data?.session) {
      toast.error('No session returned. Check Supabase config.');
      console.warn('Login succeeded but session is missing:', data);
    } else {
      // ✅ Manually store session in cookies for middleware compatibility
      const session = data.session;
      const expires = new Date(session.expires_at! * 1000).toUTCString();

      document.cookie = `sb-access-token=${session.access_token}; path=/; expires=${expires}`;
      document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; expires=${expires}`;

      toast.success('Logged in!');
      const redirectedFrom = new URLSearchParams(window.location.search).get('redirectedFrom');
      router.push(redirectedFrom || '/dashboard');
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 space-y-4 bg-white dark:bg-gray-800 rounded shadow">
      <h1 className="text-2xl font-bold text-center">Sign In</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border px-3 py-2 rounded-md bg-white dark:bg-gray-900 dark:text-white"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border px-3 py-2 rounded-md bg-white dark:bg-gray-900 dark:text-white"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="text-sm text-center">
        Don’t have an account?{' '}
        <a href="/signup" className="text-blue-600 hover:underline dark:text-blue-400">
          Sign up
        </a>
      </p>
    </div>
  );
}
