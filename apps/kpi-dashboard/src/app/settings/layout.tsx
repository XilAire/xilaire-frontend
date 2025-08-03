// File: apps/kpi-dashboard/src/app/settings/layout.tsx
import { ReactNode } from 'react';

export const metadata = {
  title: 'Settings | XilAire',
  description: 'Configure preferences, integrations, and account settings.',
};

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
