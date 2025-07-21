// app/settings/layout.tsx
export const metadata = {
  title: 'Settings | XilAire',
  description: 'Configure preferences, integrations, and account settings.',
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
