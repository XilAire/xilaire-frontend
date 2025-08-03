'use client';

import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1f4157] text-white flex flex-col p-4">
        <h2 className="text-2xl font-bold mb-6">XilAire</h2>
        <nav className="flex flex-col gap-4">
          <a href="#" className="hover:underline">Dashboard</a>
          <a href="#" className="hover:underline">Bots</a>
          <a href="#" className="hover:underline">Reports</a>
          <a href="#" className="hover:underline">Settings</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
