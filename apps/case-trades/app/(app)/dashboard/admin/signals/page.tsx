import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Signal Administration | CASE Trades",
  description:
    "Manage all trading signals across the CASE Trades platform, including signal moderation, lifecycle management, organization oversight, performance monitoring, and administrative controls.",
};

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  PlusCircle,
  Target,
  TrendingUp,
} from "lucide-react";

import { getProfile } from "@/lib/getProfile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccessibleOrganizations } from "@/lib/orgs/getAccessibleOrganizations";
import SignalFilters from "@/components/signals/SignalFilters";
import SignalsTable, { type Signal } from "@/components/signals/SignalsTable";
import {
  getSignalDisplayStatus,
  normalizePersistedSignalStatus,
} from "@/lib/signals/displayState";
import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

export const dynamic = "force-dynamic";

type SignalsPageProps = {
  searchParams?: {
    range?: string;
    status?: string;
    org?: string;
    deleted?: string;
    error?: string;
  };
};

type SignalStatus = "Active" | "Triggered" | "Closed" | "Expired";
type SignalTradeStyle = string;
type SignalOutcome = "WIN" | "LOSS" | "BREAKEVEN";

type OrganizationOption = {
  id: string;
  name: string;
  slug: string;
};

type SignalOptionLegRow = {
  id: string;
  signal_id: string;
  leg_order: number;
  action: string;
  option_type: "CALL" | "PUT" | string;
  strike_price: number | string | null;
  expiration_date: string | null;
  contracts: number | string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
};

type SignalRow = {
  id: string;
  organization_id: string;
  asset: string | null;
  underlying: string;
  instrument_type: "OPTION" | "STOCK";
  action: "BUY" | "SELL";
  open_action: string | null;
  quantity: number | null;
  contracts: number | null;
  shares: number | null;
  option_type: "CALL" | "PUT" | null;
  strike_price: number | null;
  expiration_date: string | null;
  entry_price: number | null;
  price: number | null;
  trade_style: string | null;
  strategy_type: string | null;
  confidence: number | null;
  status: string;
  watching: boolean | null;
  watched: boolean | null;
  created_at: string | null;
  closed_at: string | null;
  outcome: SignalOutcome | null;
  return_pct: number | null;
  exit_price: number | null;
  signal_execution_rules:
    | {
        rule_type: string;
        value_pct: number | null;
        is_active: boolean | null;
      }[]
    | null;
  signal_executions:
    | {
        id: string;
        contracts: number;
        execution_fills:
          | {
              signal_option_leg_id: string | null;
              side: string;
              contracts: number;
              price: number;
            }[]
          | null;
      }[]
    | null;
};

const DEFAULT_ORG_SLUG = "case-trades";

const RANGE_OPTIONS = [
  { label: "7D", value: "7d", days: 7 },
  { label: "14D", value: "14d", days: 14 },
  { label: "30D", value: "30d", days: 30 },
  { label: "3M", value: "3m", days: 90 },
  { label: "6M", value: "6m", days: 180 },
  { label: "1Y", value: "1y", days: 365 },
  { label: "2Y", value: "2y", days: 730 },
  { label: "All", value: "all", days: null },
];

const STATUS_OPTIONS = [
  { label: "Active + Recent", value: "active_recent" },
  { label: "Watching", value: "watching" },
  { label: "Active", value: "active" },
  { label: "Triggered", value: "triggered" },
  { label: "Closed", value: "closed" },
  { label: "Expired", value: "expired" },
  { label: "Watched", value: "watched" },
  { label: "All", value: "all" },
];

const STATUS_VALUE_MAP: Record<string, SignalStatus> = {
  active: "Active",
  triggered: "Triggered",
  closed: "Closed",
  expired: "Expired",
};

function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function isProfileMasterAdmin(profile: any) {
  const email = String(profile?.email ?? "").toLowerCase();

  const roleName =
    profile?.role?.name ??
    profile?.roles?.name ??
    profile?.roles?.[0]?.name ??
    profile?.role_name ??
    "";

  const roleRank =
    profile?.role?.rank ??
    profile?.roles?.rank ??
    profile?.roles?.[0]?.rank ??
    profile?.role_rank ??
    0;

  return Boolean(
    profile?.master_admin === true ||
      profile?.current_organization?.is_master_admin === true ||
      roleName === "master_admin" ||
      Number(roleRank) >= 4 ||
      email === "csthilaire@xilairetechnologies.com"
  );
}

function normalizeTradeStyle(
  value: string | null
): SignalTradeStyle | undefined {
  if (!value) {
    return undefined;
  }

  return value;
}

function normalizeSignalStatus(value: string | null): SignalStatus {
  return normalizePersistedSignalStatus(value);
}

function toNumber(
  value: number | string | null | undefined,
  fallback = 0
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function getStrategyQuantity({
  optionLegs,
  fallbackQuantity,
}: {
  optionLegs: SignalOptionLegRow[];
  fallbackQuantity: number | null;
}) {
  if (optionLegs.length === 0) {
    return fallbackQuantity;
  }

  const quantities = optionLegs
    .map((leg) => toNumber(leg.contracts))
    .filter((quantity) => quantity > 0);

  if (quantities.length === 0) {
    return fallbackQuantity;
  }

  return Math.max(...quantities);
}

function getRangeStart(range: string) {
  const selected =
    RANGE_OPTIONS.find((option) => option.value === range) ??
    RANGE_OPTIONS.find((option) => option.value === "30d")!;

  if (selected.days === null) {
    return null;
  }

  const date = new Date();
  date.setDate(date.getDate() - selected.days);

  return date.toISOString();
}

function buildSignalsUrl({
  org,
  range,
  status,
}: {
  org: string;
  range: string;
  status: string;
}) {
  const params = new URLSearchParams();

  params.set("org", org);
  params.set("range", range);
  params.set("status", status);

  return `/dashboard/admin/signals?${params.toString()}`;
}

function buildSignalsRedirectUrl({
  org,
  range,
  status,
  deleted,
  error,
}: {
  org: string;
  range: string;
  status: string;
  deleted?: string;
  error?: string;
}) {
  const params = new URLSearchParams();

  params.set("org", org);
  params.set("range", range);
  params.set("status", status);

  if (deleted) {
    params.set("deleted", deleted);
  }

  if (error) {
    params.set("error", error);
  }

  return `/dashboard/admin/signals?${params.toString()}`;
}

async function deleteSignalAction(formData: FormData) {
  "use server";

  const signalId = String(formData.get("signal_id") ?? "");
  const organizationId = String(formData.get("organization_id") ?? "");
  const orgSlug = String(formData.get("org") ?? DEFAULT_ORG_SLUG);
  const range = String(formData.get("range") ?? "30d");
  const status = String(formData.get("status") ?? "active_recent");

  if (!signalId || !organizationId) {
    redirect(
      buildSignalsRedirectUrl({
        org: orgSlug,
        range,
        status,
        error: "missing_signal",
      })
    );
  }

  let profile;

  try {
    profile = await getProfile({
      organizationSlug: orgSlug,
    });
  } catch {
    redirect("/auth/signin");
  }

  if (!isProfileMasterAdmin(profile)) {
    redirect(
      buildSignalsRedirectUrl({
        org: orgSlug,
        range,
        status,
        error: "not_authorized",
      })
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data: selectedOrganization, error: selectedOrganizationError } =
    await supabase
      .from("organizations")
      .select("id, slug")
      .eq("id", organizationId)
      .eq("slug", orgSlug)
      .eq("active", true)
      .maybeSingle();

  if (selectedOrganizationError || !selectedOrganization) {
    console.error("Delete signal organization guard failed", {
      organizationId,
      orgSlug,
      selectedOrganizationError,
    });

    redirect(
      buildSignalsRedirectUrl({
        org: orgSlug,
        range,
        status,
        error: "organization_guard_failed",
      })
    );
  }

  const { data: existingSignal, error: existingSignalError } = await supabase
    .from("signals")
    .select("id, organization_id")
    .eq("id", signalId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existingSignalError) {
    console.error("Delete signal lookup failed", existingSignalError);

    redirect(
      buildSignalsRedirectUrl({
        org: orgSlug,
        range,
        status,
        error: "delete_lookup_failed",
      })
    );
  }

  if (!existingSignal) {
    console.error("Delete signal lookup returned no matching signal", {
      signalId,
      organizationId,
    });

    redirect(
      buildSignalsRedirectUrl({
        org: orgSlug,
        range,
        status,
        error: "signal_not_found",
      })
    );
  }

  const { data: executions, error: executionsLookupError } = await supabase
    .from("signal_executions")
    .select("id")
    .eq("signal_id", signalId);

  if (executionsLookupError) {
    console.error(
      "Delete signal executions lookup failed",
      executionsLookupError
    );

    redirect(
      buildSignalsRedirectUrl({
        org: orgSlug,
        range,
        status,
        error: "delete_execution_lookup_failed",
      })
    );
  }

  const executionIds = executions?.map((execution) => execution.id) ?? [];

  if (executionIds.length > 0) {
    const { error: fillsDeleteError } = await supabase
      .from("execution_fills")
      .delete()
      .in("execution_id", executionIds);

    if (fillsDeleteError) {
      console.error("Delete signal execution fills failed", fillsDeleteError);

      redirect(
        buildSignalsRedirectUrl({
          org: orgSlug,
          range,
          status,
          error: "delete_fills_failed",
        })
      );
    }
  }

  const { error: executionsDeleteError } = await supabase
    .from("signal_executions")
    .delete()
    .eq("signal_id", signalId);

  if (executionsDeleteError) {
    console.error("Delete signal executions failed", executionsDeleteError);

    redirect(
      buildSignalsRedirectUrl({
        org: orgSlug,
        range,
        status,
        error: "delete_executions_failed",
      })
    );
  }

  const { error: rulesDeleteError } = await supabase
    .from("signal_execution_rules")
    .delete()
    .eq("signal_id", signalId);

  if (rulesDeleteError) {
    console.error("Delete signal execution rules failed", rulesDeleteError);

    redirect(
      buildSignalsRedirectUrl({
        org: orgSlug,
        range,
        status,
        error: "delete_rules_failed",
      })
    );
  }

  const { error: optionLegsDeleteError } = await supabase
    .from("signal_option_legs")
    .delete()
    .eq("signal_id", signalId);

  if (optionLegsDeleteError) {
    console.error("Delete signal option legs failed", optionLegsDeleteError);

    redirect(
      buildSignalsRedirectUrl({
        org: orgSlug,
        range,
        status,
        error: "delete_option_legs_failed",
      })
    );
  }

  const { data: deletedSignalRows, error: signalDeleteError } = await supabase
    .from("signals")
    .delete()
    .eq("id", signalId)
    .eq("organization_id", organizationId)
    .select("id");

  if (signalDeleteError) {
    console.error("Delete signal failed", signalDeleteError);

    redirect(
      buildSignalsRedirectUrl({
        org: orgSlug,
        range,
        status,
        error: "delete_failed",
      })
    );
  }

  if (!deletedSignalRows || deletedSignalRows.length === 0) {
    console.error("Delete signal completed but deleted zero rows", {
      signalId,
      organizationId,
    });

    redirect(
      buildSignalsRedirectUrl({
        org: orgSlug,
        range,
        status,
        error: "delete_zero_rows",
      })
    );
  }

  revalidatePath("/dashboard/admin/signals");
  revalidatePath("/dashboard/signals");
  revalidatePath(`/dashboard/signals/${signalId}`);
  revalidatePath(`/dashboard/signals/edit/${signalId}`);

  redirect(
    buildSignalsRedirectUrl({
      org: orgSlug,
      range,
      status,
      deleted: "1",
    })
  );
}

export default async function SignalsPage({
  searchParams,
}: SignalsPageProps) {
  const range = searchParams?.range ?? "30d";
  const statusFilter = searchParams?.status ?? "active_recent";
  const requestedOrgSlug = searchParams?.org ?? DEFAULT_ORG_SLUG;
  const rangeStart = getRangeStart(range);

  let profile;

  try {
    profile = await getProfile({
      organizationSlug: requestedOrgSlug,
    });
  } catch {
    redirect("/auth/signin");
  }

  if (!isProfileMasterAdmin(profile)) {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();

  const { data: allOrganizations, error: organizationsError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("active", true)
    .order("name", { ascending: true });

  if (organizationsError) {
    console.error("Failed to load organizations", organizationsError);
    throw new Error("Failed to load organizations");
  }

  let accessibleOrganizations = (allOrganizations ?? []) as OrganizationOption[];

  if (accessibleOrganizations.length === 0) {
    const userOrganizations = await getAccessibleOrganizations(profile.id);

    accessibleOrganizations = userOrganizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    }));
  }

  if (accessibleOrganizations.length === 0) {
    redirect("/dashboard?error=no_organizations");
  }

  const selectedOrganization =
    accessibleOrganizations.find((org) => org.slug === requestedOrgSlug) ??
    accessibleOrganizations.find((org) => org.slug === DEFAULT_ORG_SLUG) ??
    accessibleOrganizations[0];

  if (!selectedOrganization) {
    redirect("/dashboard?error=no_selected_organization");
  }

  if (selectedOrganization.slug !== requestedOrgSlug) {
    redirect(
      buildSignalsUrl({
        org: selectedOrganization.slug,
        range,
        status: statusFilter,
      })
    );
  }

  let query = supabase
    .from("signals")
    .select(
      `
      id,
      organization_id,
      asset,
      underlying,
      instrument_type,
      action,
      open_action,
      quantity,
      contracts,
      shares,
      option_type,
      strike_price,
      expiration_date,
      entry_price,
      price,
      trade_style,
      strategy_type,
      confidence,
      status,
      watching,
      watched,
      created_at,
      closed_at,
      outcome,
      return_pct,
      exit_price,
      signal_execution_rules!left (
        rule_type,
        value_pct,
        is_active
      ),
      signal_executions!left (
        id,
        contracts,
        execution_fills!left (
          signal_option_leg_id,
          side,
          contracts,
          price
        )
      )
    `
    )
    .eq("organization_id", selectedOrganization.id)
    .order("created_at", { ascending: false });

  if (statusFilter === "active_recent") {
    if (rangeStart) {
      query = query.or(
        `status.eq.Active,status.eq.Triggered,status.eq.Closed,status.eq.Expired,created_at.gte.${rangeStart}`
      );
    } else {
      query = query.in("status", ["Active", "Triggered", "Closed", "Expired"]);
    }
  } else {
    if (rangeStart && statusFilter !== "active" && statusFilter !== "watching") {
      query = query.gte("created_at", rangeStart);
    }

    const mappedStatus = STATUS_VALUE_MAP[statusFilter];

    if (mappedStatus) {
      query = query.eq("status", mappedStatus);
    }

    if (statusFilter === "watching") {
      query = query.eq("status", "Active").eq("watching", true);
    }

    if (statusFilter === "watched") {
      query = query.or("watching.eq.true,watched.eq.true");
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load master-admin signals", error);
    throw new Error("Failed to load master-admin signals");
  }

  const rows = (data ?? []) as SignalRow[];
  const signalIds = rows.map((row) => row.id);

  /*
   * The authenticated client currently receives an empty array from
   * signal_option_legs because of that table's SELECT RLS policy.
   *
   * The signal IDs below were already restricted to the selected
   * organization by the authorized signal query above, so the service-role
   * lookup is scoped only to those approved parent rows.
   */
  const legsBySignalId = new Map<string, SignalOptionLegRow[]>();

  if (signalIds.length > 0) {
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: optionLegData, error: optionLegsError } = await supabaseAdmin
      .from("signal_option_legs")
      .select(
        `
        id,
        signal_id,
        leg_order,
        action,
        option_type,
        strike_price,
        expiration_date,
        contracts,
        entry_price,
        exit_price
      `
      )
      .in("signal_id", signalIds)
      .order("signal_id", { ascending: true })
      .order("leg_order", { ascending: true });

    if (optionLegsError) {
      console.error("Failed to load admin signal option legs", {
        organizationId: selectedOrganization.id,
        signalIds,
        error: optionLegsError,
      });

      throw new Error("Failed to load admin signal option legs");
    }

    const authorizedSignalIds = new Set(signalIds);

    for (const rawLeg of optionLegData ?? []) {
      const leg = rawLeg as SignalOptionLegRow;

      if (!authorizedSignalIds.has(leg.signal_id)) {
        continue;
      }

      const existingLegs = legsBySignalId.get(leg.signal_id) ?? [];

      existingLegs.push(leg);
      legsBySignalId.set(leg.signal_id, existingLegs);
    }

    for (const [signalId, legs] of legsBySignalId.entries()) {
      legs.sort((firstLeg, secondLeg) => {
        return firstLeg.leg_order - secondLeg.leg_order;
      });

      legsBySignalId.set(signalId, legs);
    }

    console.log("Admin signals page option-leg load", {
      organization_id: selectedOrganization.id,
      requested_signal_count: signalIds.length,
      returned_leg_count: optionLegData?.length ?? 0,
      signals_with_legs: legsBySignalId.size,
    });
  }

  const signals: Signal[] = rows.map((row) => {
    const rules = (row.signal_execution_rules ?? []).filter(
      (rule) => rule.is_active
    );

    const stopLossRule = rules.find((rule) => rule.rule_type === "STOP_LOSS");

    const takeProfitRule = rules.find(
      (rule) => rule.rule_type === "TAKE_PROFIT"
    );

    const optionLegs = legsBySignalId.get(row.id) ?? [];

    const tradeSummary = buildTradeSummary({
      symbol: row.asset,
      underlying: row.underlying,
      instrument_type: row.instrument_type,
      trade_style:
        row.strategy_type ??
        row.trade_style,
      action: row.action,
      open_action: row.open_action,
      entry_price: row.entry_price ?? row.price,
      exit_price: row.exit_price,
      contracts: row.contracts,
      quantity: row.quantity,
      option_type: row.option_type,
      strike_price: row.strike_price,
      expiration_date: row.expiration_date,
      option_legs: optionLegs as TradeSummaryOptionLegInput[],
    });

    const strategyQuantity = getStrategyQuantity({
      optionLegs,
      fallbackQuantity:
        row.instrument_type === "OPTION"
          ? row.contracts ?? row.quantity
          : row.shares ?? row.quantity,
    });

    const execution = row.signal_executions?.[0] ?? null;

    let contracts: number | null = null;
    let remaining_contracts: number | null = null;
    let execution_status: Signal["execution_status"] = null;
    let pnl: number | null = null;
    let pnl_pct: number | null = null;

    if (execution) {
      const totalContracts = toNumber(execution.contracts);
      const entryPrice = toNumber(row.entry_price ?? row.price);

      const closeFills =
        execution.execution_fills?.filter(
          (fill) => String(fill.side).toUpperCase() === "CLOSE"
        ) ?? [];

      contracts = totalContracts;

      if (optionLegs.length > 1) {
        const closeFillsByLeg = new Map<string, number>();

        for (const fill of closeFills) {
          if (!fill.signal_option_leg_id) {
            continue;
          }

          closeFillsByLeg.set(
            fill.signal_option_leg_id,
            (closeFillsByLeg.get(fill.signal_option_leg_id) ?? 0) +
              toNumber(fill.contracts)
          );
        }

        const remainingByLeg = optionLegs.map((leg) => {
          const openedLegContracts = Math.max(toNumber(leg.contracts), 1);
          const closedLegContracts =
            closeFillsByLeg.get(leg.id) ?? 0;

          return Math.max(openedLegContracts - closedLegContracts, 0);
        });

        const remaining =
          remainingByLeg.length > 0
            ? Math.min(...remainingByLeg)
            : totalContracts;

        const hasCloseFills = closeFills.length > 0;

        remaining_contracts =
          row.status === "Closed" ? 0 : remaining;

        execution_status =
          row.status === "Closed"
            ? "CLOSED"
            : hasCloseFills
              ? remaining > 0
                ? "PARTIAL"
                : "CLOSED"
              : "OPEN";

        pnl_pct = row.return_pct ?? null;
      } else {
        const closedContracts = closeFills.reduce(
          (sum, fill) => sum + toNumber(fill.contracts),
          0
        );

        const remaining = Math.max(totalContracts - closedContracts, 0);

        remaining_contracts = remaining;

        execution_status =
          remaining > 0 && closedContracts > 0
            ? "PARTIAL"
            : remaining > 0
              ? "OPEN"
              : "CLOSED";

        if (closeFills.length > 0 && entryPrice > 0) {
          const multiplier =
            row.instrument_type === "OPTION" ? 100 : 1;

          pnl = closeFills.reduce((sum, fill) => {
            return (
              sum +
              (toNumber(fill.price) - entryPrice) *
                toNumber(fill.contracts) *
                multiplier
            );
          }, 0);

          const entryBasis =
            entryPrice * totalContracts * multiplier;

          pnl_pct =
            entryBasis > 0
              ? (pnl / entryBasis) * 100
              : null;
        }
      }
    }

    const dbStatus = normalizeSignalStatus(row.status);
    const watching = row.watching ?? false;
    const watched = row.watched ?? false;

    const displayStatus = getSignalDisplayStatus({
      status: dbStatus,
      watching,
      watched,
      closed_at: row.closed_at,
      outcome: row.outcome,
      return_pct: row.return_pct,
    });

    return {
      id: row.id,
      organization_id: row.organization_id,
      asset: row.asset ?? row.underlying,
      underlying: row.underlying,
      instrument_type: row.instrument_type,
      action: row.action,
      open_action: row.open_action,
      option_type: row.option_type ?? undefined,
      strike_price:
        tradeSummary.primaryStrikePrice ??
        row.strike_price ??
        undefined,
      expiration_date:
        tradeSummary.primaryExpirationDate ??
        row.expiration_date ??
        undefined,
      entry_price:
        tradeSummary.netEntry !== null
          ? Math.abs(tradeSummary.netEntry)
          : row.entry_price ?? row.price ?? undefined,
      price:
        row.price !== null && row.price !== undefined
          ? String(row.price)
          : undefined,
      trade_style:
        normalizeTradeStyle(row.trade_style),
      strategy_type:
        normalizeTradeStyle(
          row.strategy_type ??
          tradeSummary.tradeStyleLabel,
        ),
      option_legs: optionLegs,
      execution_status,
      contracts: contracts ?? strategyQuantity,
      remaining_contracts,
      pnl,
      pnl_pct,
      stop_loss_pct: stopLossRule?.value_pct ?? null,
      take_profit_pct: takeProfitRule?.value_pct ?? null,
      confidence: row.confidence ?? 0,
      status: displayStatus,
      watching,
      watched,
      created_at: row.created_at ?? undefined,
      closed_at: row.closed_at ?? null,
      outcome: row.outcome ?? null,
      return_pct: row.return_pct ?? null,
      exit_price: row.exit_price ?? null,
    };
  });

  const totalSignals = signals.length;

  const activeSignals = signals.filter((signal) => {
    const displayStatus = getSignalDisplayStatus({
      status: signal.status,
      watching: signal.watching,
      watched: signal.watched,
      closed_at: signal.closed_at,
      outcome: signal.outcome,
      return_pct: signal.return_pct,
    });

    return displayStatus === "Active" || displayStatus === "Watching";
  }).length;

  const watchingSignals = signals.filter((signal) => {
    const displayStatus = getSignalDisplayStatus({
      status: signal.status,
      watching: signal.watching,
      watched: signal.watched,
      closed_at: signal.closed_at,
      outcome: signal.outcome,
      return_pct: signal.return_pct,
    });

    return displayStatus === "Watching" || signal.watching;
  }).length;

  const avgConfidence =
    totalSignals > 0
      ? Math.round(
          signals.reduce((sum, signal) => sum + signal.confidence, 0) /
            totalSignals
        )
      : 0;

  const deleteSuccess = searchParams?.deleted === "1";
  const deleteError = searchParams?.error;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-emerald-400">
            <Building2 className="h-4 w-4" />
            <span>{selectedOrganization.name}</span>
          </div>

          <h1 className="text-2xl font-semibold text-slate-100">
            Manage Signals
          </h1>

          <p className="text-sm text-slate-400">
            Master-admin control panel for active and historical trading
            signals.
          </p>
        </div>

        <Link
          href={`/dashboard/admin/signals/create?org=${selectedOrganization.slug}`}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <PlusCircle className="h-4 w-4" />
          Create Signal
        </Link>
      </div>

      {deleteSuccess && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          Signal deleted successfully.
        </div>
      )}

      {deleteError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4" />

            <div>
              <p className="font-medium">Signal delete failed.</p>

              <p className="mt-1 text-xs text-red-200/80">
                Error code: {deleteError}
              </p>
            </div>
          </div>
        </div>
      )}

      {accessibleOrganizations.length > 1 && (
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Signal Board Organization
          </p>

          <div className="flex flex-wrap gap-2">
            {accessibleOrganizations.map((org) => {
              const active = org.id === selectedOrganization.id;

              return (
                <Link
                  key={org.id}
                  href={buildSignalsUrl({
                    org: org.slug,
                    range,
                    status: statusFilter,
                  })}
                  className={
                    "rounded-full px-3 py-1.5 text-sm font-medium transition " +
                    (active
                      ? "bg-emerald-600 text-white"
                      : "border border-white/10 bg-slate-950 text-slate-300 hover:bg-slate-800")
                  }
                >
                  {org.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <SignalStat
          title="Visible Signals"
          value={String(totalSignals)}
          icon={<Activity />}
        />

        <SignalStat
          title="Active + Watching"
          value={String(activeSignals)}
          icon={<TrendingUp />}
        />

        <SignalStat
          title="Watching"
          value={String(watchingSignals)}
          icon={<Target />}
        />

        <SignalStat
          title="Avg Confidence"
          value={`${avgConfidence}%`}
          icon={<BarChart3 />}
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-6 space-y-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Admin Signal Board
              </h2>

              <p className="text-sm text-slate-400">
                Viewing signals from {selectedOrganization.name}. Active and
                watching signals always show. Older triggered, closed, or
                expired signals are filtered by range.
              </p>
            </div>

            <p className="text-xs text-slate-500">
              Delete removes the signal, execution rules, executions, and fills.
            </p>
          </div>

          <SignalFilters
            range={range}
            status={statusFilter}
            ranges={RANGE_OPTIONS.map(({ label, value }) => ({
              label,
              value,
            }))}
            statuses={STATUS_OPTIONS}
          />
        </div>

        <SignalsTable
          initialSignals={signals}
          isMasterAdmin={true}
          deleteSignalAction={deleteSignalAction}
          selectedOrganizationId={selectedOrganization.id}
          selectedOrganizationSlug={selectedOrganization.slug}
          range={range}
          status={statusFilter}
        />
      </div>
    </div>
  );
}

function SignalStat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
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
