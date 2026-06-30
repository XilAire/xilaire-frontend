import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  Gauge,
  Hash,
  LineChart,
  ShieldCheck,
  Target,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/getProfile";
import TradingViewChart from "@/components/tradingview/TradingViewChart";
import SignalSummaryCard from "@/components/signals/SignalSummaryCard";
import RiskPanel from "@/components/signals/RiskPanel";
import ExecutionRulesTable from "@/components/signals/ExecutionRulesTable";
import ExecutionRuleTemplateButtons from "@/components/signals/ExecutionRuleTemplateButtons";
import ExecutionPanel from "@/components/signals/ExecutionPanel";
import { getSignalDisplayStatus } from "@/lib/signals/displayState";

export const dynamic = "force-dynamic";

/* -------------------------------------------------
   DOMAIN TYPES (AUTHORITATIVE)
------------------------------------------------- */
type RuleType = "STOP_LOSS" | "TAKE_PROFIT";

type ExecutionRule = {
  id: string;
  rule_type: RuleType | string;
  value_pct: number | null;
  quantity_pct: number | null;
  is_active: boolean;
};

type PriceLevel = {
  type: RuleType;
  price: number;
};

/* -------------------------------------------------
   TIMEFRAME MAP
------------------------------------------------- */
function tradeStyleToInterval(style: string | null | undefined) {
  switch (style) {
    case "scalp":
      return "5";
    case "swing":
      return "60";
    case "leap":
      return "D";
    default:
      return "60";
  }
}

/* -------------------------------------------------
   FORMAT HELPERS
------------------------------------------------- */
function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatCurrency(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "—";

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return `$${numericValue.toFixed(2)}`;
}

function formatPercent(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "—";

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return `${numericValue}%`;
}

function formatSignalTitle(signal: any) {
  const action = signal.action ?? "BUY";
  const underlying = signal.underlying ?? signal.asset ?? "—";
  const strike = signal.strike_price ? `${signal.strike_price}` : "";
  const optionType = signal.option_type ?? "";

  return `${action} ${underlying} ${strike} ${optionType}`.trim();
}

function withOrgQuery(href: string, organizationSlug?: string | null) {
  if (!organizationSlug) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}org=${encodeURIComponent(organizationSlug)}`;
}

/* -------------------------------------------------
   DERIVE PRICE LEVELS (SL / TP)
------------------------------------------------- */
function derivePriceLevels({
  entry,
  action,
  rules,
}: {
  entry: number;
  action: "BUY" | "SELL";
  rules: ExecutionRule[];
}): PriceLevel[] {
  const isBuy = action === "BUY";

  return rules
    .filter(
      (r) =>
        (r.rule_type === "STOP_LOSS" || r.rule_type === "TAKE_PROFIT") &&
        typeof r.value_pct === "number"
    )
    .map((r) => {
      const magnitude = Math.abs(r.value_pct!) / 100;

      const price =
        r.rule_type === "STOP_LOSS"
          ? isBuy
            ? entry * (1 - magnitude)
            : entry * (1 + magnitude)
          : isBuy
            ? entry * (1 + magnitude)
            : entry * (1 - magnitude);

      return {
        type: r.rule_type as RuleType,
        price: Number(price.toFixed(2)),
      };
    });
}

/* -------------------------------------------------
   PAGE: SIGNAL DETAIL
------------------------------------------------- */
export default async function SignalDetailPage({
  params,
  searchParams,
}: {
  params: { signalId: string };
  searchParams?: {
    created?: string;
    saved?: string;
    org?: string;
  };
}) {
  const supabase = await createSupabaseServerClient();

  const profile = await getProfile({
    organizationSlug: searchParams?.org,
  });

  const currentOrganization = profile.current_organization;

  if (!currentOrganization) {
    redirect("/dashboard/billing?reason=no_organization");
  }

  const organizationSlug = currentOrganization.organization_slug;

  const isMasterAdmin =
    currentOrganization.is_master_admin === true ||
    profile.roles?.[0]?.name === "master_admin" ||
    profile.roles?.[0]?.rank === 4 ||
    String(profile.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com";

  const hasSignalAccess =
    isMasterAdmin ||
    (currentOrganization.active === true &&
      currentOrganization.has_active_subscription === true &&
      currentOrganization.has_discord_access === true);

  if (!hasSignalAccess) {
    redirect(
      withOrgQuery("/dashboard/billing?reason=signals_locked", organizationSlug)
    );
  }

  /* LOAD SIGNAL */
  const { data: signal, error } = await supabase
    .from("signals")
    .select(
      `
      id,
      organization_id,
      asset,
      underlying,
      instrument_type,
      action,
      option_type,
      strike_price,
      expiration_date,
      entry_price,
      underlying_entry_price,
      trade_style,
      confidence,
      status,
      watching,
      watched,
      rationale,
      stop_loss_pct,
      take_profit_pct,
      outcome,
      return_pct,
      exit_price,
      closed_at,
      created_at,
      updated_at
    `
    )
    .eq("id", params.signalId)
    .eq("organization_id", currentOrganization.organization_id)
    .single();

  if (error || !signal) notFound();

  const displayStatus = getSignalDisplayStatus({
    status: signal.status,
    watching: signal.watching,
    watched: signal.watched,
    closed_at: signal.closed_at,
    outcome: signal.outcome,
    return_pct: signal.return_pct,
  });

  const hasUnderlyingEntry =
    signal.underlying_entry_price !== null &&
    signal.underlying_entry_price !== undefined &&
    !Number.isNaN(Number(signal.underlying_entry_price));

  /* LOAD EXECUTION RULES */
  const { data: rules } = await supabase
    .from("signal_execution_rules")
    .select(
      `
      id,
      rule_type,
      value_pct,
      quantity_pct,
      is_active
    `
    )
    .eq("signal_id", signal.id)
    .eq("is_active", true);

  const typedRules: ExecutionRule[] = rules ?? [];

  /* -------------------------------------------------
     LOAD EXECUTION + FILLS (AUTHORITATIVE)
  ------------------------------------------------- */
  const { data: executionRow } = await supabase
    .from("signal_executions")
    .select(
      `
      id,
      status,
      contracts,
      entry_price,
      opened_at,
      closed_at,
      execution_fills (
        side,
        contracts,
        price,
        created_at
      )
    `
    )
    .eq("signal_id", signal.id)
    .maybeSingle();

  let execution: any | null = null;

  if (executionRow) {
    const openedContracts =
      executionRow.execution_fills
        ?.filter((fill: any) => fill.side === "OPEN")
        .reduce(
          (sum: number, fill: any) => sum + Number(fill.contracts ?? 0),
          0
        ) ?? 0;

    const closedContracts =
      executionRow.execution_fills
        ?.filter((fill: any) => fill.side === "CLOSE")
        .reduce(
          (sum: number, fill: any) => sum + Number(fill.contracts ?? 0),
          0
        ) ?? 0;

    const totalContracts =
      Number(executionRow.contracts ?? 0) > 0
        ? Number(executionRow.contracts)
        : openedContracts;

    const remaining = Math.max(totalContracts - closedContracts, 0);

    execution = {
      ...executionRow,
      contracts: totalContracts,
      remaining_contracts: remaining,
      status: remaining === 0 ? "CLOSED" : "OPEN",
    };
  }

  /* PRICE LEVELS */
  const priceLevels: PriceLevel[] = hasUnderlyingEntry
    ? derivePriceLevels({
        entry: Number(signal.underlying_entry_price),
        action: signal.action,
        rules: typedRules,
      })
    : [];

  const interval = tradeStyleToInterval(signal.trade_style);
  const showCreatedBanner = searchParams?.created === "1";
  const showSavedBanner = searchParams?.saved === "1";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-300">
            {currentOrganization.organization_name} · Signal Detail
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">
            {formatSignalTitle(signal)}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Review strike, expiration, entry, risk levels, execution rules, and
            fill tracking for this signal.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={withOrgQuery("/dashboard/signals", organizationSlug)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Signals
          </Link>

          {isMasterAdmin && (
            <Link
              href={withOrgQuery(
                `/dashboard/signals/edit/${signal.id}`,
                organizationSlug
              )}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              <Edit3 className="h-4 w-4" />
              Edit Signal
            </Link>
          )}
        </div>
      </div>

      {showCreatedBanner && (
        <Notice
          icon={<CheckCircle2 />}
          title="Signal Created"
          body="Signal created successfully. Review details below."
          tone="emerald"
        />
      )}

      {showSavedBanner && (
        <Notice
          icon={<CheckCircle2 />}
          title="Signal Updated"
          body="Signal changes were saved successfully."
          tone="emerald"
        />
      )}

      {!hasUnderlyingEntry && (
        <Notice
          icon={<AlertTriangle />}
          title="Chart Levels Unavailable"
          body="Underlying entry price was not captured. Chart levels cannot be rendered until the signal has an underlying entry price."
          tone="red"
        />
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Hash />}
          label="Strike"
          value={signal.strike_price ?? "—"}
        />

        <MetricCard
          icon={<CircleDollarSign />}
          label="Entry"
          value={formatCurrency(signal.entry_price)}
        />

        <MetricCard
          icon={<CalendarDays />}
          label="Expiration"
          value={formatDate(signal.expiration_date)}
        />

        <MetricCard
          icon={<Gauge />}
          label="Confidence"
          value={
            signal.confidence !== null && signal.confidence !== undefined
              ? `${signal.confidence}%`
              : "—"
          }
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  Signal Summary
                </h2>
                <p className="text-sm text-slate-400">
                  Core details shown to subscribers.
                </p>
              </div>
            </div>

            <SignalSummaryCard signal={signal} />
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-sky-500/10 p-3 text-sky-300">
                <Target className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  Risk Snapshot
                </h2>
                <p className="text-sm text-slate-400">
                  Saved risk targets from the signal record.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <MiniRow
                label="Stop Loss"
                value={formatPercent(signal.stop_loss_pct)}
              />
              <MiniRow
                label="Take Profit"
                value={formatPercent(signal.take_profit_pct)}
              />
              <MiniRow
                label="Trade Style"
                value={signal.trade_style?.toUpperCase() ?? "—"}
              />
              <MiniRow label="Status" value={displayStatus} />
              <MiniRow label="Outcome" value={signal.outcome ?? "—"} />
              <MiniRow label="Return" value={formatPercent(signal.return_pct)} />
              <MiniRow label="Exit" value={formatCurrency(signal.exit_price)} />
            </div>
          </div>
        </div>

        {hasUnderlyingEntry && (
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                  <LineChart className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-100">
                    Price Chart — {signal.underlying}
                  </h2>
                  <p className="text-sm text-slate-400">
                    Interval: {signal.trade_style ?? "swing"} · Entry:{" "}
                    {formatCurrency(signal.underlying_entry_price)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <TradingViewChart
                symbol={signal.underlying}
                interval={interval}
                entryPrice={Number(signal.underlying_entry_price)}
                levels={priceLevels}
              />
            </div>
          </section>
        )}
      </section>

      {signal.rationale && (
        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Rationale</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
            {signal.rationale}
          </p>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RiskPanel
          key={JSON.stringify(
            typedRules.map(
              (r) => `${r.rule_type}:${r.value_pct}:${r.quantity_pct}`
            )
          )}
          signal={signal}
          rules={typedRules}
        />

        <ExecutionRulesTable rules={typedRules} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-100">Execution Tracking</h2>
            <p className="text-sm text-slate-400">
              Track contract execution and remaining position status.
            </p>
          </div>
        </div>

        <ExecutionPanel signalId={signal.id} execution={execution} />
      </section>

      {isMasterAdmin && (
        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="font-semibold text-slate-100">
            Execution Rule Templates
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Quickly apply standard stop-loss and take-profit rules.
          </p>

          <div className="mt-5">
            <ExecutionRuleTemplateButtons signalId={signal.id} />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <h2 className="text-lg font-semibold text-slate-100">
          Audit Information
        </h2>

        <dl className="mt-5 grid gap-4 text-sm md:grid-cols-3">
          <AuditRow label="Signal ID" value={signal.id} mono />
          <AuditRow
            label="Organization"
            value={currentOrganization.organization_name}
          />
          <AuditRow
            label="Organization ID"
            value={signal.organization_id ?? "—"}
            mono
          />
          <AuditRow
            label="Created At"
            value={formatDateTime(signal.created_at)}
          />
          <AuditRow
            label="Updated At"
            value={formatDateTime(signal.updated_at)}
          />
          <AuditRow label="Closed At" value={formatDateTime(signal.closed_at)} />
          <AuditRow label="Instrument" value={signal.instrument_type ?? "—"} />
          <AuditRow label="Option Type" value={signal.option_type ?? "—"} />
          <AuditRow label="Outcome" value={signal.outcome ?? "—"} />
          <AuditRow label="Return" value={formatPercent(signal.return_pct)} />
          <AuditRow label="Exit Price" value={formatCurrency(signal.exit_price)} />
        </dl>
      </section>
    </div>
  );
}

function Notice({
  icon,
  title,
  body,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "emerald" | "red";
}) {
  const classes =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`rounded-2xl border px-5 py-4 ${classes}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-300">{body}</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
      <div className="mb-4 text-emerald-400 [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function AuditRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={
          "mt-1 break-all text-slate-200 " + (mono ? "font-mono text-xs" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}