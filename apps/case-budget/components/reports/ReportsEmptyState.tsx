import Link from "next/link";

import {
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

export type ReportsEmptyStateProps = {
  icon:
    LucideIcon;

  title:
    string;

  description:
    string;

  href:
    string;

  actionLabel:
    string;
};

export default function ReportsEmptyState({
  icon: Icon,
  title,
  description,
  href,
  actionLabel,
}: ReportsEmptyStateProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon className="h-5 w-5" />
      </div>

      <h2 className="mt-5 text-lg font-bold text-slate-950">
        {title}
      </h2>

      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {description}
      </p>

      <Link
        href={
          href
        }
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800"
      >
        {actionLabel}

        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}