"use server";

import { createClient } from "@supabase/supabase-js";

import applyExecutionTemplate from "@/lib/applyExecutionRuleTemplate";
import { EXECUTION_RULE_TEMPLATES } from "@/lib/executionRuleTemplates";
import { sendSignalToDiscord } from "@/lib/discord/sendSignalToDiscord";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

const DEFAULT_ORG_SLUG = "case-trades";

export type SignalStatus = "Active" | "Triggered" | "Closed" | "Expired";
export type SignalOutcome = "WIN" | "LOSS" | "BREAKEVEN" | null;

export type OpenAction = "BUY_TO_OPEN" | "SELL_TO_OPEN";

export type CreateSignalInput = {
  organization_id?: string;
  organization_slug?: string;

  asset: string;
  underlying: string;

  action: "BUY" | "SELL";
  open_action?: OpenAction;

  instrument_type: "OPTION" | "STOCK";

  status?: SignalStatus;
  watching?: boolean;
  watched?: boolean;

  quantity?: number;
  contracts?: number;
  shares?: number;

  entry_price: number;
  open_price?: number;
  underlying_entry_price: number;
  opened_at?: string | null;

  outcome?: SignalOutcome;
  return_pct?: number | null;
  exit_price?: number | null;
  closed_at?: string | null;

  option_type?: "CALL" | "PUT";
  strike_price?: number;
  expiration_date?: string;

  confidence: number;
  trade_style: "scalp" | "swing" | "leap";
};

type CreateSignalResult =
  | {
      success: true;
      id: string;
      organization_id: string;
      organization_slug: string;
    }
  | {
      success: false;
      errors: Record<string, string>;
    };

function createSupabaseAdmin() {
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

function isMasterAdmin(role: Awaited<ReturnType<typeof resolveCurrentUserRole>>) {
  return (
    role?.role_name === "master_admin" ||
    role?.role_rank === 4 ||
    String(role?.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function normalizeTicker(value: string | null | undefined) {
  return normalizeText(value).toUpperCase();
}

function normalizeNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace("%", "").trim());

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeStatus(value: SignalStatus | undefined): SignalStatus {
  if (
    value === "Active" ||
    value === "Triggered" ||
    value === "Closed" ||
    value === "Expired"
  ) {
    return value;
  }

  return "Active";
}

function normalizeOutcome(value: SignalOutcome | undefined): SignalOutcome {
  if (value === "WIN" || value === "LOSS" || value === "BREAKEVEN") {
    return value;
  }

  return null;
}

function calculateReturnPct({
  entryPrice,
  exitPrice,
}: {
  entryPrice: number | null;
  exitPrice: number | null;
}) {
  if (entryPrice === null || exitPrice === null) return null;
  if (entryPrice === 0) return null;

  return Number((((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2));
}

function inferOutcomeFromReturnPct(returnPct: number | null): SignalOutcome {
  if (returnPct === null) return null;
  if (returnPct > 0) return "WIN";
  if (returnPct < 0) return "LOSS";
  return "BREAKEVEN";
}

function isOpenLifecycleStatus(status: SignalStatus) {
  return status === "Active" || status === "Triggered";
}

function isClosedLifecycleStatus(status: SignalStatus) {
  return status === "Closed" || status === "Expired";
}

function getBrokerAction(input: CreateSignalInput) {
  if (input.open_action === "SELL_TO_OPEN") {
    return "SELL";
  }

  if (input.open_action === "BUY_TO_OPEN") {
    return "BUY";
  }

  return input.action;
}

function getQuantity(input: CreateSignalInput) {
  const quantity = normalizeNumber(input.quantity);
  const contracts = normalizeNumber(input.contracts);
  const shares = normalizeNumber(input.shares);

  if (input.instrument_type === "OPTION") {
    return contracts ?? quantity;
  }

  return shares ?? quantity;
}

async function resolveOrganization({
  organizationId,
  organizationSlug,
}: {
  organizationId?: string;
  organizationSlug?: string;
}) {
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("organizations")
    .select("id, slug, name, active")
    .eq("active", true);

  if (organizationId) {
    query = query.eq("id", organizationId);
  } else {
    query = query.eq("slug", organizationSlug || DEFAULT_ORG_SLUG);
  }

  const { data: organization, error } = await query.maybeSingle();

  if (error || !organization) {
    console.error("Create signal organization lookup failed", {
      organizationId,
      organizationSlug,
      error,
    });

    return null;
  }

  return organization;
}

export async function createSignal(
  input: CreateSignalInput
): Promise<CreateSignalResult> {
  const errors: Record<string, string> = {};
  const now = new Date().toISOString();

  const role = await resolveCurrentUserRole();

  if (!role || !isMasterAdmin(role)) {
    return {
      success: false,
      errors: {
        _form: "Unauthorized.",
      },
    };
  }

  const organization = await resolveOrganization({
    organizationId: input.organization_id,
    organizationSlug: input.organization_slug,
  });

  if (!organization) {
    errors.organization = "Organization is required.";
  }

  const asset = normalizeTicker(input.asset);
  const underlying = asset;

  const status = normalizeStatus(input.status);
  const isOpeningSignal = isOpenLifecycleStatus(status);
  const isClosedSignal = isClosedLifecycleStatus(status);
  const watching = Boolean(input.watching);
  const watched = Boolean(input.watched) || watching;

  const action = getBrokerAction(input);
  const openAction: OpenAction =
    input.open_action ?? (action === "SELL" ? "SELL_TO_OPEN" : "BUY_TO_OPEN");

  const entryPrice = normalizeNumber(input.entry_price);
  const openPrice = normalizeNumber(input.open_price) ?? entryPrice;
  const underlyingEntryPrice =
    normalizeNumber(input.underlying_entry_price) ?? entryPrice;

  const quantity = getQuantity(input);
  const contracts = input.instrument_type === "OPTION" ? quantity : null;
  const shares = input.instrument_type === "STOCK" ? quantity : null;

  const exitPrice = normalizeNumber(input.exit_price);
  const providedReturnPct = normalizeNumber(input.return_pct);

  const calculatedReturnPct =
    providedReturnPct ??
    calculateReturnPct({
      entryPrice,
      exitPrice,
    });

  const providedOutcome = normalizeOutcome(input.outcome);
  const inferredOutcome = inferOutcomeFromReturnPct(calculatedReturnPct);

  const finalReturnPct = isClosedSignal ? calculatedReturnPct : null;
  const finalOutcome = isClosedSignal
    ? providedOutcome ?? inferredOutcome
    : null;

  const openedAt = isOpeningSignal ? input.opened_at ?? now : null;
  const closedAt = isClosedSignal ? input.closed_at ?? now : null;

  if (!asset) {
    errors.asset = "Ticker is required.";
  }

  if (!input.instrument_type) {
    errors.instrument_type = "Instrument type is required.";
  }

  if (!input.action) {
    errors.action = "Action is required.";
  }

  if (!entryPrice || entryPrice <= 0) {
    errors.entry_price = "Entry/open price must be greater than 0.";
  }

  if (!underlyingEntryPrice || underlyingEntryPrice <= 0) {
    errors.underlying_entry_price = "Underlying market price is required.";
  }

  if (!input.confidence || input.confidence < 1 || input.confidence > 100) {
    errors.confidence = "Confidence must be between 1 and 100.";
  }

  if (!input.trade_style) {
    errors.trade_style = "Execution style is required.";
  }

  if (isOpeningSignal) {
    if (!quantity || quantity <= 0) {
      errors.quantity =
        input.instrument_type === "OPTION"
          ? "Contracts are required for an active option signal."
          : "Shares are required for an active stock signal.";
    }
  }

  if (input.instrument_type === "OPTION") {
    if (!input.option_type) {
      errors.option_type = "Option type is required.";
    }

    if (!input.strike_price || input.strike_price <= 0) {
      errors.strike_price = "Strike price is required.";
    }

    if (!input.expiration_date) {
      errors.expiration_date = "Expiration date is required.";
    }
  }

  if (isClosedSignal) {
    if (!finalOutcome) {
      errors.outcome = "Closed or expired signals require an outcome.";
    }

    if (finalReturnPct === null) {
      errors.return_pct =
        "Closed or expired signals require a return percentage or exit price.";
    }
  }

  if (Object.keys(errors).length > 0 || !organization) {
    return {
      success: false,
      errors,
    };
  }

  const supabase = createSupabaseAdmin();

  const { data: signal, error } = await supabase
    .from("signals")
    .insert({
      organization_id: organization.id,

      asset,
      underlying,

      instrument_type: input.instrument_type,
      action,

      open_action: openAction,

      entry_price: entryPrice,
      price: entryPrice,
      open_price: openPrice,
      underlying_entry_price: underlyingEntryPrice,

      quantity: quantity ?? null,
      contracts,
      shares,

      option_type: input.instrument_type === "OPTION" ? input.option_type : null,
      strike_price:
        input.instrument_type === "OPTION" ? input.strike_price ?? null : null,
      expiration_date:
        input.instrument_type === "OPTION"
          ? input.expiration_date ?? null
          : null,

      confidence: input.confidence,
      trade_style: input.trade_style,

      status,
      watching,
      watched,

      outcome: finalOutcome,
      return_pct: finalReturnPct,
      exit_price: isClosedSignal ? exitPrice : null,

      opened_at: openedAt,
      closed_at: closedAt,

      created_by: role.user_id,
      updated_by: role.user_id,
      updated_at: now,
    })
    .select("id, organization_id")
    .single();

  if (error || !signal) {
    console.error("Create signal failed", error);

    return {
      success: false,
      errors: {
        _form: `Failed to create signal. ${
          error?.message ?? "Please try again."
        }`,
      },
    };
  }

  if (isOpeningSignal && quantity && quantity > 0 && openPrice) {
    const { data: execution, error: executionError } = await supabase
      .from("signal_executions")
      .insert({
        signal_id: signal.id,
        status: "OPEN",
        contracts: quantity,
        entry_price: openPrice,
        opened_at: openedAt ?? now,
        created_by: role.user_id,
      })
      .select("id")
      .single();

    if (executionError || !execution) {
      console.error("Create signal execution failed", executionError);

      return {
        success: false,
        errors: {
          _form:
            "Signal was created, but the opening execution failed to create.",
        },
      };
    }

    const { error: fillError } = await supabase.from("execution_fills").insert({
      execution_id: execution.id,
      contracts: quantity,
      price: openPrice,
      side: "OPEN",
      created_by: role.user_id,
    });

    if (fillError) {
      console.error("Create signal opening fill failed", fillError);

      return {
        success: false,
        errors: {
          _form:
            "Signal and execution were created, but the opening fill failed to create.",
        },
      };
    }
  }

  const template = EXECUTION_RULE_TEMPLATES[input.trade_style];

  if (!template?.rules?.length) {
    return {
      success: false,
      errors: {
        _form: "Invalid execution style.",
      },
    };
  }

  try {
    await applyExecutionTemplate(signal.id, input.trade_style, template.rules);
  } catch (error) {
    console.error("Execution rule template failed", error);

    return {
      success: false,
      errors: {
        _form: "Signal was created, but execution rules failed to apply.",
      },
    };
  }

  try {
    await sendSignalToDiscord({
      ...input,
      asset,
      underlying,
      action,
      signal_id: signal.id,
      manual_message: undefined,
      disable_auto_channels: false,
    });
  } catch (error) {
    console.error("Discord post failed, but signal was created:", error);
  }

  return {
    success: true,
    id: signal.id,
    organization_id: organization.id,
    organization_slug: organization.slug,
  };
}