"use client";

import {
  Activity,
  BarChart3,
  BookOpen,
  Clock,
  DollarSign,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";

import ReportStatCard from "@/components/journal/ReportStatCard";

type ReportKpiGridProps = {
  winRate: number;
  profitFactor: number;
  averageWinner: number;
  averageLoser: number;
  expectancy: number;
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  breakevenTrades: number;
  netPnl: number;
  totalProfit: number;
  totalLoss: number;
  averageHoldMinutes: number | null;
  maxDrawdown: number;
  maxDrawdownPct: number;
  longestWinStreak: number;
  longestLossStreak: number;
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const absolute = Math.abs(amount).toFixed(2);

  return `${prefix}$${absolute}`;
}

function formatDuration(minutes: number | null) {
  if (minutes === null) {
    return "—";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export default function ReportKpiGrid({
  winRate,
  profitFactor,
  averageWinner,
  averageLoser,
  expectancy,
  totalTrades,
  closedTrades,
  openTrades,
  breakevenTrades,
  netPnl,
  totalProfit,
  totalLoss,
  averageHoldMinutes,
  maxDrawdown,
  maxDrawdownPct,
  longestWinStreak,
  longestLossStreak,
}: ReportKpiGridProps) {
  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-hidden">
      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ReportStatCard
          title="Win Rate"
          value={`${winRate.toFixed(0)}%`}
          icon={<Trophy />}
          positive={winRate >= 50}
          negative={closedTrades > 0 && winRate < 50}
        />

        <ReportStatCard
          title="Profit Factor"
          value={profitFactor.toFixed(2)}
          icon={<BarChart3 />}
          positive={profitFactor >= 1}
          negative={closedTrades > 0 && profitFactor < 1}
        />

        <ReportStatCard
          title="Average Winner"
          value={formatMoney(averageWinner)}
          icon={<TrendingUp />}
          positive={averageWinner > 0}
        />

        <ReportStatCard
          title="Average Loser"
          value={formatMoney(-averageLoser)}
          icon={<TrendingDown />}
          negative={averageLoser > 0}
        />

        <ReportStatCard
          title="Expectancy"
          value={formatMoney(expectancy)}
          icon={<Target />}
          positive={expectancy > 0}
          negative={expectancy < 0}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ReportStatCard
          title="Total Trades"
          value={String(totalTrades)}
          icon={<BookOpen />}
        />

        <ReportStatCard
          title="Closed Trades"
          value={String(closedTrades)}
          icon={<Activity />}
        />

        <ReportStatCard
          title="Open Trades"
          value={String(openTrades)}
          icon={<Activity />}
        />

        <ReportStatCard
          title="Breakevens"
          value={String(breakevenTrades)}
          icon={<Target />}
        />

        <ReportStatCard
          title="Net P/L"
          value={formatMoney(netPnl)}
          icon={<DollarSign />}
          positive={netPnl > 0}
          negative={netPnl < 0}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReportStatCard
          title="Total Profit"
          value={formatMoney(totalProfit)}
          icon={<TrendingUp />}
          positive={totalProfit > 0}
        />

        <ReportStatCard
          title="Total Loss"
          value={formatMoney(-totalLoss)}
          icon={<TrendingDown />}
          negative={totalLoss > 0}
        />

        <ReportStatCard
          title="Avg Hold Time"
          value={formatDuration(
            averageHoldMinutes !== null ? Math.round(averageHoldMinutes) : null
          )}
          icon={<Clock />}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportStatCard
          title="Max Drawdown"
          value={formatMoney(-maxDrawdown)}
          icon={<TrendingDown />}
          negative={maxDrawdown > 0}
        />

        <ReportStatCard
          title="Drawdown %"
          value={`${maxDrawdownPct.toFixed(2)}%`}
          icon={<BarChart3 />}
          negative={maxDrawdownPct > 0}
        />

        <ReportStatCard
          title="Longest Win Streak"
          value={String(longestWinStreak)}
          icon={<Trophy />}
          positive={longestWinStreak > 0}
        />

        <ReportStatCard
          title="Longest Loss Streak"
          value={String(longestLossStreak)}
          icon={<TrendingDown />}
          negative={longestLossStreak > 0}
        />
      </div>
    </div>
  );
}