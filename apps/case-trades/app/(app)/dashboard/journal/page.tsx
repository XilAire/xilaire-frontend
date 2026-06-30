import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  BookOpen,
  PlusCircle,
  TrendingUp,
  BarChart3,
  Trophy,
  Target,
  Lock,
  CheckCircle2,
  Clock,
  CircleDollarSign,
  Activity,
  TrendingDown,
  FileText,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserEntitlements } from "@/lib/auth/getUserEntitlements";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { getSignalDisplayStatus } from "@/lib/signals/displayState";

export const dynamic = "force-dynamic";

type SignalFillRow = {
  side: string | null;
  contracts: number | null;
  price: number | null;
  created_at: string | null;
};

type SignalExecutionRow = {
  id: string;
  status: string | null;
  contracts: number | null;
  entry_price: number | null;
  exit_price: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  opened_at: string | null;
  closed_at: string | null;
  execution_fills: SignalFillRow[] | null;
};

type SignalRow = {
  id: string;
  organization_id: string | null;
  asset: string | null;
  underlying: string | null;
  action: string | null;
  open_action: string | null;
  instrument_type: string | null;
  option_type: string | null;
  strike_price: number | null;
  expiration_date: string | null;
  entry_price: number | null;
  price: number | null;
  exit_price: number | null;
  quantity: number | null;
  contracts: number | null;
  shares: number | null;
  trade_style: string | null;
  confidence: number | null;
  status: string | null;
  watching: boolean | null;
  watched: boolean | null;
  outcome: string | null;
  return_pct: number | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string | null;
  signal_executions: SignalExecutionRow[] | null;
};

type JournalTrade = {
  id: string;
  signal_id: string;
  symbol: string;
  instrument: string;
  contractLabel: string;
  side: string;
  strategy: string;
  quantity: number;
  entryPrice: number | null;
  exitPrice: number | null;
  entryDate: string | null;
  exitDate: string | null;
  duration: string;
  pnl: number | null;
  pnlPct: number | null;
  status: string;
  outcome: string;
  confidence: number | null;
};

function isMasterAdmin(role: Awaited<ReturnType<typeof resolveCurrentUserRole>>) {
  return (
    role?.role_name === "master_admin" ||
    role?.role_rank === 4 ||
    String(role?.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

function formatTier(tier: string) {
  if (tier === "master_admin") {
    return "MASTER ADMIN";
  }

  return tier.replace("journal_", "").replace("_", " ").toUpperCase();
}

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(2)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(start: string | null, end: string | null) {
  if (!start) {
    return "—";
  }

  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return "—";
  }

  const totalMinutes = Math.max(Math.floor((endTime - startTime) / 60000), 0);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function averageWeightedPrice(fills: SignalFillRow[]) {
  const totalQuantity = fills.reduce(
    (sum, fill) => sum + Number(fill.contracts ?? 0),
    0
  );

  if (totalQuantity <= 0) {
    return null;
  }

  const totalValue = fills.reduce((sum, fill) => {
    return sum + Number(fill.contracts ?? 0) * Number(fill.price ?? 0);
  }, 0);

  return Number((totalValue / totalQuantity).toFixed(4));
}

function getContractLabel(signal: SignalRow) {
  if (signal.instrument_type === "OPTION") {
    const parts = [
      signal.strike_price ? String(signal.strike_price) : null,
      signal.option_type,
      signal.expiration_date,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(" ") : "OPTION";
  }

  return "STOCK";
}

function getMultiplier(signal: SignalRow) {
  return signal.instrument_type === "OPTION" ? 100 : 1;
}

function normalizeOutcome(value: string | null) {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (normalized === "WIN" || normalized === "LOSS" || normalized === "BREAKEVEN") {
    return normalized;
  }

  return "—";
}

function buildJournalTrades(signals: SignalRow[]) {
  return signals.flatMap((signal): JournalTrade[] => {
    const executions = signal.signal_executions ?? [];

    if (executions.length === 0) {
      const displayStatus = getSignalDisplayStatus({
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
        return_pct: signal.return_pct,
      });

      return [
        {
          id: signal.id,
          signal_id: signal.id,
          symbol: signal.asset ?? signal.underlying ?? "—",
          instrument: signal.instrument_type ?? "—",
          contractLabel: getContractLabel(signal),
          side: signal.open_action ?? signal.action ?? "—",
          strategy: signal.trade_style?.toUpperCase() ?? "—",
          quantity: Number(signal.quantity ?? signal.contracts ?? signal.shares ?? 0),
          entryPrice: signal.entry_price ?? signal.price ?? null,
          exitPrice: signal.exit_price ?? null,
          entryDate: signal.opened_at ?? signal.created_at,
          exitDate: signal.closed_at,
          duration: formatDuration(signal.opened_at ?? signal.created_at, signal.closed_at),
          pnl: null,
          pnlPct: signal.return_pct ?? null,
          status: displayStatus,
          outcome: normalizeOutcome(signal.outcome),
          confidence: signal.confidence,
        },
      ];
    }

    return executions.map((execution) => {
      const fills = execution.execution_fills ?? [];
      const openFills = fills.filter(
        (fill) => String(fill.side ?? "").toUpperCase() === "OPEN"
      );
      const closeFills = fills.filter(
        (fill) => String(fill.side ?? "").toUpperCase() === "CLOSE"
      );

      const openedQuantity = openFills.reduce(
        (sum, fill) => sum + Number(fill.contracts ?? 0),
        0
      );

      const closedQuantity = closeFills.reduce(
        (sum, fill) => sum + Number(fill.contracts ?? 0),
        0
      );

      const quantity =
        openedQuantity ||
        Number(execution.contracts ?? signal.quantity ?? signal.contracts ?? signal.shares ?? 0);

      const averageEntry =
        averageWeightedPrice(openFills) ??
        execution.entry_price ??
        signal.entry_price ??
        signal.price ??
        null;

      const averageExit =
        averageWeightedPrice(closeFills) ??
        execution.exit_price ??
        signal.exit_price ??
        null;

      const multiplier = getMultiplier(signal);

      const calculatedPnl =
        averageEntry !== null && averageExit !== null && closedQuantity > 0
          ? Number(
              ((averageExit - averageEntry) * closedQuantity * multiplier).toFixed(2)
            )
          : null;

      const calculatedPnlPct =
        averageEntry !== null && averageExit !== null && averageEntry !== 0
          ? Number((((averageExit - averageEntry) / averageEntry) * 100).toFixed(2))
          : null;

      const displayStatus = getSignalDisplayStatus({
        status: signal.status,
        watching: signal.watching,
        watched: signal.watched,
        closed_at: signal.closed_at ?? execution.closed_at,
        outcome:
          signal.outcome === "WIN" ||
          signal.outcome === "LOSS" ||
          signal.outcome === "BREAKEVEN"
            ? signal.outcome
            : null,
        return_pct: signal.return_pct ?? calculatedPnlPct,
      });

      return {
        id: execution.id,
        signal_id: signal.id,
        symbol: signal.asset ?? signal.underlying ?? "—",
        instrument: signal.instrument_type ?? "—",
        contractLabel: getContractLabel(signal),
        side: signal.open_action ?? signal.action ?? "—",
        strategy: signal.trade_style?.toUpperCase() ?? "—",
        quantity,
        entryPrice: averageEntry,
        exitPrice: averageExit,
        entryDate: execution.opened_at ?? signal.opened_at ?? signal.created_at,
        exitDate: execution.closed_at ?? signal.closed_at,
        duration: formatDuration(
          execution.opened_at ?? signal.opened_at ?? signal.created_at,
          execution.closed_at ?? signal.closed_at
        ),
        pnl: execution.pnl ?? calculatedPnl,
        pnlPct: execution.pnl_pct ?? signal.return_pct ?? calculatedPnlPct,
        status:
          execution.status === "CLOSED" || displayStatus === "Closed"
            ? "Closed"
            : execution.status === "OPEN"
              ? "Open"
              : displayStatus,
        outcome: normalizeOutcome(signal.outcome),
        confidence: signal.confidence,
      };
    });
  });
}

function getPnlClass(value: number | null) {
  if (value === null) {
    return "text-slate-300";
  }

  if (value > 0) {
    return "text-emerald-400";
  }

  if (value < 0) {
    return "text-red-400";
  }

  return "text-slate-300";
}

export default async function JournalPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const role = await resolveCurrentUserRole();
  const masterAdmin = isMasterAdmin(role);

  const entitlements = await getUserEntitlements(user.id);
  const hasJournalAccess = masterAdmin || entitlements.journal.active;

  if (!hasJournalAccess) {
    return <JournalUpgradeScreen />;
  }

  const journalTier = masterAdmin
    ? "master_admin"
    : entitlements.journal.tier ?? "journal_starter";

  const canJournalOptions = masterAdmin || entitlements.journal.options;
  const canUseAiReview = masterAdmin || entitlements.journal.ai_review;
  const analyticsLevel = masterAdmin ? "master" : entitlements.journal.analytics;

  let query = supabase
    .from("signals")
    .select(
      `
      id,
      organization_id,
      asset,
      underlying,
      action,
      open_action,
      instrument_type,
      option_type,
      strike_price,
      expiration_date,
      entry_price,
      price,
      exit_price,
      quantity,
      contracts,
      shares,
      trade_style,
      confidence,
      status,
      watching,
      watched,
      outcome,
      return_pct,
      opened_at,
      closed_at,
      created_at,
      signal_executions!left (
        id,
        status,
        contracts,
        entry_price,
        exit_price,
        pnl,
        pnl_pct,
        opened_at,
        closed_at,
        execution_fills!left (
          side,
          contracts,
          price,
          created_at
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (!masterAdmin) {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load journal trades", error);
    throw new Error("Failed to load journal trades");
  }

  const signals = (data ?? []) as SignalRow[];
  const trades = buildJournalTrades(signals);

  const closedTrades = trades.filter((trade) => trade.status === "Closed");
  const winningTrades = closedTrades.filter((trade) => {
    if (trade.outcome === "WIN") return true;
    return trade.pnl !== null && trade.pnl > 0;
  });

  const losingTrades = closedTrades.filter((trade) => {
    if (trade.outcome === "LOSS") return true;
    return trade.pnl !== null && trade.pnl < 0;
  });

  const totalPnl = trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);

  const winRate =
    winningTrades.length + losingTrades.length > 0
      ? Math.round(
          (winningTrades.length / (winningTrades.length + losingTrades.length)) *
            100
        )
      : null;

  const bestTrade = trades.reduce<JournalTrade | null>((best, trade) => {
    if (trade.pnl === null) return best;
    if (!best || best.pnl === null) return trade;

    return trade.pnl > best.pnl ? trade : best;
  }, null);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            CASE Journal
          </h1>

          <p className="text-sm text-slate-400">
            Execution-powered trade journal built from signals, executions, and
            fills.
          </p>
        </div>

        <Link
          href="/dashboard/admin/signals/create"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <PlusCircle className="h-4 w-4" />
          New Trade Signal
        </Link>
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium text-emerald-300">
              {masterAdmin
                ? "Master Admin Journal Access"
                : "Active Journal Plan"}
            </p>

            <p className="text-xs text-slate-400">
              Tier: {formatTier(journalTier)} • Analytics:{" "}
              {String(analyticsLevel).toUpperCase()}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <FeaturePill enabled label="Stock Journal" />
            <FeaturePill enabled={canJournalOptions} label="Options Journal" />
            <FeaturePill enabled={canUseAiReview} label="AI Review" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <JournalStat
          title="Total Trades"
          value={String(trades.length)}
          icon={<BookOpen />}
        />

        <JournalStat
          title="Win Rate"
          value={winRate !== null ? `${winRate}%` : "—"}
          icon={<Trophy />}
        />

        <JournalStat
          title="Net P/L"
          value={formatCurrency(totalPnl)}
          icon={<TrendingUp />}
          tone={totalPnl > 0 ? "positive" : totalPnl < 0 ? "negative" : "neutral"}
        />

        <JournalStat
          title="Best Trade"
          value={bestTrade?.pnl !== null && bestTrade ? formatCurrency(bestTrade.pnl) : "—"}
          icon={<Target />}
          tone={
            bestTrade?.pnl && bestTrade.pnl > 0
              ? "positive"
              : bestTrade?.pnl && bestTrade.pnl < 0
                ? "negative"
                : "neutral"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6 lg:col-span-3">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Trade Log
              </h2>

              <p className="text-sm text-slate-400">
                Real trades from the CASE execution ledger.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <FilterPill label="All Trades" active />
              <FilterPill label="Open" />
              <FilterPill label="Closed" />
              <FilterPill label="Options" />
              <FilterPill label="Stocks" />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">Contract</th>
                    <th className="px-4 py-3">Side</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Entry</th>
                    <th className="px-4 py-3">Exit</th>
                    <th className="px-4 py-3">Opened</th>
                    <th className="px-4 py-3">Closed</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">P/L</th>
                    <th className="px-4 py-3">P/L %</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">View</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {trades.length === 0 && (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-4 py-10 text-center text-sm text-slate-500"
                      >
                        No real execution trades found yet. Create a signal and
                        open an execution to populate the journal.
                      </td>
                    </tr>
                  )}

                  {trades.map((trade) => (
                    <tr key={trade.id} className="text-slate-300">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-100">
                          {trade.symbol}
                        </div>
                        <div className="text-xs text-slate-500">
                          {trade.instrument} • {trade.strategy}
                        </div>
                      </td>

                      <td className="px-4 py-3">{trade.contractLabel}</td>
                      <td className="px-4 py-3">{trade.side}</td>
                      <td className="px-4 py-3">{trade.quantity}</td>
                      <td className="px-4 py-3">{formatCurrency(trade.entryPrice)}</td>
                      <td className="px-4 py-3">{formatCurrency(trade.exitPrice)}</td>
                      <td className="px-4 py-3">{formatDateTime(trade.entryDate)}</td>
                      <td className="px-4 py-3">{formatDateTime(trade.exitDate)}</td>
                      <td className="px-4 py-3">{trade.duration}</td>

                      <td className={`px-4 py-3 font-medium ${getPnlClass(trade.pnl)}`}>
                        {formatCurrency(trade.pnl)}
                      </td>

                      <td
                        className={`px-4 py-3 font-medium ${getPnlClass(
                          trade.pnlPct
                        )}`}
                      >
                        {formatPercent(trade.pnlPct)}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={trade.status} />
                      </td>

                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/journal/${trade.id}`}
                          className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <JournalSideCard
            title="Execution Ledger"
            icon={<Activity />}
            body="The journal now reads from signals, signal executions, and execution fills. Demo data has been removed."
            items={[
              "Signals are the trade idea.",
              "Executions are the trade container.",
              "Fills are the source of truth.",
            ]}
          />

          <JournalSideCard
            title="Next Journal Phase"
            icon={<FileText />}
            body="Next we will add notes, setups, mistakes, screenshots, and AI review to each executed trade."
            items={[
              "Trade notes",
              "Setup tags",
              "Mistake tracking",
              "AI trade grade",
            ]}
          />

          <JournalSideCard
            title="Reports Ready"
            icon={<BarChart3 />}
            body="Because this journal is ledger-powered, reports can now be built from real execution data."
            items={[
              "Win rate",
              "Expectancy",
              "Profit factor",
              "Average hold time",
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function JournalUpgradeScreen() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8">
        <div className="mb-5 inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
          <Lock className="h-6 w-6" />
        </div>

        <h1 className="text-2xl font-semibold text-slate-100">
          Unlock CASE Journal
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          CASE Journal is a subscription-based trading journal for tracking
          trades, notes, screenshots, performance, and future AI trade reviews.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/billing"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            View Journal Plans
          </Link>

          <Link
            href="/"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Learn More
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PlanCard
          title="Starter"
          price="$14.99/mo"
          items={["Stock journaling", "Basic notes", "Basic reports"]}
        />
        <PlanCard
          title="Pro"
          price="$29.99/mo"
          featured
          items={[
            "Stock journaling",
            "Options journaling",
            "Advanced analytics",
          ]}
        />
        <PlanCard
          title="Elite"
          price="$49.99/mo"
          items={["Everything in Pro", "AI trade reviews", "Trade grading"]}
        />
      </div>
    </div>
  );
}

function PlanCard({
  title,
  price,
  items,
  featured = false,
}: {
  title: string;
  price: string;
  items: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-6 " +
        (featured
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-white/10 bg-slate-900/80")
      }
    >
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 text-2xl font-bold text-emerald-400">{price}</p>

      <div className="mt-5 space-y-3 text-sm text-slate-300">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturePill({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={
        "rounded-full px-3 py-1 " +
        (enabled
          ? "bg-emerald-500/10 text-emerald-300"
          : "bg-slate-800 text-slate-500")
      }
    >
      {label}
    </span>
  );
}

function FilterPill({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={
        "rounded-full px-3 py-1 " +
        (active
          ? "bg-emerald-600 text-white"
          : "border border-white/10 bg-slate-950 text-slate-400")
      }
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const className =
    normalized === "closed"
      ? "bg-sky-500/10 text-sky-300"
      : normalized === "open" || normalized === "active"
        ? "bg-emerald-500/10 text-emerald-300"
        : normalized === "watching"
          ? "bg-blue-500/10 text-blue-300"
          : normalized === "expired"
            ? "bg-red-500/10 text-red-300"
            : "bg-slate-500/10 text-slate-300";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${className}`}>
      {status}
    </span>
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
  tone?: "positive" | "negative" | "neutral";
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
      <div className={`mb-3 [&>svg]:h-5 [&>svg]:w-5 ${iconClass}`}>
        {icon}
      </div>

      <p className="text-sm text-slate-400">{title}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function JournalSideCard({
  title,
  icon,
  body,
  items,
}: {
  title: string;
  icon: ReactNode;
  body: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-4 text-emerald-400 [&>svg]:h-6 [&>svg]:w-6">
        {icon}
      </div>

      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>

      <div className="mt-5 space-y-3 text-sm text-slate-300">
        {items.map((item) => (
          <ChecklistItem key={item} text={item} />
        ))}
      </div>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
      <span>{text}</span>
    </div>
  );
}
