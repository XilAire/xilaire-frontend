"use client";

interface StatusPillProps {
  status?: string | null;
}

/* -------------------------------------------------
   STATUS STYLE MAP
------------------------------------------------- */
const statusStyles: Record<string, string> = {
  open: `
    bg-blue-500/10 text-blue-400
    border border-blue-500/30
  `,
  pending: `
    bg-amber-500/10 text-amber-400
    border border-amber-500/30
  `,
  in_progress: `
    bg-purple-500/10 text-purple-400
    border border-purple-500/30
  `,
  resolved: `
    bg-emerald-500/10 text-emerald-400
    border border-emerald-500/30
  `,
  closed: `
    bg-slate-500/10 text-slate-400
    border border-slate-500/30
  `,
  unknown: `
    bg-slate-700/40 text-slate-300
    border border-slate-600
  `,
};

/* -------------------------------------------------
   COMPONENT
------------------------------------------------- */
export default function StatusPill({ status }: StatusPillProps) {
  // Normalize status input
  const normalized =
    status
      ?.toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-+/g, "_") ?? "unknown";

  const label = normalized.replace(/_/g, " ");

  return (
    <span
      className={`
        inline-flex items-center rounded-full px-3 py-1
        text-xs font-medium capitalize border
        ${statusStyles[normalized] ?? statusStyles.unknown}
      `}
    >
      {label}
    </span>
  );
}
