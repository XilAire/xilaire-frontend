// File: src/app/dashboard/layout.tsx
import { ReactNode } from 'react';

export const metadata = {
  title: 'Dashboard | XilAire',
  description: 'Your live bot automation overview',
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
