export default function LegalLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 text-sm text-slate-200">
      {children}
    </section>
  );
}
