// app/kpis/layout.tsx
export const metadata = {
  title: 'KPIs | XilAire',
  description: 'Track performance metrics and trends of your automation bots.',
};

export default function KpiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
