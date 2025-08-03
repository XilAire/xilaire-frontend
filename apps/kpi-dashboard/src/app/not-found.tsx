'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen px-4 text-center transition-colors duration-300 bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Logo */}
      <Image
        src="/logo_v2.png"
        alt="XilAire Logo"
        width={64}
        height={64}
        className="mb-4 rounded"
      />

      {/* 404 Text */}
      <h1 className="text-5xl font-bold mb-2 text-primary-600 dark:text-primary-400 animate-bounce">404</h1>
      <p className="text-lg mb-6">
        This page doesn’t exist. Redirecting you to the dashboard...
      </p>

      {/* Manual Redirect Option */}
      <Link
        href="/dashboard"
        className="bg-[#1f4157] hover:bg-[#163443] text-white px-6 py-2 rounded-md font-medium transition"
      >
        Go now
      </Link>
    </div>
  );
}
