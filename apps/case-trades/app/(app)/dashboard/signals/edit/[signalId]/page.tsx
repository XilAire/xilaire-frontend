import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Hash,
  Info,
  ShieldCheck,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { getProfile } from "@/lib/getProfile";
import {
  detectTradeStyle,
  type TradeStyleOptionLeg,
} from "@/lib/signals/detectTradeStyle";
import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

import { Button } from "@/components/ui/button";

type ExecutionStyle = "scalp" | "swing" | "leap";
type OptionLegAction = "BUY_TO_OPEN" | "SELL_TO_OPEN";
type OptionType = "CALL" | "PUT";

type SignalOptionLegRow = {
  id: string;
  signal_id: string;
  leg_order: number;
  action: OptionLegAction;
  option_type: OptionType;
  strike_price: number | string | null;
  expiration_date: string | null;
  contracts: number | string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
};

type NormalizedOptionLeg = {
  id?: string;
  leg_order: number;
  action: OptionLegAction;
  option_type: OptionType;
  strike_price: number;
  expiration_date: string;
  contracts: number;
  entry_price: number;
};

type StrategyEntryType = "DEBIT" | "CREDIT" | "EVEN";

type StrategyEntrySummary = {
  type: StrategyEntryType;
  absoluteNetEntry: number;
  signedNetEntry: number;
  totalPaid: number;
  totalReceived: number;
};

interface EditSignalPageProps {
  params: {
    signalId: string;
  };
  searchParams?: Record<string, string>;
}

function createSupabaseAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing CASE Trades Supabase server environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function toNumber(
  value: FormDataEntryValue | number | string | null | undefined,
  fallback = 0,
) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStrategyType(value?: string | null) {
  return String(value ?? "").trim().toUpperCase();
}

function formatStyleLabel(value?: string | null) {
  if (!value) return "—";

  const normalized = String(value).trim();

  if (!normalized) return "—";
  if (normalized.toLowerCase() === "leap") return "LEAP";

  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function calculateStrategyEntry(
  optionLegs: NormalizedOptionLeg[],
): StrategyEntrySummary {
  let totalPaid = 0;
  let totalReceived = 0;

  for (const leg of optionLegs) {
    const premium = leg.contracts * leg.entry_price;

    if (leg.action === "BUY_TO_OPEN") {
      totalPaid += premium;
    } else {
      totalReceived += premium;
    }
  }

  const signedNetEntry = totalPaid - totalReceived;

  return {
    type:
      signedNetEntry > 0
        ? "DEBIT"
        : signedNetEntry < 0
          ? "CREDIT"
          : "EVEN",
    absoluteNetEntry: Number(Math.abs(signedNetEntry).toFixed(4)),
    signedNetEntry: Number(signedNetEntry.toFixed(4)),
    totalPaid: Number(totalPaid.toFixed(4)),
    totalReceived: Number(totalReceived.toFixed(4)),
  };
}

function mapLegsForDetection(
  optionLegs: NormalizedOptionLeg[],
): TradeStyleOptionLeg[] {
  return optionLegs.map((leg) => ({
    action: leg.action,
    optionType: leg.option_type,
    strikePrice: leg.strike_price,
    expirationDate: leg.expiration_date,
    contracts: leg.contracts,
    entryPrice: leg.entry_price,
  }));
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString();
}

function withOrgQuery(href: string, organizationSlug?: string | null) {
  if (!organizationSlug) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}org=${encodeURIComponent(organizationSlug)}`;
}

function isMasterAdminProfile(profile: any) {
  return (
    profile.current_organization?.is_master_admin === true ||
    profile.roles?.[0]?.name === "master_admin" ||
    profile.roles?.[0]?.rank === 4 ||
    String(profile.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

export default async function EditSignalPage({
  params,
  searchParams,
}: EditSignalPageProps) {
  const { signalId } = params;
  const errors = searchParams ?? {};
  const organizationSlugParam = searchParams?.org;

  /* -------------------------------------------------
     🔒 AUTH — MASTER ADMIN ONLY
  ------------------------------------------------- */
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank !== 4) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfile({
    organizationSlug: organizationSlugParam,
  });

  const currentOrganization = profile.current_organization;

  if (!currentOrganization) {
    redirect("/dashboard/billing?reason=no_organization");
  }

  if (!isMasterAdminProfile(profile)) {
    throw new Error("Unauthorized");
  }

  const organizationSlug = currentOrganization.organization_slug;
  const organizationId = currentOrganization.organization_id;

  const supabase = await createSupabaseServerClient();

  /* -------------------------------------------------
     📥 LOAD SIGNAL — ORGANIZATION SCOPED
  ------------------------------------------------- */
  const { data: signal, error } = await supabase
    .from("signals")
    .select("*")
    .eq("id", signalId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("Edit signal load error", error);
    throw new Error("Failed to load signal");
  }

  if (!signal) {
    notFound();
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: optionLegRows, error: optionLegsError } =
    await supabaseAdmin
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
      .eq("signal_id", signalId)
      .order("leg_order", { ascending: true });

  if (optionLegsError) {
    console.error("Edit signal option-leg load error", optionLegsError);
    throw new Error("Failed to load signal option legs");
  }

  const savedOptionLegs = (optionLegRows ?? []) as SignalOptionLegRow[];

  const editableOptionLegs: SignalOptionLegRow[] =
    savedOptionLegs.length > 0
      ? savedOptionLegs
      : [
          {
            id: "",
            signal_id: signalId,
            leg_order: 1,
            action:
              signal.action === "SELL"
                ? "SELL_TO_OPEN"
                : "BUY_TO_OPEN",
            option_type: signal.option_type ?? "CALL",
            strike_price: signal.strike_price,
            expiration_date: signal.expiration_date,
            contracts: signal.contracts ?? signal.quantity ?? 1,
            entry_price: signal.entry_price ?? signal.price,
            exit_price: signal.exit_price ?? null,
          },
        ];

  const normalizedLoadedLegs: NormalizedOptionLeg[] =
    editableOptionLegs.map((leg, index) => ({
      id: leg.id || undefined,
      leg_order: index + 1,
      action: leg.action,
      option_type: leg.option_type,
      strike_price: toNumber(leg.strike_price),
      expiration_date: leg.expiration_date ?? "",
      contracts: Math.max(toNumber(leg.contracts, 1), 1),
      entry_price: toNumber(leg.entry_price),
    }));

  const loadedStrategySummary =
    calculateStrategyEntry(normalizedLoadedLegs);

  const loadedDetection = detectTradeStyle({
    instrumentType: "OPTION",
    legs: mapLegsForDetection(normalizedLoadedLegs),
  });

  /*
   * Centralized strategy summary.
   *
   * The existing local calculation remains available for compatibility,
   * while buildTradeSummary is now the authoritative source used by the
   * signal detail page, Discord alerts, and this edit page.
   */
  const loadedTradeSummary =
    buildTradeSummary({
      symbol:
        signal.asset,

      underlying:
        signal.underlying,

      instrument_type:
        "OPTION",

      trade_style:
        signal.strategy_type ??
        loadedDetection.style,

      execution_style:
        signal.trade_style,

      action:
        signal.action,

      open_action:
        signal.open_action,

      entry_price:
        signal.entry_price,

      exit_price:
        signal.exit_price,

      contracts:
        signal.contracts,

      quantity:
        signal.quantity,

      option_type:
        signal.option_type,

      strike_price:
        signal.strike_price,

      expiration_date:
        signal.expiration_date,

      option_legs:
        normalizedLoadedLegs as TradeSummaryOptionLegInput[],
    });

  const currentStrategyType =
  normalizeStrategyType(
    signal.strategy_type,
  ) ||
  loadedTradeSummary.tradeStyle ||
  loadedDetection.style;

const loadedEntryAmount =
  loadedTradeSummary.netEntryAmount ??
  loadedStrategySummary.absoluteNetEntry;

const loadedEntryType =
  loadedTradeSummary.debitCredit ===
  "UNKNOWN"
    ? loadedStrategySummary.type
    : loadedTradeSummary.debitCredit;

const loadedPremiumPaid =
  loadedTradeSummary.totalPaid;

const loadedPremiumReceived =
  loadedTradeSummary.totalReceived;

  /* -------------------------------------------------
     🧾 SERVER ACTION — UPDATE SIGNAL
  ------------------------------------------------- */
  async function updateSignal(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const role = await resolveCurrentUserRole();

    if (!role || role.role_rank !== 4) {
      throw new Error("Unauthorized");
    }

    const formOrganizationId = String(
      formData.get("organization_id") || ""
    ).trim();

    const formOrganizationSlug = String(formData.get("org") || "").trim();

    if (!formOrganizationId) {
      throw new Error("Missing organization_id.");
    }

    const asset = String(formData.get("asset") || "").trim().toUpperCase();
    const underlying = String(formData.get("underlying") || "")
      .trim()
      .toUpperCase();
    const action = String(formData.get("action") || "");

    const executionStyle = String(
      formData.get("trade_style") || "",
    ) as ExecutionStyle;

    const optionLegCount = Math.max(
      toNumber(formData.get("option_leg_count")),
      0,
    );

    const optionLegs: NormalizedOptionLeg[] = Array.from(
      { length: optionLegCount },
      (_, index) => {
        const legNumber = index + 1;

        return {
          id:
            String(
              formData.get(`option_leg_${legNumber}_id`) ?? "",
            ).trim() || undefined,
          leg_order: legNumber,
          action: String(
            formData.get(`option_leg_${legNumber}_action`) ?? "",
          ) as OptionLegAction,
          option_type: String(
            formData.get(`option_leg_${legNumber}_option_type`) ?? "",
          ) as OptionType,
          strike_price: toNumber(
            formData.get(`option_leg_${legNumber}_strike_price`),
          ),
          expiration_date: String(
            formData.get(`option_leg_${legNumber}_expiration_date`) ?? "",
          ),
          contracts: toNumber(
            formData.get(`option_leg_${legNumber}_contracts`),
          ),
          entry_price: toNumber(
            formData.get(`option_leg_${legNumber}_entry_price`),
          ),
        };
      },
    );

    const strategySummary = calculateStrategyEntry(optionLegs);

    const detectedStrategy = detectTradeStyle({
      instrumentType: "OPTION",
      legs: mapLegsForDetection(optionLegs),
    });

    const strategyType = normalizeStrategyType(
      detectedStrategy.style,
    );

    const primaryLeg = optionLegs[0];

    const openAction: OptionLegAction =
      primaryLeg?.action ??
      (
        action === "SELL"
          ? "SELL_TO_OPEN"
          : "BUY_TO_OPEN"
      );

    const tradeSummary =
      buildTradeSummary({
        symbol:
          asset,

        underlying,

        instrument_type:
          "OPTION",

        trade_style:
          strategyType,

        execution_style:
          executionStyle,

        action,

        open_action:
          openAction,

        option_type:
          primaryLeg?.option_type,

        strike_price:
          primaryLeg?.strike_price,

        expiration_date:
          primaryLeg?.expiration_date,

        option_legs:
          optionLegs as TradeSummaryOptionLegInput[],
      });
    const optionType = primaryLeg?.option_type ?? "CALL";
    const entryPrice =
      tradeSummary.netEntryAmount ??
      strategySummary.absoluteNetEntry;
    const strikePrice = primaryLeg?.strike_price ?? 0;
    const expirationDate = primaryLeg?.expiration_date ?? "";
    const underlyingEntryPriceRaw = formData.get("underlying_entry_price");
    const underlyingEntryPrice =
      underlyingEntryPriceRaw === null || String(underlyingEntryPriceRaw) === ""
        ? null
        : Number(underlyingEntryPriceRaw);
    const stopLossPctRaw = formData.get("stop_loss_pct");
    const takeProfitPctRaw = formData.get("take_profit_pct");
    const stopLossPct =
      stopLossPctRaw === null || String(stopLossPctRaw) === ""
        ? null
        : Number(stopLossPctRaw);
    const takeProfitPct =
      takeProfitPctRaw === null || String(takeProfitPctRaw) === ""
        ? null
        : Number(takeProfitPctRaw);
    const confidence = Number(formData.get("confidence"));
    const status = String(formData.get("status") || "");
    const outcome = String(formData.get("outcome") || "");
    const rationale = String(formData.get("rationale") || "").trim();

    const formErrors: Record<string, string> = {};

    if (!asset) {
      formErrors.asset = "Ticker is required.";
    }

    if (!underlying) {
      formErrors.underlying = "Underlying is required.";
    }

    if (!["BUY", "SELL", "HOLD"].includes(action)) {
      formErrors.action = "Action must be BUY, SELL, or HOLD.";
    }

    if (!["scalp", "swing", "leap"].includes(executionStyle)) {
      formErrors.trade_style =
        "Execution style must be scalp, swing, or leap.";
    }

    if (optionLegs.length === 0) {
      formErrors.option_legs =
        "At least one option leg is required.";
    }

    optionLegs.forEach((leg, index) => {
      const prefix = `Leg ${index + 1}`;

      if (!["BUY_TO_OPEN", "SELL_TO_OPEN"].includes(leg.action)) {
        formErrors.option_legs = `${prefix} has an invalid action.`;
      }

      if (!["CALL", "PUT"].includes(leg.option_type)) {
        formErrors.option_legs = `${prefix} has an invalid option type.`;
      }

      if (!Number.isFinite(leg.strike_price) || leg.strike_price <= 0) {
        formErrors.option_legs =
          `${prefix} strike must be greater than 0.`;
      }

      if (!leg.expiration_date) {
        formErrors.option_legs = `${prefix} expiration is required.`;
      }

      if (!Number.isInteger(leg.contracts) || leg.contracts <= 0) {
        formErrors.option_legs =
          `${prefix} contracts must be a positive whole number.`;
      }

      if (!Number.isFinite(leg.entry_price) || leg.entry_price < 0) {
        formErrors.option_legs =
          `${prefix} premium must be zero or greater.`;
      }
    });

    if (
      strategySummary.type === "EVEN" ||
      !Number.isFinite(entryPrice) ||
      entryPrice <= 0
    ) {
      formErrors.entry_price =
        "The option legs must produce a positive net debit or credit.";
    }

    if (!strategyType) {
      formErrors.strategy_type =
        "Option strategy could not be detected.";
    }

    if (
      underlyingEntryPrice !== null &&
      (Number.isNaN(underlyingEntryPrice) || underlyingEntryPrice <= 0)
    ) {
      formErrors.underlying_entry_price =
        "Underlying entry price must be greater than 0.";
    }

    if (
      stopLossPct !== null &&
      (Number.isNaN(stopLossPct) || stopLossPct >= 0)
    ) {
      formErrors.stop_loss_pct = "Stop loss should be a negative percentage.";
    }

    if (
      takeProfitPct !== null &&
      (Number.isNaN(takeProfitPct) || takeProfitPct <= 0)
    ) {
      formErrors.take_profit_pct =
        "Take profit should be a positive percentage.";
    }

    if (Number.isNaN(confidence) || confidence < 0 || confidence > 100) {
      formErrors.confidence = "Confidence must be between 0 and 100.";
    }

    if (!["Active", "Triggered", "Closed", "Expired"].includes(status)) {
      formErrors.status = "Invalid status value.";
    }

    if (status === "Closed") {
      if (!["WIN", "LOSS", "BREAKEVEN"].includes(outcome)) {
        formErrors.outcome = "Outcome is required when closing a signal.";
      }
    }

    if (Object.keys(formErrors).length > 0) {
      const params = new URLSearchParams(formErrors);

      if (formOrganizationSlug) {
        params.set("org", formOrganizationSlug);
      }

      redirect(`/dashboard/signals/edit/${signalId}?${params.toString()}`);
    }

    const { data: currentSignal, error: currentSignalError } = await supabase
      .from("signals")
      .select("id, organization_id, closed_at, strategy_type, trade_style")
      .eq("id", signalId)
      .eq("organization_id", formOrganizationId)
      .maybeSingle();

    if (currentSignalError || !currentSignal) {
      console.error("Edit signal organization guard failed", {
        signalId,
        formOrganizationId,
        currentSignalError,
      });

      throw new Error("Signal not found for selected organization.");
    }

    const nextClosedAt =
      status === "Closed"
        ? currentSignal.closed_at ?? new Date().toISOString()
        : null;

    const { error } = await supabase
      .from("signals")
      .update({
        asset,
        underlying,
        action,
        open_action: openAction,
        instrument_type: "OPTION",
        option_type: optionType,
        trade_style: executionStyle,
        strategy_type: strategyType,
        price: entryPrice,
        entry_price: entryPrice,
        underlying_entry_price: underlyingEntryPrice,
        strike_price: strikePrice,
        expiration_date: expirationDate,
        contracts:
          tradeSummary.strategyContracts,
        quantity:
          tradeSummary.strategyContracts,
        stop_loss_pct: stopLossPct,
        take_profit_pct: takeProfitPct,
        confidence,
        status,
        outcome: status === "Closed" ? outcome : null,
        closed_at: nextClosedAt,
        rationale: rationale || null,
        updated_by: role.user_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", signalId)
      .eq("organization_id", formOrganizationId);

    if (error) {
      console.error("Edit signal save error", error);

      const params = new URLSearchParams({
        _form: "Save failed.",
      });

      if (formOrganizationSlug) {
        params.set("org", formOrganizationSlug);
      }

      redirect(`/dashboard/signals/edit/${signalId}?${params.toString()}`);
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { error: optionLegDeleteError } = await supabaseAdmin
      .from("signal_option_legs")
      .delete()
      .eq("signal_id", signalId);

    if (optionLegDeleteError) {
      console.error(
        "Edit signal option-leg cleanup failed",
        optionLegDeleteError,
      );
      throw new Error(
        "Signal was updated, but existing option legs could not be replaced.",
      );
    }

    const { error: optionLegInsertError } = await supabaseAdmin
      .from("signal_option_legs")
      .insert(
        optionLegs.map((leg) => ({
          signal_id: signalId,
          leg_order: leg.leg_order,
          action: leg.action,
          option_type: leg.option_type,
          strike_price: leg.strike_price,
          expiration_date: leg.expiration_date,
          contracts: leg.contracts,
          entry_price: leg.entry_price,
          updated_at: new Date().toISOString(),
        })),
      );

    if (optionLegInsertError) {
      console.error(
        "Edit signal option-leg insert failed",
        optionLegInsertError,
      );
      throw new Error(
        "Signal was updated, but option legs could not be saved.",
      );
    }

    redirect(
      withOrgQuery(
        `/dashboard/signals/${signalId}?saved=1`,
        formOrganizationSlug,
      ),
    );
  }

  /* -------------------------------------------------
     🧱 UI
  ------------------------------------------------- */
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-300">
            {currentOrganization.organization_name} · Platform Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">
            Edit Signal
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Update execution style, detected strategy, every option leg,
            confidence, risk targets, and lifecycle status. Master-admin only.
            Changes are audited.
          </p>
        </div>

        <Link
          href={withOrgQuery("/dashboard/admin/signals", organizationSlug)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Signals
        </Link>
      </div>

      {errors._form && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errors._form}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <form
          action={updateSignal}
          noValidate
          className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80"
        >
          <input type="hidden" name="organization_id" value={organizationId} />
          <input type="hidden" name="org" value={organizationSlug} />
          <input
            type="hidden"
            name="option_leg_count"
            value={editableOptionLegs.length}
          />
          <input
            type="hidden"
            name="strategy_type"
            value={currentStrategyType}
          />

          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  let isDirty = false;
                  const form = document.querySelector("form");
                  const submitBtn = document.querySelector("button[type='submit']");

                  if (!form || !submitBtn) return;

                  form.addEventListener("change", () => {
                    isDirty = true;
                  });

                  form.addEventListener("submit", () => {
                    isDirty = false;
                    submitBtn.disabled = true;
                    submitBtn.innerText = "Saving…";
                    document.body.style.cursor = "wait";
                  });

                  window.addEventListener("beforeunload", function (e) {
                    if (!isDirty) return;
                    e.preventDefault();
                    e.returnValue = "";
                  });
                })();
              `,
            }}
          />

          <div className="border-b border-white/10 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Signal Details
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Primary trade setup information shown to subscribed traders.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">
            <Field
              label="Ticker"
              name="asset"
              required
              defaultValue={signal.asset ?? ""}
              error={errors.asset}
              hint="Ticker symbol shown in the signal board."
            />

            <Field
              label="Underlying"
              name="underlying"
              required
              defaultValue={signal.underlying ?? signal.asset ?? ""}
              error={errors.underlying}
              hint="Underlying asset for the option contract."
            />

            <SelectField
              label="Action"
              name="action"
              required
              defaultValue={signal.action ?? "BUY"}
              error={errors.action}
              hint="Trade direction."
              options={[
                { label: "Buy", value: "BUY" },
                { label: "Sell", value: "SELL" },
                { label: "Hold", value: "HOLD" },
              ]}
            />

            <SelectField
              label="Execution Style"
              name="trade_style"
              required
              defaultValue={signal.trade_style ?? "swing"}
              error={errors.trade_style}
              hint="Controls the execution-rule timeframe. This is separate from the option strategy."
              options={[
                { label: "Scalp", value: "scalp" },
                { label: "Swing", value: "swing" },
                { label: "Leap", value: "leap" },
              ]}
            />

            <div className="md:col-span-2 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-300">
                Detected Strategy
              </p>
              <p className="mt-2 text-lg font-bold text-slate-100">
                {formatStyleLabel(currentStrategyType)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                The server recalculates this value from all option legs when you save.
              </p>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Option Legs
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Update every saved leg. Strategy Entry / Open Price is recalculated from premiums paid and received.
                </p>
              </div>

              {errors.option_legs && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {errors.option_legs}
                </div>
              )}

              <div className="space-y-4">
                {editableOptionLegs.map((leg, index) => {
                  const legNumber = index + 1;

                  return (
                    <div
                      key={leg.id || `leg-${legNumber}`}
                      className="rounded-xl border border-white/10 bg-slate-950/60 p-4"
                    >
                      <input
                        type="hidden"
                        name={`option_leg_${legNumber}_id`}
                        value={leg.id ?? ""}
                      />

                      <div className="mb-4">
                        <p className="text-sm font-semibold text-slate-100">
                          Leg {legNumber}
                        </p>
                        <p className="text-xs text-slate-500">
                          {leg.action === "BUY_TO_OPEN"
                            ? "Premium paid"
                            : "Premium received"}
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <SelectField
                          label="Leg Action"
                          name={`option_leg_${legNumber}_action`}
                          required
                          defaultValue={leg.action}
                          hint="Buy to Open pays premium. Sell to Open receives premium."
                          options={[
                            {
                              label: "Buy to Open (Debit)",
                              value: "BUY_TO_OPEN",
                            },
                            {
                              label: "Sell to Open (Credit)",
                              value: "SELL_TO_OPEN",
                            },
                          ]}
                        />

                        <SelectField
                          label="Option Type"
                          name={`option_leg_${legNumber}_option_type`}
                          required
                          defaultValue={leg.option_type}
                          options={[
                            { label: "Call", value: "CALL" },
                            { label: "Put", value: "PUT" },
                          ]}
                        />

                        <Field
                          label="Strike"
                          name={`option_leg_${legNumber}_strike_price`}
                          type="number"
                          step="0.01"
                          required
                          defaultValue={leg.strike_price}
                        />

                        <Field
                          label="Expiration"
                          name={`option_leg_${legNumber}_expiration_date`}
                          type="date"
                          required
                          defaultValue={leg.expiration_date}
                        />

                        <Field
                          label="Contracts"
                          name={`option_leg_${legNumber}_contracts`}
                          type="number"
                          min={1}
                          required
                          defaultValue={leg.contracts ?? 1}
                        />

                        <Field
                          label={
                            leg.action === "BUY_TO_OPEN"
                              ? "Premium Paid"
                              : "Premium Received"
                          }
                          name={`option_leg_${legNumber}_entry_price`}
                          type="number"
                          step="0.01"
                          min={0}
                          required
                          defaultValue={leg.entry_price}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                    Current Strategy Entry
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    This preview reflects the currently saved leg values.
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xl font-bold text-slate-100">
                    ${loadedEntryAmount.toFixed(2)}{" "}
                    {loadedEntryType}
                  </p>
                  <p className="text-xs text-slate-400">
                    Paid: ${loadedPremiumPaid.toFixed(2)} ·
                    Received: ${loadedPremiumReceived.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <Field
              label="Underlying Entry Price"
              name="underlying_entry_price"
              type="number"
              step="0.01"
              defaultValue={signal.underlying_entry_price ?? ""}
              error={errors.underlying_entry_price}
              hint="Optional underlying price at signal entry."
            />

            <Field
              label="Confidence (%)"
              name="confidence"
              type="number"
              min={0}
              max={100}
              required
              defaultValue={signal.confidence ?? ""}
              error={errors.confidence}
              hint="Analyst confidence score."
            />

            <Field
              label="Stop Loss (%)"
              name="stop_loss_pct"
              type="number"
              step="0.01"
              defaultValue={signal.stop_loss_pct ?? ""}
              error={errors.stop_loss_pct}
              hint="Use a negative value, e.g. -30."
            />

            <Field
              label="Take Profit (%)"
              name="take_profit_pct"
              type="number"
              step="0.01"
              defaultValue={signal.take_profit_pct ?? ""}
              error={errors.take_profit_pct}
              hint="Use a positive value, e.g. 40."
            />

            <SelectField
              label="Status"
              name="status"
              required
              defaultValue={signal.status}
              error={errors.status}
              hint="Controls lifecycle state."
              options={[
                { label: "Active", value: "Active" },
                { label: "Triggered", value: "Triggered" },
                { label: "Closed", value: "Closed" },
                { label: "Expired", value: "Expired" },
              ]}
            />

            <SelectField
              label="Outcome"
              name="outcome"
              defaultValue={signal.outcome ?? ""}
              error={errors.outcome}
              hint="Required when closing a signal."
              options={[
                { label: "—", value: "" },
                { label: "Win", value: "WIN" },
                { label: "Loss", value: "LOSS" },
                { label: "Breakeven", value: "BREAKEVEN" },
              ]}
            />

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-200">
                Rationale
              </label>

              <textarea
                name="rationale"
                defaultValue={signal.rationale ?? ""}
                rows={5}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
                placeholder="Optional trade thesis, chart context, catalyst, or notes."
              />

              <p className="mt-2 text-xs text-slate-500">
                Optional note shown internally or to subscribers depending on
                your signal display rules.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 p-6 sm:flex-row sm:items-center sm:justify-end">
            <Link
              href={withOrgQuery("/dashboard/admin/signals", organizationSlug)}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-sky-500/10 p-3 text-sky-300">
                <Info className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  Current Signal
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {signal.action ?? "BUY"} {signal.underlying ?? signal.asset}{" "}
                  {signal.strike_price ? `${signal.strike_price}` : ""}{" "}
                  {signal.option_type ?? ""}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <Metric
                icon={<Hash />}
                label="Strategy"
                value={formatStyleLabel(currentStrategyType)}
              />
              <Metric
                icon={<Activity />}
                label="Execution Style"
                value={formatStyleLabel(signal.trade_style)}
              />
              <Metric
                icon={<CircleDollarSign />}
                label="Net Entry"
                value={`$${loadedEntryAmount.toFixed(2)} ${loadedEntryType}`}
              />
              <Metric
                icon={<CalendarDays />}
                label="Option Legs"
                value={editableOptionLegs.length}
              />
              <Metric
                icon={<Gauge />}
                label="Confidence"
                value={
                  signal.confidence !== null && signal.confidence !== undefined
                    ? `${signal.confidence}%`
                    : "—"
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  Audit Information
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  System tracking for this signal record.
                </p>
              </div>
            </div>

            <dl className="mt-6 space-y-4 text-sm">
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
                label="Strategy Type"
                value={formatStyleLabel(currentStrategyType)}
              />
              <AuditRow
                label="Execution Style"
                value={formatStyleLabel(signal.trade_style)}
              />
              <AuditRow label="Status" value={signal.status} />
              <AuditRow label="Outcome" value={signal.outcome ?? "—"} />
              <AuditRow
                label="Created At"
                value={formatDateTime(signal.created_at)}
              />
              <AuditRow
                label="Last Updated At"
                value={formatDateTime(signal.updated_at)}
              />
              <AuditRow
                label="Closed At"
                value={formatDateTime(signal.closed_at)}
              />
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  error,
  hint,
  step,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number | null;
  error?: string;
  hint?: string;
  step?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-200">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>

      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        step={step}
        min={min}
        max={max}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
      />

      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  name,
  required = false,
  defaultValue,
  error,
  hint,
  options,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string | number | null;
  error?: string;
  hint?: string;
  options: {
    label: string;
    value: string;
  }[];
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-200">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>

      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/50"
      >
        {options.map((option) => (
          <option
            key={option.value || option.label}
            value={option.value}
            className="bg-slate-950 text-slate-100"
          >
            {option.label}
          </option>
        ))}
      </select>

      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-slate-950 p-4">
      <div className="shrink-0 text-emerald-400 [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">
          {label}
        </p>
        <p className="break-words font-semibold text-slate-100">
          {value}
        </p>
      </div>
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