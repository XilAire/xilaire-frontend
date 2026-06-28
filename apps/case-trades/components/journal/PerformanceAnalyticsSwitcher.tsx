"use client";

import { useMemo, useState } from "react";
import { BarChart3, LayoutList } from "lucide-react";

import ConfidencePerformanceTable, {
  type ConfidencePerformance,
} from "@/components/journal/ConfidencePerformanceTable";
import DayOfWeekPerformanceTable, {
  type DayOfWeekPerformance,
} from "@/components/journal/DayOfWeekPerformanceTable";
import DtePerformanceTable, {
  type DtePerformance,
} from "@/components/journal/DtePerformanceTable";
import ExpirationPerformanceTable, {
  type ExpirationPerformance,
} from "@/components/journal/ExpirationPerformanceTable";
import HourOfDayPerformanceTable, {
  type HourOfDayPerformance,
} from "@/components/journal/HourOfDayPerformanceTable";
import InstrumentPerformanceTable, {
  type InstrumentPerformance,
} from "@/components/journal/InstrumentPerformanceTable";
import OptionTypePerformanceTable, {
  type OptionTypePerformance,
} from "@/components/journal/OptionTypePerformanceTable";
import PerformanceAnalyticsCharts, {
  type ChartPerformanceRow,
} from "@/components/journal/PerformanceAnalyticsCharts";
import StrategyPerformanceTable, {
  type StrategyPerformance,
} from "@/components/journal/StrategyPerformanceTable";

type AnalyticsView =
  | "strategy"
  | "dayOfWeek"
  | "hourOfDay"
  | "instrument"
  | "confidence"
  | "optionType"
  | "dte"
  | "expiration";

type DisplayMode = "table" | "chart";

type PerformanceAnalyticsSwitcherProps = {
  strategies: StrategyPerformance[];
  days: DayOfWeekPerformance[];
  hours: HourOfDayPerformance[];
  instruments: InstrumentPerformance[];
  confidenceBuckets: ConfidencePerformance[];
  optionTypes: OptionTypePerformance[];
  dteBuckets: DtePerformance[];
  expirationBuckets: ExpirationPerformance[];
};

const ANALYTICS_OPTIONS: { label: string; value: AnalyticsView }[] = [
  { label: "Performance by Strategy", value: "strategy" },
  { label: "Performance by Day of Week", value: "dayOfWeek" },
  { label: "Performance by Hour of Day", value: "hourOfDay" },
  { label: "Performance by Instrument", value: "instrument" },
  { label: "Performance by Confidence", value: "confidence" },
  { label: "Performance by Option Type", value: "optionType" },
  { label: "Performance by DTE", value: "dte" },
  { label: "Performance by Expiration", value: "expiration" },
];

const DISPLAY_OPTIONS: { label: string; value: DisplayMode }[] = [
  { label: "Table View", value: "table" },
  { label: "Chart View", value: "chart" },
];

export default function PerformanceAnalyticsSwitcher({
  strategies,
  days,
  hours,
  instruments,
  confidenceBuckets,
  optionTypes,
  dteBuckets,
  expirationBuckets,
}: PerformanceAnalyticsSwitcherProps) {
  const [activeView, setActiveView] = useState<AnalyticsView>("strategy");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("table");

  const activeTitle = useMemo(() => {
    return (
      ANALYTICS_OPTIONS.find((option) => option.value === activeView)?.label ??
      "Performance Analytics"
    );
  }, [activeView]);

  const chartRows = useMemo<ChartPerformanceRow[]>(() => {
    if (activeView === "strategy") {
      return strategies.map((strategy) => ({
        label: strategy.strategy,
        trades: strategy.trades,
        winners: strategy.winners,
        losers: strategy.losers,
        breakevens: strategy.breakevens,
        winRate: strategy.winRate,
        averageWinner: strategy.averageWinner,
        averageLoser: strategy.averageLoser,
        profitFactor: strategy.profitFactor,
        netPnl: strategy.netPnl,
      }));
    }

    if (activeView === "dayOfWeek") {
      return days.map((day) => ({
        label: day.day,
        trades: day.trades,
        winners: day.winners,
        losers: day.losers,
        breakevens: day.breakevens,
        winRate: day.winRate,
        averagePnl: day.averagePnl,
        netPnl: day.netPnl,
      }));
    }

    if (activeView === "hourOfDay") {
      return hours.map((hour) => ({
        label: hour.label,
        trades: hour.trades,
        winners: hour.winners,
        losers: hour.losers,
        breakevens: hour.breakevens,
        winRate: hour.winRate,
        averagePnl: hour.averagePnl,
        netPnl: hour.netPnl,
      }));
    }

    if (activeView === "instrument") {
      return instruments.map((instrument) => ({
        label: instrument.instrument,
        trades: instrument.trades,
        winners: instrument.winners,
        losers: instrument.losers,
        breakevens: instrument.breakevens,
        winRate: instrument.winRate,
        averageWinner: instrument.averageWinner,
        averageLoser: instrument.averageLoser,
        profitFactor: instrument.profitFactor,
        netPnl: instrument.netPnl,
      }));
    }

    if (activeView === "confidence") {
      return confidenceBuckets.map((bucket) => ({
        label: bucket.bucket,
        trades: bucket.trades,
        winners: bucket.winners,
        losers: bucket.losers,
        breakevens: bucket.breakevens,
        winRate: bucket.winRate,
        averageWinner: bucket.averageWinner,
        averageLoser: bucket.averageLoser,
        profitFactor: bucket.profitFactor,
        netPnl: bucket.netPnl,
      }));
    }

    if (activeView === "optionType") {
      return optionTypes.map((optionType) => ({
        label: optionType.optionType,
        trades: optionType.trades,
        winners: optionType.winners,
        losers: optionType.losers,
        breakevens: optionType.breakevens,
        winRate: optionType.winRate,
        averageWinner: optionType.averageWinner,
        averageLoser: optionType.averageLoser,
        profitFactor: optionType.profitFactor,
        netPnl: optionType.netPnl,
      }));
    }

    if (activeView === "dte") {
      return dteBuckets.map((bucket) => ({
        label: bucket.bucket,
        trades: bucket.trades,
        winners: bucket.winners,
        losers: bucket.losers,
        breakevens: bucket.breakevens,
        winRate: bucket.winRate,
        averageWinner: bucket.averageWinner,
        averageLoser: bucket.averageLoser,
        profitFactor: bucket.profitFactor,
        netPnl: bucket.netPnl,
      }));
    }

    return expirationBuckets.map((bucket) => ({
      label: bucket.bucket,
      trades: bucket.trades,
      winners: bucket.winners,
      losers: bucket.losers,
      breakevens: bucket.breakevens,
      winRate: bucket.winRate,
      averageWinner: bucket.averageWinner,
      averageLoser: bucket.averageLoser,
      profitFactor: bucket.profitFactor,
      netPnl: bucket.netPnl,
    }));
  }, [
    activeView,
    confidenceBuckets,
    days,
    dteBuckets,
    expirationBuckets,
    hours,
    instruments,
    optionTypes,
    strategies,
  ]);

  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
            {displayMode === "chart" ? (
              <BarChart3 className="h-5 w-5" />
            ) : (
              <LayoutList className="h-5 w-5" />
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Performance Analytics
            </h2>

            <p className="text-sm text-slate-400">
              Select how you want to analyze closed-trade performance.
            </p>
          </div>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[34rem]">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Analytics View
            </label>

            <select
              value={activeView}
              onChange={(event) =>
                setActiveView(event.target.value as AnalyticsView)
              }
              className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-emerald-500/50"
            >
              {ANALYTICS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Display Mode
            </label>

            <select
              value={displayMode}
              onChange={(event) =>
                setDisplayMode(event.target.value as DisplayMode)
              }
              className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-emerald-500/50"
            >
              {DISPLAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-white/10 bg-slate-950 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Current View
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-100">
          {activeTitle} ·{" "}
          {DISPLAY_OPTIONS.find((option) => option.value === displayMode)?.label}
        </p>
      </div>

      {displayMode === "chart" && (
        <PerformanceAnalyticsCharts
          title={activeTitle}
          description="Visual breakdown of the selected performance analytics view."
          rows={chartRows}
        />
      )}

      {displayMode === "table" && activeView === "strategy" && (
        <StrategyPerformanceTable strategies={strategies} />
      )}

      {displayMode === "table" && activeView === "dayOfWeek" && (
        <DayOfWeekPerformanceTable days={days} />
      )}

      {displayMode === "table" && activeView === "hourOfDay" && (
        <HourOfDayPerformanceTable hours={hours} />
      )}

      {displayMode === "table" && activeView === "instrument" && (
        <InstrumentPerformanceTable instruments={instruments} />
      )}

      {displayMode === "table" && activeView === "confidence" && (
        <ConfidencePerformanceTable confidenceBuckets={confidenceBuckets} />
      )}

      {displayMode === "table" && activeView === "optionType" && (
        <OptionTypePerformanceTable optionTypes={optionTypes} />
      )}

      {displayMode === "table" && activeView === "dte" && (
        <DtePerformanceTable dteBuckets={dteBuckets} />
      )}

      {displayMode === "table" && activeView === "expiration" && (
        <ExpirationPerformanceTable expirationBuckets={expirationBuckets} />
      )}
    </section>
  );
}