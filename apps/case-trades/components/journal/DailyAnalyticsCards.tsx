"use client";

import {
  CalendarDays,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export type DailyPnlPoint = {
  dateKey: string;
  label: string;
  trades: number;
  winners: number;
  losers: number;
  breakevens: number;
  netPnl: number;
};

type DailyAnalyticsCardsProps = {
  days: DailyPnlPoint[];
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const absolute = Math.abs(amount).toFixed(2);

  return `${prefix}$${absolute}`;
}

function getBestDay(days: DailyPnlPoint[]) {
  return days.reduce<DailyPnlPoint | null>((best, day) => {
    if (!best) return day;

    return day.netPnl > best.netPnl ? day : best;
  }, null);
}

function getWorstDay(days: DailyPnlPoint[]) {
  return days.reduce<DailyPnlPoint | null>((worst, day) => {
    if (!worst) return day;

    return day.netPnl < worst.netPnl ? day : worst;
  }, null);
}

function DailyCard({
  title,
  value,
  subtitle,
  icon,
  positive = false,
  negative = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
      <div
        className={
          "mb-3 [&>svg]:h-5 [&>svg]:w-5 " +
          (negative
            ? "text-red-400"
            : positive
              ? "text-emerald-400"
              : "text-slate-400")
        }
      >
        {icon}
      </div>

      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p
        className={
          "mt-1 text-xl font-semibold " +
          (negative
            ? "text-red-400"
            : positive
              ? "text-emerald-400"
              : "text-slate-100")
        }
      >
        {value}
      </p>

      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

export default function DailyAnalyticsCards({ days }: DailyAnalyticsCardsProps) {
  const tradingDays = days.filter((day) => day.trades > 0);

  const greenDays = tradingDays.filter((day) => day.netPnl > 0);
  const redDays = tradingDays.filter((day) => day.netPnl < 0);
  const flatDays = tradingDays.filter((day) => day.netPnl === 0);

  const bestDay = getBestDay(tradingDays);
  const worstDay = getWorstDay(tradingDays);

  const totalDailyPnl = tradingDays.reduce(
    (sum, day) => sum + Number(day.netPnl ?? 0),
    0
  );

  const averageDailyPnl =
    tradingDays.length > 0 ? totalDailyPnl / tradingDays.length : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <DailyCard
        title="Green Days"
        value={String(greenDays.length)}
        subtitle={`${tradingDays.length} trading days`}
        icon={<TrendingUp />}
        positive={greenDays.length > 0}
      />

      <DailyCard
        title="Red Days"
        value={String(redDays.length)}
        subtitle={`${tradingDays.length} trading days`}
        icon={<TrendingDown />}
        negative={redDays.length > 0}
      />

      <DailyCard
        title="Flat Days"
        value={String(flatDays.length)}
        subtitle={`${tradingDays.length} trading days`}
        icon={<Target />}
      />

      <DailyCard
        title="Best Day"
        value={bestDay ? formatMoney(bestDay.netPnl) : "$0.00"}
        subtitle={bestDay?.label ?? "No closed trades"}
        icon={<TrendingUp />}
        positive={Number(bestDay?.netPnl ?? 0) > 0}
      />

      <DailyCard
        title="Worst Day"
        value={worstDay ? formatMoney(worstDay.netPnl) : "$0.00"}
        subtitle={worstDay?.label ?? "No closed trades"}
        icon={<TrendingDown />}
        negative={Number(worstDay?.netPnl ?? 0) < 0}
      />

      <DailyCard
        title="Avg Daily P/L"
        value={formatMoney(averageDailyPnl)}
        subtitle={`${tradingDays.length} active days`}
        icon={<CalendarDays />}
        positive={averageDailyPnl > 0}
        negative={averageDailyPnl < 0}
      />
    </div>
  );
}