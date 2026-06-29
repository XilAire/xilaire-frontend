export default function EmptyState({ label }: { label: string }) {
  return (
    <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
      No {label} found.
    </p>
  );
}
