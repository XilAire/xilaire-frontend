import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import JournalNotesForm from "@/components/journal/JournalNotesForm";
import TradeScreenshotManager, {
  type TradeScreenshot,
} from "@/components/journal/TradeScreenshotManager";
import TradeTimeline from "@/components/journal/TradeTimeline";
import TradeReviewPanel from "@/components/journal/TradeReviewPanel";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  LineChart,
  Lock,
  StickyNote,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserEntitlements } from "@/lib/auth/getUserEntitlements";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { getSignalDisplayStatus } from "@/lib/signals/displayState";

export const dynamic = "force-dynamic";

type TradeDetailPageProps = {
  params: {
    tradeId: string;
  };
};

type FillRow = {
  side: string | null;
  contracts: number | null;
  price: number | null;
  created_at: string | null;
};

type JournalNotesRow = {
  notes: string | null;
  setup: string | null;
  mistakes: string | null;
  tags: string[] | null;
  emotion: string | null;
  discipline_score: number | string | null;
  updated_at: string | null;
};

type TradeReviewRow = {
  id: string;
  execution_id: string;
  signal_id: string;
  grade: string;
  execution_score: number;
  discipline_score: number | null;
  summary: string;
  what_went_well: string[] | null;
  mistakes: string[] | null;
  improvement_plan: string[] | null;
  psychology_review: string;
  created_at: string | null;
  updated_at: string | null;
};

type ExecutionRow = {
  id: string;
  signal_id: string;
  status: string | null;
  contracts: number | null;
  entry_price: number | null;
  exit_price: number | null;
  entry_cost: number | null;
  exit_value: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string | null;
  execution_fills: FillRow[] | null;
  signals: {
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
  };
};

function isMasterAdmin(role: Awaited<ReturnType<typeof resolveCurrentUserRole>>) {
  return (
    role?.role_name === "master_admin" ||
    role?.role_rank === 4 ||
    String(role?.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

function formatMoneyWithSign(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "Open";
  }

  const prefix = Number(value) > 0 ? "+" : "";

  return `${prefix}${formatMoney(Number(value))}`;
}

function formatPercentWithSign(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  const prefix = Number(value) > 0 ? "+" : "";

  return `${prefix}${Number(value).toFixed(2)}%`;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return String(Number(value));
}

function formatDateTime(value: string | null | undefined) {
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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDuration(
  start: string | null | undefined,
  end: string | null | undefined
) {
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

function averageWeightedPrice(fills: FillRow[]) {
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

function getPnlTone(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "neutral";
  }

  if (value > 0) {
    return "positive";
  }

  if (value < 0) {
    return "negative";
  }

  return "neutral";
}

function getContractLabel(signal: ExecutionRow["signals"]) {
  if (signal.instrument_type === "OPTION") {
    const parts = [
      signal.strike_price ? String(signal.strike_price) : null,
      signal.option_type,
      signal.expiration_date ? formatDate(signal.expiration_date) : null,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(" ") : "OPTION";
  }

  return "STOCK";
}

function getMultiplier(signal: ExecutionRow["signals"]) {
  return signal.instrument_type === "OPTION" ? 100 : 1;
}

function normalizeOutcome(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (
    normalized === "WIN" ||
    normalized === "LOSS" ||
    normalized === "BREAKEVEN"
  ) {
    return normalized;
  }

  return "—";
}

function formatBrokerAction(
  value: string | null | undefined,
  fallback?: string | null
) {
  const normalized = String(value ?? fallback ?? "").trim().toUpperCase();

  if (normalized === "BUY_TO_OPEN") return "Buy to Open";
  if (normalized === "SELL_TO_OPEN") return "Sell to Open";
  if (normalized === "BUY") return "Buy";
  if (normalized === "SELL") return "Sell";

  return normalized || "—";
}

function hasJournalNotes(notes: JournalNotesRow | null) {
  if (!notes) {
    return false;
  }

  return Boolean(
    notes.notes ||
      notes.setup ||
      notes.mistakes ||
      notes.emotion ||
      notes.discipline_score ||
      (Array.isArray(notes.tags) && notes.tags.length > 0)
  );
}

export default async function JournalTradeDetailPage({
  params,
}: TradeDetailPageProps) {
  const supabase = createSupabaseServerClient();

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
    return <JournalUpgradeRequired />;
  }

  const { data: execution, error } = await supabase
    .from("signal_executions")
    .select(
      `
      id,
      signal_id,
      status,
      contracts,
      entry_price,
      exit_price,
      entry_cost,
      exit_value,
      pnl,
      pnl_pct,
      opened_at,
      closed_at,
      created_at,
      execution_fills!left (
        side,
        contracts,
        price,
        created_at
      ),
      signals!inner (
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
        created_at
      )
    `
    )
    .eq("id", params.tradeId)
    .maybeSingle<ExecutionRow>();

  if (error || !execution || !execution.signals) {
    notFound();
  }

  const tradeExecution = execution;
  const signal = tradeExecution.signals;

  const { data: journalNotes } = await supabase
    .from("journal_execution_notes")
    .select(
      `
      notes,
      setup,
      mistakes,
      tags,
      emotion,
      discipline_score,
      updated_at
      `
    )
    .eq("execution_id", tradeExecution.id)
    .maybeSingle<JournalNotesRow>();

  const { data: screenshots } = await supabase
    .from("journal_execution_screenshots")
    .select(
      `
      id,
      execution_id,
      signal_id,
      screenshot_type,
      file_url,
      file_path,
      caption,
      created_at
      `
    )
    .eq("execution_id", tradeExecution.id)
    .order("created_at", { ascending: false });

  const { data: tradeReview } = await supabase
    .from("journal_trade_reviews")
    .select(
      `
      id,
      execution_id,
      signal_id,
      grade,
      execution_score,
      discipline_score,
      summary,
      what_went_well,
      mistakes,
      improvement_plan,
      psychology_review,
      created_at,
      updated_at
      `
    )
    .eq("execution_id", tradeExecution.id)
    .maybeSingle<TradeReviewRow>();

  const fills = tradeExecution.execution_fills ?? [];

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

  const totalQuantity =
    openedQuantity ||
    Number(
      tradeExecution.contracts ??
        signal.quantity ??
        signal.contracts ??
        signal.shares ??
        0
    );

  const remainingQuantity = Math.max(totalQuantity - closedQuantity, 0);

  const averageEntry =
    averageWeightedPrice(openFills) ??
    tradeExecution.entry_price ??
    signal.entry_price ??
    signal.price ??
    null;

  const averageExit =
    averageWeightedPrice(closeFills) ??
    tradeExecution.exit_price ??
    signal.exit_price ??
    null;

  const multiplier = getMultiplier(signal);

  const calculatedPnl =
    averageEntry !== null && averageExit !== null && closedQuantity > 0
      ? Number(
          (
            (averageExit - averageEntry) *
            closedQuantity *
            multiplier
          ).toFixed(2)
        )
      : null;

  const calculatedPnlPct =
    averageEntry !== null && averageExit !== null && averageEntry !== 0
      ? Number((((averageExit - averageEntry) / averageEntry) * 100).toFixed(2))
      : null;

  const pnl = tradeExecution.pnl ?? calculatedPnl;
  const pnlPct = tradeExecution.pnl_pct ?? signal.return_pct ?? calculatedPnlPct;

  const displayStatus = getSignalDisplayStatus({
    status: signal.status,
    watching: signal.watching,
    watched: signal.watched,
    closed_at: signal.closed_at ?? tradeExecution.closed_at,
    outcome:
      signal.outcome === "WIN" ||
      signal.outcome === "LOSS" ||
      signal.outcome === "BREAKEVEN"
        ? signal.outcome
        : null,
    return_pct: signal.return_pct ?? pnlPct,
  });

  const status =
    tradeExecution.status === "CLOSED" || displayStatus === "Closed"
      ? "Closed"
      : tradeExecution.status === "OPEN"
        ? "Open"
        : displayStatus;

  const symbol = signal.asset ?? signal.underlying ?? "—";
  const tradeType = `${signal.instrument_type ?? "—"} ${getContractLabel(
    signal
  )}`;
  const duration = formatDuration(
    tradeExecution.opened_at ?? signal.opened_at ?? signal.created_at,
    tradeExecution.closed_at ?? signal.closed_at
  );
  const outcome = normalizeOutcome(signal.outcome);

  return (
    <div className="max-w-7xl space-y-8">
      <div>
        <Link
          href="/dashboard/journal"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Journal
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              CASE Journal Trade Workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">
              {symbol} · {tradeType}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Execution ID: {tradeExecution.id}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge status={status} />
            <OutcomeBadge outcome={outcome} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric
          title="P/L"
          value={formatMoneyWithSign(pnl)}
          icon={<BarChart3 />}
          tone={getPnlTone(pnl)}
        />

        <Metric
          title="P/L %"
          value={formatPercentWithSign(pnlPct)}
          icon={<TrendingUp />}
          tone={getPnlTone(pnlPct)}
        />

        <Metric
          title="Quantity"
          value={`${remainingQuantity} / ${totalQuantity}`}
          icon={<Target />}
        />

        <Metric title="Duration" value={duration} icon={<Clock />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6 xl:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <BookOpen className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Trade Summary
              </h2>

              <p className="text-sm text-slate-400">
                Brokerage-style summary from the execution ledger.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Symbol" value={symbol} />
            <Info label="Instrument" value={signal.instrument_type ?? "—"} />
            <Info label="Contract" value={getContractLabel(signal)} />
            <Info
              label="Open Action"
              value={formatBrokerAction(signal.open_action, signal.action)}
            />
            <Info
              label="Strategy"
              value={signal.trade_style?.toUpperCase() ?? "—"}
            />
            <Info
              label="Confidence"
              value={signal.confidence ? `${signal.confidence}%` : "—"}
            />
            <Info label="Average Entry" value={formatMoney(averageEntry)} />
            <Info
              label="Average Exit"
              value={formatMoney(averageExit)}
              tone={getPnlTone(pnl)}
            />
            <Info
              label="Opened"
              value={formatDateTime(
                tradeExecution.opened_at ??
                  signal.opened_at ??
                  signal.created_at
              )}
            />
            <Info
              label="Closed"
              value={formatDateTime(
                tradeExecution.closed_at ?? signal.closed_at
              )}
            />
            <Info label="Total Quantity" value={formatNumber(totalQuantity)} />
            <Info
              label="Remaining Quantity"
              value={formatNumber(remainingQuantity)}
            />
            <Info label="Outcome" value={outcome} />
            <Info
              label="Return"
              value={formatPercentWithSign(pnlPct)}
              tone={getPnlTone(pnlPct)}
            />
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-sky-500/10 p-3 text-sky-300">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Ledger Health
              </h2>

              <p className="text-sm text-slate-400">
                Source-of-truth execution state.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <MiniCheck
              label="Open fills"
              value={String(openFills.length)}
              complete={openFills.length > 0}
            />
            <MiniCheck
              label="Close fills"
              value={String(closeFills.length)}
              complete={status === "Closed" ? closeFills.length > 0 : true}
            />
            <MiniCheck
              label="Signal synced"
              value={displayStatus}
              complete={status === "Closed" ? displayStatus === "Closed" : true}
            />
            <MiniCheck
              label="Outcome"
              value={outcome}
              complete={status !== "Closed" || outcome !== "—"}
            />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <LineChart className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Execution Fills
            </h2>

            <p className="text-sm text-slate-400">
              Every open and close fill used to calculate P/L.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {fills.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No fills found for this execution.
                  </td>
                </tr>
              )}

              {fills.map((fill, index) => (
                <tr key={`${fill.side}-${fill.created_at}-${index}`}>
                  <td className="px-4 py-3">
                    <FillBadge side={fill.side} />
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatNumber(fill.contracts)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatMoney(fill.price)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatDateTime(fill.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <TradeTimeline
        signalCreatedAt={signal.created_at}
        openedAt={tradeExecution.opened_at ?? signal.opened_at}
        closedAt={tradeExecution.closed_at ?? signal.closed_at}
        fills={fills}
        notes={journalNotes}
        status={status}
      />

      {hasJournalNotes(journalNotes) && (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <StickyNote className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Saved Journal Notes
              </h2>

              <p className="text-sm text-slate-400">
                These are the notes currently saved for this trade.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Setup" value={journalNotes?.setup ?? "—"} />
            <Info label="Emotion" value={journalNotes?.emotion ?? "—"} />
            <Info
              label="Discipline Score"
              value={
                journalNotes?.discipline_score
                  ? `${journalNotes.discipline_score}/10`
                  : "—"
              }
            />
            <Info
              label="Tags"
              value={
                journalNotes?.tags && journalNotes.tags.length > 0
                  ? journalNotes.tags.join(", ")
                  : "—"
              }
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TextBlock title="Trade Notes" value={journalNotes?.notes} />
            <TextBlock
              title="Mistakes / Lessons"
              value={journalNotes?.mistakes}
            />
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkspaceCard
          title="Notes"
          icon={<StickyNote />}
          body="Use the journal notes section below to capture setup, tags, emotions, trade notes, mistakes, and lessons learned."
        />

        <WorkspaceCard
          title="AI Review"
          icon={<Bot />}
          body="CASE AI will grade execution quality, risk management, patience, and exit discipline."
        />
      </div>

      <TradeScreenshotManager
        tradeId={tradeExecution.id}
        signalId={signal.id}
        initialScreenshots={(screenshots ?? []) as TradeScreenshot[]}
      />

      <TradeReviewPanel
        tradeId={tradeExecution.id}
        initialReview={tradeReview}
      />

      <JournalNotesForm
        tradeId={tradeExecution.id}
        initialNotes={journalNotes}
      />
    </div>
  );
}

function JournalUpgradeRequired() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard/journal"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Journal
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8">
        <div className="mb-5 inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
          <Lock className="h-6 w-6" />
        </div>

        <h1 className="text-2xl font-semibold text-slate-100">
          Journal Plan Required
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          You need an active CASE Journal subscription to view journal trade
          details.
        </p>

        <div className="mt-6">
          <Link
            href="/dashboard/billing"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            View Journal Plans
          </Link>
        </div>
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
  icon,
  tone = "neutral",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone?: "positive" | "negative" | "neutral";
}) {
  const iconClass =
    tone === "negative"
      ? "text-red-400"
      : tone === "positive"
        ? "text-emerald-400"
        : "text-emerald-400";

  const valueClass =
    tone === "negative"
      ? "text-red-400"
      : tone === "positive"
        ? "text-emerald-400"
        : "text-slate-100";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div className={`mb-3 [&>svg]:h-5 [&>svg]:w-5 ${iconClass}`}>
        {icon}
      </div>

      <p className="text-sm text-slate-400">{title}</p>

      <p className={`mt-1 text-xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function Info({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const valueClass =
    tone === "negative"
      ? "text-red-400"
      : tone === "positive"
        ? "text-emerald-400"
        : "text-slate-100";

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 font-medium ${valueClass}`}>{value}</p>
    </div>
  );
}

function TextBlock({
  title,
  value,
}: {
  title: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950 p-4">
      <p className="text-xs text-slate-500">{title}</p>

      {value ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
          {value}
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-500">—</p>
      )}
    </div>
  );
}

function MiniCheck({
  label,
  value,
  complete,
}: {
  label: string;
  value: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
      <div className="flex items-center gap-2">
        {complete ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-400" />
        )}
        <span className="text-sm text-slate-400">{label}</span>
      </div>

      <span className="text-sm font-medium text-slate-100">{value}</span>
    </div>
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
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {status}
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const normalized = outcome.toLowerCase();

  const className =
    normalized === "win"
      ? "bg-emerald-500/10 text-emerald-300"
      : normalized === "loss"
        ? "bg-red-500/10 text-red-300"
        : normalized === "breakeven"
          ? "bg-slate-500/10 text-slate-300"
          : "bg-orange-500/10 text-orange-300";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      Outcome: {outcome}
    </span>
  );
}

function FillBadge({ side }: { side: string | null }) {
  const normalized = String(side ?? "").toUpperCase();

  const className =
    normalized === "OPEN"
      ? "bg-emerald-500/10 text-emerald-300"
      : normalized === "CLOSE"
        ? "bg-sky-500/10 text-sky-300"
        : "bg-slate-500/10 text-slate-300";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${className}`}>
      {normalized || "—"}
    </span>
  );
}

function WorkspaceCard({
  title,
  icon,
  body,
}: {
  title: string;
  icon: React.ReactNode;
  body: string;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-4 text-emerald-400 [&>svg]:h-6 [&>svg]:w-6">
        {icon}
      </div>

      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </section>
  );
}