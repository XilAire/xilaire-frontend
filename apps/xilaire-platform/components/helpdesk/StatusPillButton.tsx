"use client";

export default function StatusPillButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: (v: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-4 py-1.5 text-xs font-medium rounded-full capitalize border transition
      ${
        active
          ? "bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-900/40"
          : "bg-slate-200/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-300/70 dark:hover:bg-slate-700/70 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
