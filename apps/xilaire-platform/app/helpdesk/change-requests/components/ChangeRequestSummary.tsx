export default function ChangeRequestSummary({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  return (
    <div className="rounded-xl p-5 bg-white border border-slate-300 
      dark:bg-slate-900 dark:border-slate-800 shadow-lg">
      <p className="text-slate-500 dark:text-slate-400 text-sm">
        {label}
      </p>
      <p className="text-3xl font-bold text-slate-900 dark:text-white">
        {count}
      </p>
    </div>
  );
}
