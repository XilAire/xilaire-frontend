// File: src/app/page.tsx
'use client';

import KpiGrid from './components/KpiGrid';

export default function HomePage() {
  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Automation Dashboard</h1>
      <KpiGrid />
    </>
  );
}
