"use client";

import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  CircleDollarSign,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

type DashboardStatsProps = {
  todayPnl: number;
  sevenDayPnl: number;
  thirtyDayPnl: number;
  openTradeCount: number;
  winRate: number | null;
  profitFactor: number | null;
  averageWinner: number | null;
  averageLoser: number | null;
  totalTrades: number;
  totalPnl: number;
  bestTradePnl: number | null;
};

function formatCurrency(value: number | null) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    },
  ).format(value);
}

export default function DashboardStats({
  todayPnl,
  sevenDayPnl,
  thirtyDayPnl,
  openTradeCount,
  winRate,
  profitFactor,
  averageWinner,
  averageLoser,
  totalTrades,
  totalPnl,
  bestTradePnl,
}: DashboardStatsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <JournalStat
          title="Today's P/L"
          value={formatCurrency(
            todayPnl,
          )}
          icon={<TrendingUp />}
          tone={
            todayPnl > 0
              ? "positive"
              : todayPnl < 0
                ? "negative"
                : "neutral"
          }
        />

        <JournalStat
          title="7-Day P/L"
          value={formatCurrency(
            sevenDayPnl,
          )}
          icon={<BarChart3 />}
          tone={
            sevenDayPnl > 0
              ? "positive"
              : sevenDayPnl < 0
                ? "negative"
                : "neutral"
          }
        />

        <JournalStat
          title="30-Day P/L"
          value={formatCurrency(
            thirtyDayPnl,
          )}
          icon={
            <CircleDollarSign />
          }
          tone={
            thirtyDayPnl > 0
              ? "positive"
              : thirtyDayPnl < 0
                ? "negative"
                : "neutral"
          }
        />

        <JournalStat
          title="Open Trades"
          value={String(
            openTradeCount,
          )}
          icon={<Activity />}
        />

        <JournalStat
          title="Win Rate"
          value={
            winRate !== null
              ? `${winRate.toFixed(
                  1,
                )}%`
              : "—"
          }
          icon={<Trophy />}
        />

        <JournalStat
          title="Profit Factor"
          value={
            profitFactor !== null
              ? profitFactor.toFixed(
                  2,
                )
              : "—"
          }
          icon={<Target />}
          tone={
            profitFactor !== null &&
            profitFactor >= 1
              ? "positive"
              : profitFactor !==
                    null &&
                  profitFactor < 1
                ? "negative"
                : "neutral"
          }
        />

        <JournalStat
          title="Average Winner"
          value={formatCurrency(
            averageWinner,
          )}
          icon={<TrendingUp />}
          tone={
            averageWinner !== null
              ? "positive"
              : "neutral"
          }
        />

        <JournalStat
          title="Average Loser"
          value={
            averageLoser !== null
              ? formatCurrency(
                  -Math.abs(
                    averageLoser,
                  ),
                )
              : "—"
          }
          icon={<Target />}
          tone={
            averageLoser !== null
              ? "negative"
              : "neutral"
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <JournalStat
          title="Total Trades"
          value={String(
            totalTrades,
          )}
          icon={<BookOpen />}
        />

        <JournalStat
          title="Net P/L"
          value={formatCurrency(
            totalPnl,
          )}
          icon={
            <CircleDollarSign />
          }
          tone={
            totalPnl > 0
              ? "positive"
              : totalPnl < 0
                ? "negative"
                : "neutral"
          }
        />

        <JournalStat
          title="Best Trade"
          value={formatCurrency(
            bestTradePnl,
          )}
          icon={<Trophy />}
          tone={
            bestTradePnl !== null &&
            bestTradePnl > 0
              ? "positive"
              : bestTradePnl !==
                    null &&
                  bestTradePnl < 0
                ? "negative"
                : "neutral"
          }
        />
      </div>
    </div>
  );
}

function JournalStat({
  title,
  value,
  icon,
  tone = "neutral",
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone?:
    | "positive"
    | "negative"
    | "neutral";
}) {
  const iconClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-red-400"
        : "text-emerald-400";

  const valueClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-red-400"
        : "text-slate-100";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div
        className={`mb-3 [&>svg]:h-5 [&>svg]:w-5 ${iconClass}`}
      >
        {icon}
      </div>

      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p
        className={`mt-1 text-2xl font-semibold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}
