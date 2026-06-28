import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  LineChart,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import {
  getSignalDisplayStatus,
  signalNeedsOutcome,
} from "@/lib/signals/displayState";

export const dynamic = "force-dynamic";

type RangeKey = "7d" | "30d" | "90d" | "180d" | "1y" | "all";

const RANGE_OPTIONS: Array<{
  label: string;
  value: RangeKey;
  days: number | null;
}> = [
  { label: "7D", value: "7d", days: 7 },
  { label: "30D", value: "30d", days: 30 },
  { label: "3M", value: "90d", days: 90 },
  { label: "6M", value: "180d", days: 180 },
  { label: "1Y", value: "1y", days: 365 },
  { label: "All", value: "all", days: null },
];

type ViewKey = "overview" | "outcomes" | "expectancy" | "equity" | "risk";

const VIEW_LABELS: Record<ViewKey, string> = {
  overview: "Overview",
  outcomes: "Outcomes",
  expectancy: "Expectancy",
  equity: "Equity Curve",
  risk: "Risk",
};

type PerformancePageProps = {
  searchParams: {
    range?: string;
    view?: string;
  };
};

type NormalizedOutcome = "WIN" | "LOSS" | "BREAKEVEN" | "UNRESOLVED" | null;

type SignalRow = {
  id: string;
  organization_id: string | null;
  asset: string | null;
  underlying: string | null;
  action: string | null;
  instrument_type: string | null;
  status: string | null;
  watching: boolean | null;
  watched: boolean | null;
  outcome: string | null;
  return_pct: number | string | null;
  entry_price: number | string | null;
  trade_style: string | null;
  confidence: number | null;
  created_at: string;
  closed_at: string | null;
};

type NormalizedSignal = SignalRow & {
  normalized_return_pct: number | null;
  display_status: "Watching" | "Active" | "Triggered" | "Closed" | "Expired";
};

function getRangeStart(range: RangeKey) {
  const selected =
    RANGE_OPTIONS.find((option) => option.value === range) ??
    RANGE_OPTIONS.find((option) => option.value === "30d")!;

  if (selected.days === null) return null;

  const date = new Date();
  date.setDate(date.getDate() - selected.days);

  return date.toISOString();
}

function buildPerformanceUrl(view: ViewKey, range: RangeKey) {
  const params = new URLSearchParams();

  params.set("view", view);
  params.set("range", range);

  return `/dashboard/performance?${params.toString()}`;
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeReturnPct(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace("%", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${value}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function isActiveSignal(signal: NormalizedSignal) {
  return (
    signal.display_status === "Active" ||
    signal.display_status === "Watching" ||
    signal.display_status === "Triggered"
  );
}

function isClosedSignal(signal: NormalizedSignal) {
  return (
    signal.display_status === "Closed" || signal.display_status === "Expired"
  );
}

function hasRequiredPerformanceFields(signal: NormalizedSignal) {
  return Boolean(
    signal.outcome !== null &&
      signal.outcome !== undefined &&
      normalizeText(signal.outcome) !== "" &&
      signal.normalized_return_pct !== null
  );
}

function getNormalizedOutcome(signal: NormalizedSignal): NormalizedOutcome {
  if (!isClosedSignal(signal)) {
    return null;
  }

  if (
    signalNeedsOutcome({
      status: signal.status,
      watching: signal.watching,
      watched: signal.watched,
      closed_at: signal.closed_at,
      outcome:
        signal.outcome === "WIN" ||
        signal.outcome === "LOSS" ||
        signal.outcome === "BREAKEVEN"
          ? signal.outcome
          : null,
      return_pct: signal.normalized_return_pct,
    }) ||
    !hasRequiredPerformanceFields(signal)
  ) {
    return "UNRESOLVED";
  }

  const outcome = normalizeText(signal.outcome);

  if (["win", "winner", "profit", "profitable"].includes(outcome)) {
    return "WIN";
  }

  if (["loss", "loser", "lost"].includes(outcome)) {
    return "LOSS";
  }

  if (
    ["breakeven", "break_even", "break even", "flat", "even"].includes(outcome)
  ) {
    return "BREAKEVEN";
  }

  return "UNRESOLVED";
}

function getRangeDate(signal: NormalizedSignal) {
  if (isClosedSignal(signal)) {
    return signal.closed_at ?? signal.created_at;
  }

  return signal.created_at;
}

function isSignalInsideRange(signal: NormalizedSignal, since: string | null) {
  if (!since) {
    return true;
  }

  return new Date(getRangeDate(signal)).getTime() >= new Date(since).getTime();
}

export default async function PerformancePage({
  searchParams,
}: PerformancePageProps) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const role = await resolveCurrentUserRole();

  const view =
    searchParams.view && searchParams.view in VIEW_LABELS
      ? (searchParams.view as ViewKey)
      : "overview";

  const range =
    RANGE_OPTIONS.some((option) => option.value === searchParams.range)
      ? (searchParams.range as RangeKey)
      : "30d";

  const since = getRangeStart(range);

  const { data: signals, error } = await supabase
    .from("signals")
    .select(
      `
      id,
      organization_id,
      asset,
      underlying,
      action,
      instrument_type,
      status,
      watching,
      watched,
      outcome,
      return_pct,
      entry_price,
      trade_style,
      confidence,
      created_at,
      closed_at
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load performance data", error);
    throw new Error("Failed to load performance data");
  }

  const allUnfiltered = ((signals ?? []) as SignalRow[]).map((signal) => {
    const normalizedReturnPct = normalizeReturnPct(signal.return_pct);

    return {
      ...signal,
      normalized_return_pct: normalizedReturnPct,
      display_status: getSignalDisplayStatus({
        status: signal.status,
        watching: signal.watching,
        watched: signal.watched,
        closed_at: signal.closed_at,
        outcome:
          signal.outcome === "WIN" ||
          signal.outcome === "LOSS" ||
          signal.outcome === "BREAKEVEN"
            ? signal.outcome
            : null,
        return_pct: normalizedReturnPct,
      }),
    };
  }) as NormalizedSignal[];

  const all = allUnfiltered.filter((signal) =>
    isSignalInsideRange(signal, since)
  );

  const activeSignals = all.filter(isActiveSignal);
  const closedSignals = all.filter(isClosedSignal);

  const outcomeSignals = closedSignals.filter((signal) =>
    ["WIN", "LOSS", "BREAKEVEN"].includes(String(getNormalizedOutcome(signal)))
  );

  const unresolvedSignals = closedSignals.filter(
    (signal) => getNormalizedOutcome(signal) === "UNRESOLVED"
  );

  const total = all.length;
  const active = activeSignals.length;
  const closed = closedSignals.length;
  const unresolved = unresolvedSignals.length;

  const wins = outcomeSignals.filter(
    (signal) => getNormalizedOutcome(signal) === "WIN"
  ).length;

  const losses = outcomeSignals.filter(
    (signal) => getNormalizedOutcome(signal) === "LOSS"
  ).length;

  const breakeven = outcomeSignals.filter(
    (signal) => getNormalizedOutcome(signal) === "BREAKEVEN"
  ).length;

  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;

  const closedReturns = outcomeSignals
    .map((signal) => signal.normalized_return_pct)
    .filter((value): value is number => value !== null);

  const winReturns = closedReturns.filter((value) => value > 0);

  const lossReturns = closedReturns
    .filter((value) => value < 0)
    .map((value) => Math.abs(value));

  const avgWinPct = winReturns.length
    ? Number(
        (
          winReturns.reduce((sum, value) => sum + value, 0) /
          winReturns.length
        ).toFixed(2)
      )
    : null;

  const avgLossPct = lossReturns.length
    ? Number(
        (
          lossReturns.reduce((sum, value) => sum + value, 0) /
          lossReturns.length
        ).toFixed(2)
      )
    : null;

  const expectancy =
    avgWinPct !== null && avgLossPct !== null && wins + losses > 0
      ? Number(
          (
            (wins / (wins + losses)) * avgWinPct -
            (losses / (wins + losses)) * avgLossPct
          ).toFixed(2)
        )
      : null;

  const equityCurve = outcomeSignals
    .filter((signal) => signal.normalized_return_pct !== null)
    .sort((a, b) => {
      const aDate = a.closed_at ?? a.created_at;
      const bDate = b.closed_at ?? b.created_at;

      return new Date(aDate).getTime() - new Date(bDate).getTime();
    })
    .reduce<number[]>((acc, signal) => {
      const previous = acc.at(-1) ?? 0;
      const returnPct = signal.normalized_return_pct ?? 0;

      acc.push(Number((previous + returnPct).toFixed(2)));
      return acc;
    }, []);

  let peak = 0;
  let maxDrawdown = 0;

  for (const value of equityCurve) {
    if (value > peak) peak = value;

    const drawdown = value - peak;

    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  const returns = closedReturns;

  const mean =
    returns.length > 0
      ? returns.reduce((sum, value) => sum + value, 0) / returns.length
      : null;

  const volatility =
    mean !== null && returns.length > 1
      ? Number(
          Math.sqrt(
            returns.reduce(
              (sum, value) => sum + Math.pow(value - mean, 2),
              0
            ) / returns.length
          ).toFixed(2)
        )
      : null;

  const selectedRangeLabel =
    RANGE_OPTIONS.find((option) => option.value === range)?.label ?? "30D";

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            Performance
          </h1>

          <p className="text-sm text-slate-400">
            Professional-grade analytics, outcomes, expectancy, and risk.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={buildPerformanceUrl(view, option.value)}
              className={
                "rounded-full px-3 py-1.5 text-xs font-medium transition " +
                (range === option.value
                  ? "bg-emerald-600 text-white"
                  : "border border-white/10 bg-slate-900 text-slate-300 hover:bg-slate-800")
              }
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <PerformanceStat
          title="Total Signals"
          value={String(total)}
          icon={<Activity />}
        />

        <PerformanceStat
          title="Active"
          value={String(active)}
          icon={<TrendingUp />}
        />

        <PerformanceStat
          title="Closed"
          value={String(closed)}
          icon={<Target />}
        />

        <PerformanceStat
          title="Win Rate"
          value={winRate !== null ? `${winRate}%` : "—"}
          icon={<Trophy />}
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Analytics Board
            </h2>

            <p className="text-sm text-slate-400">
              Viewing {VIEW_LABELS[view]} over {selectedRangeLabel}.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(VIEW_LABELS) as ViewKey[]).map((key) => (
              <Link
                key={key}
                href={buildPerformanceUrl(key, range)}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition " +
                  (view === key
                    ? "bg-emerald-600 text-white"
                    : "border border-white/10 bg-slate-950 text-slate-300 hover:bg-slate-800")
                }
              >
                {VIEW_LABELS[key]}
              </Link>
            ))}
          </div>
        </div>

        {view === "overview" && (
          <MetricGrid
            items={[
              {
                label: "Total Signals",
                value: total,
                icon: <Activity />,
              },
              {
                label: "Active Signals",
                value: active,
                icon: <TrendingUp />,
              },
              {
                label: "Closed Signals",
                value: closed,
                icon: <Target />,
              },
              {
                label: "Needs Outcome",
                value: unresolved,
                icon: <AlertTriangle />,
                tone: unresolved > 0 ? "warning" : "neutral",
              },
            ]}
          />
        )}

        {view === "outcomes" && (
          <MetricGrid
            items={[
              {
                label: "Wins",
                value: wins,
                icon: <Trophy />,
                tone: "positive",
              },
              {
                label: "Losses",
                value: losses,
                icon: <TrendingDown />,
                tone: "negative",
              },
              {
                label: "Breakeven",
                value: breakeven,
                icon: <Target />,
              },
              {
                label: "Needs Outcome",
                value: unresolved,
                icon: <AlertTriangle />,
                tone: unresolved > 0 ? "warning" : "neutral",
              },
              {
                label: "Win Rate",
                value: winRate !== null ? `${winRate}%` : "—",
                icon: <BarChart3 />,
              },
            ]}
          />
        )}

        {view === "expectancy" && (
          <MetricGrid
            items={[
              {
                label: "Avg Win %",
                value: formatPercent(avgWinPct),
                icon: <TrendingUp />,
                tone: "positive",
              },
              {
                label: "Avg Loss %",
                value: formatPercent(avgLossPct),
                icon: <TrendingDown />,
                tone: "negative",
              },
              {
                label: "Expectancy",
                value: formatPercent(expectancy),
                icon: <Target />,
                tone:
                  expectancy !== null && expectancy > 0
                    ? "positive"
                    : expectancy !== null && expectancy < 0
                      ? "negative"
                      : "neutral",
              },
              {
                label: "Outcome-Ready Trades",
                value: outcomeSignals.length,
                icon: <BarChart3 />,
              },
            ]}
          />
        )}

        {view === "equity" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-slate-950 p-6">
              <div className="mb-4 flex items-center gap-3 text-emerald-400">
                <LineChart className="h-6 w-6" />

                <h3 className="text-lg font-semibold text-slate-100">
                  Equity Curve
                </h3>
              </div>

              {equityCurve.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {equityCurve.map((value, index) => (
                    <div
                      key={`${value}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900 px-4 py-2"
                    >
                      <span className="text-slate-400">
                        Outcome Trade #{index + 1}
                      </span>

                      <span
                        className={
                          value >= 0
                            ? "font-medium text-emerald-400"
                            : "font-medium text-red-400"
                        }
                      >
                        {value}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No outcome-ready trades available for this range.
                </p>
              )}
            </div>
          </div>
        )}

        {view === "risk" && (
          <MetricGrid
            items={[
              {
                label: "Max Drawdown",
                value: `${maxDrawdown}%`,
                icon: <ShieldAlert />,
                tone: maxDrawdown < 0 ? "negative" : "neutral",
              },
              {
                label: "Volatility",
                value: volatility !== null ? `${volatility}%` : "—",
                icon: <BarChart3 />,
              },
              {
                label: "Needs Outcome",
                value: unresolved,
                icon: <AlertTriangle />,
                tone: unresolved > 0 ? "warning" : "neutral",
              },
            ]}
          />
        )}
      </div>

      {unresolved > 0 && (
        <div className="space-y-4 rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-300">
          <div>
            <p className="font-semibold text-orange-200">
              {unresolved} closed signal{unresolved === 1 ? "" : "s"} need
              grading.
            </p>

            <p className="mt-1">
              These signals are closed or expired but do not have both an
              outcome and return percentage. They are excluded from win rate,
              expectancy, risk, and equity calculations until graded.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-orange-500/20 bg-slate-950/70">
            <table className="min-w-full divide-y divide-orange-500/10 text-left text-xs">
              <thead className="bg-orange-500/10 text-orange-200">
                <tr>
                  <th className="px-3 py-2 font-medium">Ticker</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Entry</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Closed</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-orange-500/10 text-slate-300">
                {unresolvedSignals.map((signal) => (
                  <tr key={signal.id}>
                    <td className="px-3 py-2 font-medium text-slate-100">
                      {signal.asset ?? signal.underlying ?? "—"}
                    </td>

                    <td className="px-3 py-2">
                      {signal.instrument_type ?? "—"}
                    </td>

                    <td className="px-3 py-2">{signal.action ?? "—"}</td>

                    <td className="px-3 py-2">{signal.display_status}</td>

                    <td className="px-3 py-2">
                      {signal.entry_price !== null
                        ? String(signal.entry_price)
                        : "—"}
                    </td>

                    <td className="px-3 py-2">
                      {formatDate(signal.created_at)}
                    </td>

                    <td className="px-3 py-2">
                      {formatDate(signal.closed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {role?.role_rank === 4 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Viewing system-wide performance as master admin.
        </div>
      )}

      <footer className="text-xs text-slate-500">
        CASE Trades • Performance v10
      </footer>
    </div>
  );
}

type MetricItem = {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: "positive" | "negative" | "neutral" | "warning";
};

function MetricGrid({ items }: { items: MetricItem[] }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-white/10 bg-slate-950 p-5"
        >
          <div
            className={
              "mb-3 [&>svg]:h-5 [&>svg]:w-5 " +
              (item.tone === "negative"
                ? "text-red-400"
                : item.tone === "positive"
                  ? "text-emerald-400"
                  : item.tone === "warning"
                    ? "text-orange-400"
                    : "text-slate-400")
            }
          >
            {item.icon}
          </div>

          <p className="text-sm text-slate-400">{item.label}</p>

          <p
            className={
              "mt-1 text-2xl font-semibold " +
              (item.tone === "negative"
                ? "text-red-400"
                : item.tone === "positive"
                  ? "text-emerald-400"
                  : item.tone === "warning"
                    ? "text-orange-400"
                    : "text-slate-100")
            }
          >
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}

function PerformanceStat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div className="mb-3 text-emerald-400 [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>

      <p className="text-sm text-slate-400">{title}</p>

      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}