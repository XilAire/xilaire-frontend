// app/dashboard/layout.tsx
export const metadata = {
  title: 'Dashboard | XilAire',
  description: 'Your live bot automation overview',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
