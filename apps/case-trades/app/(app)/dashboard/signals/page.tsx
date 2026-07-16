import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  PlusCircle,
  Target,
  TrendingUp,
} from "lucide-react";

import type { Metadata } from "next";

import { getProfile } from "@/lib/getProfile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccessibleOrganizations } from "@/lib/orgs/getAccessibleOrganizations";
import SignalFilters from "@/components/signals/SignalFilters";
import SignalsTable, {
  type Signal,
} from "@/components/signals/SignalsTable";
import {
  getSignalDisplayStatus,
  normalizePersistedSignalStatus,
} from "@/lib/signals/displayState";
import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Signals | CASE Trades",
  description:
    "Create, manage, and analyze your trading signals with watchlists, execution tracking, performance insights, and signal lifecycle management in CASE Trades.",
};

export const dynamic = "force-dynamic";

/* -------------------------------------------------
   PAGE TYPES
------------------------------------------------- */
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

type AccessibleOrganization = {
  id: string;
  name: string;
  slug: string;
  role?: string | null;
  role_name?: string | null;
  organization_role?: string | null;
  membership_role?: string | null;
  member_role?: string | null;
  access_role?: string | null;
  org_admin?: boolean | null;
  master_admin?: boolean | null;
  can_manage_signals?: boolean | null;
  can_delete_signals?: boolean | null;
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
  exit_price?: number | string | null;
};

type SignalExecutionRuleRow = {
  rule_type: string;
  value_pct: number | string | null;
  is_active: boolean | null;
};

type SignalExecutionFillRow = {
  side: string;
  contracts: number | string | null;
  price: number | string | null;
};

type SignalExecutionRow = {
  id: string;
  status: string | null;
  contracts: number | string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
  entry_cost: number | string | null;
  exit_value: number | string | null;
  pnl: number | string | null;
  pnl_pct: number | string | null;
  opened_at: string | null;
  closed_at: string | null;
  execution_fills: SignalExecutionFillRow[] | null;
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
  confidence: number | null;
  status: string;
  watching: boolean | null;
  watched: boolean | null;
  created_at: string | null;
  closed_at: string | null;
  outcome: "WIN" | "LOSS" | "BREAKEVEN" | null;
  return_pct: number | null;
  exit_price: number | null;
  signal_execution_rules: SignalExecutionRuleRow[] | null;
  signal_executions: SignalExecutionRow[] | null;
};

/* -------------------------------------------------
   CONSTANTS
------------------------------------------------- */
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

/* -------------------------------------------------
   SUPABASE ADMIN CLIENT
------------------------------------------------- */
function createSupabaseAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES;

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/* -------------------------------------------------
   NUMBER HELPERS
------------------------------------------------- */
function toNumber(
  value: number | string | null | undefined,
  fallback = 0,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

/* -------------------------------------------------
   AUTHORIZATION HELPERS
------------------------------------------------- */
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
      roleName === "master_admin" ||
      Number(roleRank) >= 4 ||
      email === "csthilaire@xilairetechnologies.com",
  );
}

function getOrganizationAccessRole(
  organization: AccessibleOrganization,
) {
  return String(
    organization.role ??
      organization.role_name ??
      organization.organization_role ??
      organization.membership_role ??
      organization.member_role ??
      organization.access_role ??
      "",
  ).toLowerCase();
}

function canManageOrganizationSignals({
  profile,
  organization,
}: {
  profile: any;
  organization?: AccessibleOrganization;
}) {
  if (isProfileMasterAdmin(profile)) {
    return true;
  }

  if (!organization) {
    return false;
  }

  const organizationRole =
    getOrganizationAccessRole(organization);

  return Boolean(
    organization.org_admin === true ||
      organization.master_admin === true ||
      organization.can_manage_signals === true ||
      organization.can_delete_signals === true ||
      organizationRole === "org_admin" ||
      organizationRole === "organization_admin" ||
      organizationRole === "admin" ||
      organizationRole === "owner",
  );
}

/* -------------------------------------------------
   SIGNAL HELPERS
------------------------------------------------- */
function normalizeTradeStyle(
  value: string | null,
): SignalTradeStyle | undefined {
  if (!value) {
    return undefined;
  }

  return value;
}

function normalizeSignalStatus(
  value: string | null,
): SignalStatus {
  return normalizePersistedSignalStatus(value);
}

function getRangeStart(range: string) {
  const selected =
    RANGE_OPTIONS.find(
      (option) => option.value === range,
    ) ??
    RANGE_OPTIONS.find(
      (option) => option.value === "30d",
    )!;

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

  return `/dashboard/signals?${params.toString()}`;
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

  return `/dashboard/signals?${params.toString()}`;
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
    .filter(
      (quantity) =>
        Number.isFinite(quantity) &&
        quantity > 0,
    );

  if (quantities.length === 0) {
    return fallbackQuantity;
  }

  /*
   * A strategy with one contract per leg represents one complete
   * strategy unit. For uneven ratio spreads, the largest quantity
   * remains the safest display fallback.
   */
  return Math.max(...quantities);
}

/* -------------------------------------------------
   DELETE SIGNAL ACTION
------------------------------------------------- */
async function deleteSignalAction(formData: FormData) {
  "use server";

  const signalId = String(
    formData.get("signal_id") ?? "",
  );

  const organizationId = String(
    formData.get("organization_id") ?? "",
  );

  const organizationSlug = String(
    formData.get("org") ?? DEFAULT_ORG_SLUG,
  );

  const range = String(
    formData.get("range") ?? "30d",
  );

  const status = String(
    formData.get("status") ?? "active_recent",
  );

  if (!signalId || !organizationId) {
    redirect(
      buildSignalsRedirectUrl({
        org: organizationSlug,
        range,
        status,
        error: "missing_signal",
      }),
    );
  }

  let profile;

  try {
    profile = await getProfile();
  } catch {
    redirect("/auth/signin");
  }

  const accessibleOrganizations =
    (await getAccessibleOrganizations(
      profile.id,
    )) as AccessibleOrganization[];

  const selectedOrganization =
    accessibleOrganizations.find(
      (accessibleOrganization) =>
        accessibleOrganization.id === organizationId,
    );

  if (!selectedOrganization) {
    redirect(
      buildSignalsRedirectUrl({
        org: organizationSlug,
        range,
        status,
        error: "org_denied",
      }),
    );
  }

  const canDeleteSignals =
    canManageOrganizationSignals({
      profile,
      organization: selectedOrganization,
    });

  if (!canDeleteSignals) {
    redirect(
      buildSignalsRedirectUrl({
        org: organizationSlug,
        range,
        status,
        error: "not_authorized",
      }),
    );
  }

  const supabaseAdmin =
    createSupabaseAdminClient();

  const {
    data: existingSignal,
    error: existingSignalError,
  } = await supabaseAdmin
    .from("signals")
    .select("id, organization_id")
    .eq("id", signalId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existingSignalError) {
    console.error(
      "Delete signal lookup failed",
      existingSignalError,
    );

    redirect(
      buildSignalsRedirectUrl({
        org: organizationSlug,
        range,
        status,
        error: "delete_lookup_failed",
      }),
    );
  }

  if (!existingSignal) {
    redirect(
      buildSignalsRedirectUrl({
        org: organizationSlug,
        range,
        status,
        error: "signal_not_found",
      }),
    );
  }

  const {
    data: executions,
    error: executionsLookupError,
  } = await supabaseAdmin
    .from("signal_executions")
    .select("id")
    .eq("signal_id", signalId);

  if (executionsLookupError) {
    console.error(
      "Delete signal executions lookup failed",
      executionsLookupError,
    );

    redirect(
      buildSignalsRedirectUrl({
        org: organizationSlug,
        range,
        status,
        error: "delete_execution_lookup_failed",
      }),
    );
  }

  const executionIds =
    executions?.map((execution) => execution.id) ??
    [];

  if (executionIds.length > 0) {
    const { error: fillsDeleteError } =
      await supabaseAdmin
        .from("execution_fills")
        .delete()
        .in("execution_id", executionIds);

    if (fillsDeleteError) {
      console.error(
        "Delete signal execution fills failed",
        fillsDeleteError,
      );

      redirect(
        buildSignalsRedirectUrl({
          org: organizationSlug,
          range,
          status,
          error: "delete_fills_failed",
        }),
      );
    }
  }

  const { error: executionsDeleteError } =
    await supabaseAdmin
      .from("signal_executions")
      .delete()
      .eq("signal_id", signalId);

  if (executionsDeleteError) {
    console.error(
      "Delete signal executions failed",
      executionsDeleteError,
    );

    redirect(
      buildSignalsRedirectUrl({
        org: organizationSlug,
        range,
        status,
        error: "delete_executions_failed",
      }),
    );
  }

  const { error: rulesDeleteError } =
    await supabaseAdmin
      .from("signal_execution_rules")
      .delete()
      .eq("signal_id", signalId);

  if (rulesDeleteError) {
    console.error(
      "Delete signal execution rules failed",
      rulesDeleteError,
    );

    redirect(
      buildSignalsRedirectUrl({
        org: organizationSlug,
        range,
        status,
        error: "delete_rules_failed",
      }),
    );
  }

  const { error: optionLegsDeleteError } =
    await supabaseAdmin
      .from("signal_option_legs")
      .delete()
      .eq("signal_id", signalId);

  if (optionLegsDeleteError) {
    console.error(
      "Delete signal option legs failed",
      optionLegsDeleteError,
    );

    redirect(
      buildSignalsRedirectUrl({
        org: organizationSlug,
        range,
        status,
        error: "delete_option_legs_failed",
      }),
    );
  }

  const {
    data: deletedSignalRows,
    error: signalDeleteError,
  } = await supabaseAdmin
    .from("signals")
    .delete()
    .eq("id", signalId)
    .eq("organization_id", organizationId)
    .select("id");

  if (signalDeleteError) {
    console.error(
      "Delete signal failed",
      signalDeleteError,
    );

    redirect(
      buildSignalsRedirectUrl({
        org: organizationSlug,
        range,
        status,
        error: "delete_failed",
      }),
    );
  }

  if (
    !deletedSignalRows ||
    deletedSignalRows.length === 0
  ) {
    console.error(
      "Delete signal completed but deleted zero rows",
      {
        signalId,
        organizationId,
      },
    );

    redirect(
      buildSignalsRedirectUrl({
        org: organizationSlug,
        range,
        status,
        error: "delete_zero_rows",
      }),
    );
  }

  revalidatePath("/dashboard/signals");
  revalidatePath("/dashboard/admin/signals");
  revalidatePath("/dashboard/master-admin/signals");

  redirect(
    buildSignalsRedirectUrl({
      org: organizationSlug,
      range,
      status,
      deleted: "1",
    }),
  );
}

/* -------------------------------------------------
   SIGNALS PAGE
------------------------------------------------- */
export default async function SignalsPage({
  searchParams,
}: SignalsPageProps) {
  let profile;

  try {
    profile = await getProfile();
  } catch {
    redirect("/auth/signin");
  }

  const isMasterAdmin =
    isProfileMasterAdmin(profile);

  const range =
    searchParams?.range ?? "30d";

  const statusFilter =
    searchParams?.status ?? "active_recent";

  const requestedOrganizationSlug =
    searchParams?.org ?? DEFAULT_ORG_SLUG;

  const rangeStart = getRangeStart(range);

  const accessibleOrganizations =
    (await getAccessibleOrganizations(
      profile.id,
    )) as AccessibleOrganization[];

  if (accessibleOrganizations.length === 0) {
    redirect(
      "/dashboard/billing?product=signals&reason=subscribe",
    );
  }

  const selectedOrganization =
    accessibleOrganizations.find(
      (organization) =>
        organization.slug ===
        requestedOrganizationSlug,
    ) ??
    accessibleOrganizations.find(
      (organization) =>
        organization.slug === DEFAULT_ORG_SLUG,
    ) ??
    accessibleOrganizations[0];

  if (!selectedOrganization) {
    redirect(
      "/dashboard/billing?product=signals&reason=subscribe",
    );
  }

  if (
    selectedOrganization.slug !==
    requestedOrganizationSlug
  ) {
    redirect(
      buildSignalsUrl({
        org: selectedOrganization.slug,
        range,
        status: statusFilter,
      }),
    );
  }

  const canManageSelectedOrganization =
    canManageOrganizationSignals({
      profile,
      organization: selectedOrganization,
    });

  const supabase =
    await createSupabaseServerClient();

  /* -------------------------------------------------
     LOAD SIGNALS
  ------------------------------------------------- */
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
        execution_fills!left (
          side,
          contracts,
          price
        )
      )
    `,
    )
    .eq(
      "organization_id",
      selectedOrganization.id,
    )
    .order("created_at", {
      ascending: false,
    });

  if (statusFilter === "active_recent") {
    if (rangeStart) {
      query = query.or(
        `status.eq.Active,status.eq.Closed,created_at.gte.${rangeStart}`,
      );
    } else {
      query = query.in("status", [
        "Active",
        "Closed",
      ]);
    }
  } else {
    if (
      rangeStart &&
      statusFilter !== "active" &&
      statusFilter !== "watching"
    ) {
      query = query.gte(
        "created_at",
        rangeStart,
      );
    }

    const mappedStatus =
      STATUS_VALUE_MAP[statusFilter];

    if (mappedStatus) {
      query = query.eq(
        "status",
        mappedStatus,
      );
    }

    if (statusFilter === "watching") {
      query = query
        .eq("status", "Active")
        .eq("watching", true);
    }

    if (statusFilter === "watched") {
      query = query.or(
        "watching.eq.true,watched.eq.true",
      );
    }
  }

  const {
    data: signalData,
    error: signalsError,
  } = await query;

  if (signalsError) {
    console.error(
      "Failed to load signals",
      signalsError,
    );

    throw new Error("Failed to load signals");
  }

  const rows =
    (signalData ?? []) as SignalRow[];

  const signalIds = rows.map(
    (row) => row.id,
  );

  /* -------------------------------------------------
     LOAD OPTION LEGS
     Uses service-role client because the current
     signal_option_legs SELECT RLS policy returns an
     empty array through the authenticated client.

     The IDs are already restricted by the authorized
     organization-scoped signal query above.
  ------------------------------------------------- */
  const legsBySignalId =
    new Map<string, SignalOptionLegRow[]>();

  if (signalIds.length > 0) {
    const supabaseAdmin =
      createSupabaseAdminClient();

    const {
      data: optionLegData,
      error: optionLegsError,
    } = await supabaseAdmin
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
      `,
      )
      .in("signal_id", signalIds)
      .order("signal_id", {
        ascending: true,
      })
      .order("leg_order", {
        ascending: true,
      });

    if (optionLegsError) {
      console.error(
        "Failed to load signal option legs",
        {
          organizationId:
            selectedOrganization.id,
          signalIds,
          error: optionLegsError,
        },
      );

      throw new Error(
        "Failed to load signal option legs",
      );
    }

    const authorizedSignalIds =
      new Set(signalIds);

    for (const rawLeg of optionLegData ?? []) {
      const leg =
        rawLeg as SignalOptionLegRow;

      /*
       * Defense in depth. Even though the service-role
       * query is scoped by the authorized signal IDs,
       * do not attach any unexpected child row.
       */
      if (
        !authorizedSignalIds.has(
          leg.signal_id,
        )
      ) {
        continue;
      }

      const existingLegs =
        legsBySignalId.get(
          leg.signal_id,
        ) ?? [];

      existingLegs.push(leg);

      legsBySignalId.set(
        leg.signal_id,
        existingLegs,
      );
    }

    for (
      const [signalId, legs] of
      legsBySignalId.entries()
    ) {
      legs.sort(
        (firstLeg, secondLeg) =>
          firstLeg.leg_order -
          secondLeg.leg_order,
      );

      legsBySignalId.set(
        signalId,
        legs,
      );
    }

    console.log(
      "Signals page option-leg load",
      {
        organization_id:
          selectedOrganization.id,
        requested_signal_count:
          signalIds.length,
        returned_leg_count:
          optionLegData?.length ?? 0,
        signals_with_legs:
          legsBySignalId.size,
      },
    );
  }

  /* -------------------------------------------------
     BUILD SIGNAL TABLE ROWS
  ------------------------------------------------- */
  const signals: Signal[] = rows.map(
    (row) => {
      const rules = (
        row.signal_execution_rules ?? []
      ).filter(
        (rule) =>
          rule.is_active === true,
      );

      const stopLossRule = rules.find(
        (rule) =>
          rule.rule_type === "STOP_LOSS",
      );

      const takeProfitRule = rules.find(
        (rule) =>
          rule.rule_type ===
          "TAKE_PROFIT",
      );

      const optionLegs =
        legsBySignalId.get(row.id) ?? [];

      const tradeSummary =
        buildTradeSummary({
          symbol: row.asset,
          underlying: row.underlying,
          instrument_type:
            row.instrument_type,
          trade_style: row.trade_style,
          action: row.action,
          open_action: row.open_action,
          entry_price:
            row.entry_price ?? row.price,
          exit_price: row.exit_price,
          contracts: row.contracts,
          quantity: row.quantity,
          option_type: row.option_type,
          strike_price:
            row.strike_price,
          expiration_date:
            row.expiration_date,
          option_legs:
            optionLegs as TradeSummaryOptionLegInput[],
        });

      const execution =
        [...(row.signal_executions ?? [])]
          .sort(
            (
              firstExecution,
              secondExecution,
            ) => {
              const firstOpenedAt =
                firstExecution.opened_at
                  ? new Date(
                      firstExecution.opened_at,
                    ).getTime()
                  : 0;

              const secondOpenedAt =
                secondExecution.opened_at
                  ? new Date(
                      secondExecution.opened_at,
                    ).getTime()
                  : 0;

              return (
                secondOpenedAt -
                firstOpenedAt
              );
            },
          )[0] ??
        null;

      let executionContracts:
        | number
        | null = null;

      let remainingContracts:
        | number
        | null = null;

      let executionStatus:
        | "OPEN"
        | "PARTIAL"
        | "CLOSED"
        | null = null;

      let calculatedPnl:
        | number
        | null = null;

      let calculatedPnlPct:
        | number
        | null = null;

      const authoritativeExecutionPnl =
        execution?.pnl === null ||
        execution?.pnl === undefined
          ? null
          : toNumber(
              execution.pnl,
            );

      const authoritativeExecutionPnlPct =
        execution?.pnl_pct === null ||
        execution?.pnl_pct === undefined
          ? null
          : toNumber(
              execution.pnl_pct,
            );

      const strategyQuantity =
        getStrategyQuantity({
          optionLegs,
          fallbackQuantity:
            row.instrument_type ===
            "OPTION"
              ? row.contracts ??
                row.quantity
              : row.shares ??
                row.quantity,
        });

      if (execution) {
        const totalContracts =
          toNumber(
            execution.contracts,
          );

        const closeFills =
          execution.execution_fills?.filter(
            (fill) =>
              String(
                fill.side ?? "",
              ).toUpperCase() ===
              "CLOSE",
          ) ?? [];

        /*
         * Multi-leg strategies create one close fill
         * per leg. Summing all close fills would count
         * one strategy close multiple times.
         *
         * The detailed execution page remains the
         * authoritative source for exact remaining
         * multi-leg quantities.
         */
        if (optionLegs.length > 1) {
          const hasCloseFills =
            closeFills.length > 0;

          executionContracts =
            totalContracts;

          const persistedExecutionStatus =
            String(
              execution.status ?? "",
            )
              .trim()
              .toUpperCase();

          executionStatus =
            persistedExecutionStatus ===
              "CLOSED" ||
            persistedExecutionStatus ===
              "PARTIAL" ||
            persistedExecutionStatus ===
              "OPEN"
              ? persistedExecutionStatus
              : hasCloseFills
                ? row.status ===
                  "Closed"
                  ? "CLOSED"
                  : "PARTIAL"
                : "OPEN";

          remainingContracts =
            executionStatus === "CLOSED"
              ? 0
              : executionStatus ===
                  "PARTIAL"
                ? null
                : totalContracts;

          calculatedPnl =
            authoritativeExecutionPnl;

          calculatedPnlPct =
            authoritativeExecutionPnlPct ??
            row.return_pct ??
            null;
        } else {
          const closedContracts =
            closeFills.reduce(
              (sum, fill) =>
                sum +
                toNumber(
                  fill.contracts,
                ),
              0,
            );

          const remaining = Math.max(
            totalContracts -
              closedContracts,
            0,
          );

          executionContracts =
            totalContracts;

          remainingContracts =
            remaining;

          const persistedExecutionStatus =
            String(
              execution.status ?? "",
            )
              .trim()
              .toUpperCase();

          executionStatus =
            persistedExecutionStatus ===
              "CLOSED" ||
            persistedExecutionStatus ===
              "PARTIAL" ||
            persistedExecutionStatus ===
              "OPEN"
              ? persistedExecutionStatus
              : remaining > 0 &&
                  closedContracts > 0
                ? "PARTIAL"
                : remaining > 0
                  ? "OPEN"
                  : "CLOSED";

          const entryPrice =
            toNumber(
              row.entry_price ??
                row.price,
            );

          if (
            closeFills.length > 0 &&
            entryPrice > 0
          ) {
            const multiplier =
              row.instrument_type ===
              "OPTION"
                ? 100
                : 1;

            calculatedPnl =
              closeFills.reduce(
                (sum, fill) => {
                  const fillPrice =
                    toNumber(
                      fill.price,
                    );

                  const fillContracts =
                    toNumber(
                      fill.contracts,
                    );

                  return (
                    sum +
                    (fillPrice -
                      entryPrice) *
                      fillContracts *
                      multiplier
                  );
                },
                0,
              );

            const entryBasis =
              entryPrice *
              totalContracts *
              multiplier;

            calculatedPnlPct =
              entryBasis > 0
                ? (calculatedPnl /
                    entryBasis) *
                  100
                : null;
          }

          calculatedPnl =
            authoritativeExecutionPnl ??
            calculatedPnl;

          calculatedPnlPct =
            authoritativeExecutionPnlPct ??
            calculatedPnlPct ??
            row.return_pct ??
            null;
        }
      }

      const databaseStatus =
        normalizeSignalStatus(
          row.status,
        );

      const watching =
        row.watching ?? false;

      const displayStatus =
        getSignalDisplayStatus({
          status: databaseStatus,
          watching,
          watched:
            row.watched ?? false,
          closed_at: row.closed_at,
          outcome: row.outcome,
          return_pct:
            row.return_pct,
        });

      return {
        id: row.id,
        organization_id:
          row.organization_id,
        asset:
          row.asset ??
          row.underlying,
        underlying:
          row.underlying,
        instrument_type:
          row.instrument_type,
        action: row.action,
        open_action:
          row.open_action,
        option_type:
          row.option_type ??
          undefined,
        strike_price:
          tradeSummary.primaryStrikePrice ??
          row.strike_price ??
          undefined,
        expiration_date:
          tradeSummary.primaryExpirationDate ??
          row.expiration_date ??
          undefined,
        entry_price:
          tradeSummary.netEntry !==
          null
            ? Math.abs(
                tradeSummary.netEntry,
              )
            : execution?.entry_price !==
                null &&
              execution?.entry_price !==
                undefined
              ? Math.abs(
                  toNumber(
                    execution.entry_price,
                  ),
                )
              : row.entry_price ??
                row.price ??
                undefined,

        /*
         * The table receives the strategy label that
         * was derived from every saved option leg.
         *
         * For the newest QQQ signal this should resolve
         * to Bear Call Credit Spread instead of
         * Long Call.
         */
        trade_style:
          normalizeTradeStyle(
            tradeSummary.tradeStyleLabel,
          ) as any,

        option_legs: optionLegs,

        execution_status:
          executionStatus,

        contracts:
          executionContracts ??
          strategyQuantity ??
          null,

        remaining_contracts:
          remainingContracts,

        pnl: calculatedPnl,

        pnl_pct:
          calculatedPnlPct,

        stop_loss_pct:
          stopLossRule
            ? toNumber(
                stopLossRule.value_pct,
              )
            : null,

        take_profit_pct:
          takeProfitRule
            ? toNumber(
                takeProfitRule.value_pct,
              )
            : null,

        confidence:
          row.confidence ?? 0,

        status: displayStatus,

        watching,

        watched:
          row.watched ?? false,

        created_at:
          row.created_at ??
          undefined,

        closed_at:
          row.closed_at ??
          null,

        outcome:
          row.outcome ?? null,

        return_pct:
          authoritativeExecutionPnlPct ??
          row.return_pct ??
          null,

        exit_price:
          execution?.exit_price !== null &&
          execution?.exit_price !== undefined
            ? toNumber(
                execution.exit_price,
              )
            : row.exit_price ??
              null,
      };
    },
  );

  /* -------------------------------------------------
     SUMMARY METRICS
  ------------------------------------------------- */
  const totalSignals =
    signals.length;

  const activeSignals =
    signals.filter((signal) => {
      const displayStatus =
        getSignalDisplayStatus({
          status: signal.status,
          watching:
            signal.watching,
          watched:
            signal.watched,
          closed_at:
            signal.closed_at,
          outcome:
            signal.outcome,
          return_pct:
            signal.return_pct,
        });

      return (
        displayStatus === "Active" ||
        displayStatus === "Watching"
      );
    }).length;

  const watchedSignals =
    signals.filter((signal) => {
      const displayStatus =
        getSignalDisplayStatus({
          status: signal.status,
          watching:
            signal.watching,
          watched:
            signal.watched,
          closed_at:
            signal.closed_at,
          outcome:
            signal.outcome,
          return_pct:
            signal.return_pct,
        });

      return (
        displayStatus === "Watching" ||
        signal.watched ||
        signal.watching
      );
    }).length;

  const averageConfidence =
    totalSignals > 0
      ? Math.round(
          signals.reduce(
            (sum, signal) =>
              sum +
              signal.confidence,
            0,
          ) / totalSignals,
        )
      : 0;

  const deleteSuccess =
    searchParams?.deleted === "1";

  const deleteError =
    searchParams?.error;

  /* -------------------------------------------------
     RENDER
  ------------------------------------------------- */
  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-emerald-400">
            <Building2 className="h-4 w-4" />

            <span>
              {selectedOrganization.name}
            </span>
          </div>

          <h1 className="text-2xl font-semibold text-slate-100">
            Trading Signals
          </h1>

          <p className="text-sm text-slate-400">
            Options-first algorithmic and discretionary trade ideas.
          </p>
        </div>

        {(isMasterAdmin ||
          canManageSelectedOrganization) && (
          <Link
            href={`/dashboard/admin/signals/create?org=${selectedOrganization.slug}`}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <PlusCircle className="h-4 w-4" />

            Create Signal
          </Link>
        )}
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
              <p className="font-medium">
                Signal delete failed.
              </p>

              <p className="mt-1 text-xs text-red-200/80">
                Error code:{" "}
                {deleteError}
              </p>
            </div>
          </div>
        </div>
      )}

      {accessibleOrganizations.length >
        1 && (
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Signal Board Organization
          </p>

          <div className="flex flex-wrap gap-2">
            {accessibleOrganizations.map(
              (organization) => {
                const active =
                  organization.id ===
                  selectedOrganization.id;

                return (
                  <Link
                    key={
                      organization.id
                    }
                    href={buildSignalsUrl(
                      {
                        org: organization.slug,
                        range,
                        status:
                          statusFilter,
                      },
                    )}
                    className={
                      "rounded-full px-3 py-1.5 text-sm font-medium transition " +
                      (active
                        ? "bg-emerald-600 text-white"
                        : "border border-white/10 bg-slate-950 text-slate-300 hover:bg-slate-800")
                    }
                  >
                    {
                      organization.name
                    }
                  </Link>
                );
              },
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <SignalStat
          title="Visible Signals"
          value={String(
            totalSignals,
          )}
          icon={<Activity />}
        />

        <SignalStat
          title="Active + Watching"
          value={String(
            activeSignals,
          )}
          icon={<TrendingUp />}
        />

        <SignalStat
          title="Watching"
          value={String(
            watchedSignals,
          )}
          icon={<Target />}
        />

        <SignalStat
          title="Avg Confidence"
          value={`${averageConfidence}%`}
          icon={<BarChart3 />}
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-6 space-y-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Signal Board
              </h2>

              <p className="text-sm text-slate-400">
                Viewing signals from{" "}
                {
                  selectedOrganization.name
                }
                . Active and watching
                signals always show.
                Older triggered,
                closed, or expired
                signals are filtered by
                range.
              </p>
            </div>

            <p className="text-xs text-slate-500">
              Execution quantities and
              P/L are derived from fills
              and enforced centrally.
            </p>
          </div>

          <SignalFilters
            range={range}
            status={statusFilter}
            ranges={RANGE_OPTIONS.map(
              ({
                label,
                value,
              }) => ({
                label,
                value,
              }),
            )}
            statuses={
              STATUS_OPTIONS
            }
          />
        </div>

        <SignalsTable
          initialSignals={signals}
          isMasterAdmin={
            canManageSelectedOrganization
          }
          deleteSignalAction={
            deleteSignalAction
          }
          selectedOrganizationId={
            selectedOrganization.id
          }
          selectedOrganizationSlug={
            selectedOrganization.slug
          }
          range={range}
          status={statusFilter}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------
   SIGNAL STAT
------------------------------------------------- */
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

      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-2xl font-semibold text-slate-100">
        {value}
      </p>
    </div>
  );
}