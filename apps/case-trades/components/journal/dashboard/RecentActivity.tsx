"use client";

import Link from "next/link";
import {
  Activity,
  Bot,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileUp,
} from "lucide-react";

export type JournalRecentActivity = {
  id: string;
  type:
    | "TRADE_OPENED"
    | "TRADE_CLOSED"
    | "BROKER_IMPORT"
    | "AI_REVIEW"
    | "JOURNAL_NOTE"
    | "SCREENSHOT";
  title: string;
  description: string;
  symbol: string | null;
  occurredAt: string | null;
  href: string | null;
};

type RecentActivityProps = {
  activities: JournalRecentActivity[];
};

function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

  if (
    !Number.isFinite(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
      hour:
        "numeric",
      minute:
        "2-digit",
    },
  ).format(
    date,
  );
}

function getRecentActivityIcon(
  type: JournalRecentActivity["type"],
) {
  if (
    type ===
    "BROKER_IMPORT"
  ) {
    return <FileUp />;
  }

  if (
    type ===
    "AI_REVIEW"
  ) {
    return <Bot />;
  }

  if (
    type ===
    "JOURNAL_NOTE"
  ) {
    return <ClipboardList />;
  }

  if (
    type ===
    "SCREENSHOT"
  ) {
    return <Camera />;
  }

  if (
    type ===
    "TRADE_CLOSED"
  ) {
    return <CheckCircle2 />;
  }

  return <Activity />;
}

function getRecentActivityTone(
  type: JournalRecentActivity["type"],
) {
  if (
    type ===
    "BROKER_IMPORT"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (
    type ===
    "AI_REVIEW"
  ) {
    return "border-purple-500/20 bg-purple-500/10 text-purple-300";
  }

  if (
    type ===
    "SCREENSHOT"
  ) {
    return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  }

  if (
    type ===
    "TRADE_CLOSED"
  ) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-300";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
}

function RecentActivityItem({
  activity,
}: {
  activity: JournalRecentActivity;
}) {
  const content = (
    <div className="flex min-w-0 items-start gap-3">
      <div
        className={
          "shrink-0 rounded-lg border p-2 [&>svg]:h-4 [&>svg]:w-4 " +
          getRecentActivityTone(
            activity.type,
          )
        }
      >
        {getRecentActivityIcon(
          activity.type,
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-100">
            {activity.title}
          </p>

          {activity.symbol ? (
            <span className="rounded-full border border-white/10 bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
              {activity.symbol}
            </span>
          ) : null}
        </div>

        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
          {activity.description}
        </p>

        <p className="mt-2 text-[11px] text-slate-600">
          {formatDateTime(
            activity.occurredAt,
          )}
        </p>
      </div>

      {activity.href ? (
        <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-600" />
      ) : null}
    </div>
  );

  if (
    activity.href
  ) {
    return (
      <Link
        href={
          activity.href
        }
        className="min-w-0 rounded-xl border border-white/10 bg-slate-950 p-4 transition hover:border-emerald-500/20 hover:bg-slate-950/80"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950 p-4">
      {content}
    </div>
  );
}

export default function RecentActivity({
  activities,
}: RecentActivityProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5 md:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <Clock3 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Recent Activity
              </h2>

              <p className="text-sm text-slate-400">
                Latest trade, import, journal, screenshot, and AI review activity.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/journal/reports"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300 transition hover:text-emerald-200"
        >
          View Reports
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-slate-950 px-4 py-8 text-center text-sm text-slate-500">
          No recent journal activity is available yet.
        </div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {activities.map(
            (
              activity,
            ) => (
              <RecentActivityItem
                key={
                  activity.id
                }
                activity={
                  activity
                }
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}
