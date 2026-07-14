"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

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

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
export type ExecutionStyle =
  | "scalp"
  | "swing"
  | "leap";

export type OptionLegAction =
  | "BUY_TO_OPEN"
  | "SELL_TO_OPEN";

export type OptionType =
  | "CALL"
  | "PUT";

export type SignalAction =
  | "BUY"
  | "SELL"
  | "HOLD";

export type SignalStatus =
  | "Active"
  | "Triggered"
  | "Closed"
  | "Expired";

export type SignalOutcome =
  | "WIN"
  | "LOSS"
  | "BREAKEVEN";

type StrategyEntryType =
  | "DEBIT"
  | "CREDIT"
  | "EVEN";

type ValidationErrors =
  Record<string, string>;

type NormalizedOptionLeg = {
  id: string | null;
  leg_order: number;
  action: OptionLegAction;
  option_type: OptionType;
  strike_price: number;
  expiration_date: string;
  contracts: number;
  entry_price: number;
};

type StrategyEntrySummary = {
  type: StrategyEntryType;
  signedNetEntry: number;
  absoluteNetEntry: number;
  totalPaid: number;
  totalReceived: number;
};

type ExistingSignalRow = {
  id: string;
  organization_id: string;
  asset: string | null;
  underlying: string | null;
  action: string | null;
  open_action: string | null;
  instrument_type: string | null;
  trade_style: string | null;
  strategy_type: string | null;
  status: string | null;
  outcome: string | null;
  closed_at: string | null;
};

type ExistingOptionLegRow = {
  id: string;
  signal_id: string;
  leg_order: number;
  action: string;
  option_type: string;
  strike_price: number | string | null;
  expiration_date: string | null;
  contracts: number | string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
};

type UpdateSignalResult =
  | {
      success: true;
      signalId: string;
      strategy_type: string;
      execution_style: ExecutionStyle;
      strategy_entry: StrategyEntrySummary;
    }
  | {
      success: false;
      errors: ValidationErrors;
    };

/* -------------------------------------------------
   ADMIN CLIENT
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

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

/* -------------------------------------------------
   NORMALIZATION HELPERS
------------------------------------------------- */
function normalizeText(
  value:
    | FormDataEntryValue
    | string
    | null
    | undefined,
) {
  return String(value ?? "").trim();
}

function normalizeTicker(
  value:
    | FormDataEntryValue
    | string
    | null
    | undefined,
) {
  return normalizeText(value).toUpperCase();
}

function normalizeStrategyType(
  value:
    | string
    | null
    | undefined,
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function toNumber(
  value:
    | FormDataEntryValue
    | number
    | string
    | null
    | undefined,
  fallback = 0,
) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function toNullableNumber(
  value:
    | FormDataEntryValue
    | number
    | string
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function roundPrice(value: number) {
  return Number(value.toFixed(4));
}

function isValidDateString(value: string) {
  if (!value) {
    return false;
  }

  const parsed = new Date(
    `${value}T00:00:00`,
  );

  return !Number.isNaN(
    parsed.getTime(),
  );
}

function withOrgQuery(
  href: string,
  organizationSlug?: string | null,
) {
  if (!organizationSlug) {
    return href;
  }

  const separator =
    href.includes("?")
      ? "&"
      : "?";

  return `${href}${separator}org=${encodeURIComponent(
    organizationSlug,
  )}`;
}

/* -------------------------------------------------
   OPTION LEG HELPERS
------------------------------------------------- */
function parseOptionLegs(
  formData: FormData,
): NormalizedOptionLeg[] {
  const optionLegCount =
    Math.max(
      Math.floor(
        toNumber(
          formData.get(
            "option_leg_count",
          ),
        ),
      ),
      0,
    );

  return Array.from(
    {
      length:
        optionLegCount,
    },
    (_, index) => {
      const legNumber =
        index + 1;

      const rawId =
        normalizeText(
          formData.get(
            `option_leg_${legNumber}_id`,
          ),
        );

      return {
        id:
          rawId || null,

        leg_order:
          legNumber,

        action:
          normalizeText(
            formData.get(
              `option_leg_${legNumber}_action`,
            ),
          ).toUpperCase() as OptionLegAction,

        option_type:
          normalizeText(
            formData.get(
              `option_leg_${legNumber}_option_type`,
            ),
          ).toUpperCase() as OptionType,

        strike_price:
          toNumber(
            formData.get(
              `option_leg_${legNumber}_strike_price`,
            ),
          ),

        expiration_date:
          normalizeText(
            formData.get(
              `option_leg_${legNumber}_expiration_date`,
            ),
          ),

        contracts:
          toNumber(
            formData.get(
              `option_leg_${legNumber}_contracts`,
            ),
          ),

        entry_price:
          toNumber(
            formData.get(
              `option_leg_${legNumber}_entry_price`,
            ),
          ),
      };
    },
  );
}

function mapLegsForDetection(
  optionLegs: NormalizedOptionLeg[],
): TradeStyleOptionLeg[] {
  return optionLegs.map(
    (leg) => ({
      action:
        leg.action,
      optionType:
        leg.option_type,
      strikePrice:
        leg.strike_price,
      expirationDate:
        leg.expiration_date,
      contracts:
        leg.contracts,
      entryPrice:
        leg.entry_price,
    }),
  );
}

function calculateStrategyEntry(
  optionLegs: NormalizedOptionLeg[],
): StrategyEntrySummary {
  let totalPaid = 0;
  let totalReceived = 0;

  for (const leg of optionLegs) {
    const premium =
      leg.contracts *
      leg.entry_price;

    if (
      leg.action ===
      "BUY_TO_OPEN"
    ) {
      totalPaid += premium;
    } else if (
      leg.action ===
      "SELL_TO_OPEN"
    ) {
      totalReceived += premium;
    }
  }

  const signedNetEntry =
    roundPrice(
      totalPaid -
        totalReceived,
    );

  const type:
    StrategyEntryType =
    signedNetEntry > 0
      ? "DEBIT"
      : signedNetEntry < 0
        ? "CREDIT"
        : "EVEN";

  return {
    type,
    signedNetEntry,
    absoluteNetEntry:
      roundPrice(
        Math.abs(
          signedNetEntry,
        ),
      ),
    totalPaid:
      roundPrice(totalPaid),
    totalReceived:
      roundPrice(
        totalReceived,
      ),
  };
}

/* -------------------------------------------------
   VALIDATION
------------------------------------------------- */
function validateInput({
  asset,
  underlying,
  action,
  executionStyle,
  underlyingEntryPrice,
  stopLossPct,
  takeProfitPct,
  confidence,
  status,
  outcome,
  optionLegs,
  strategyType,
  strategyEntry,
}: {
  asset: string;
  underlying: string;
  action: SignalAction;
  executionStyle: ExecutionStyle;
  underlyingEntryPrice: number | null;
  stopLossPct: number | null;
  takeProfitPct: number | null;
  confidence: number;
  status: SignalStatus;
  outcome: string;
  optionLegs: NormalizedOptionLeg[];
  strategyType: string;
  strategyEntry: StrategyEntrySummary;
}) {
  const errors:
    ValidationErrors = {};

  if (!asset) {
    errors.asset =
      "Ticker is required.";
  }

  if (!underlying) {
    errors.underlying =
      "Underlying is required.";
  }

  if (
    ![
      "BUY",
      "SELL",
      "HOLD",
    ].includes(action)
  ) {
    errors.action =
      "Action must be BUY, SELL, or HOLD.";
  }

  if (
    ![
      "scalp",
      "swing",
      "leap",
    ].includes(
      executionStyle,
    )
  ) {
    errors.trade_style =
      "Execution style must be scalp, swing, or leap.";
  }

  if (
    underlyingEntryPrice !== null &&
    (
      !Number.isFinite(
        underlyingEntryPrice,
      ) ||
      underlyingEntryPrice <= 0
    )
  ) {
    errors.underlying_entry_price =
      "Underlying entry price must be greater than 0.";
  }

  if (
    stopLossPct !== null &&
    (
      !Number.isFinite(
        stopLossPct,
      ) ||
      stopLossPct >= 0
    )
  ) {
    errors.stop_loss_pct =
      "Stop loss should be a negative percentage.";
  }

  if (
    takeProfitPct !== null &&
    (
      !Number.isFinite(
        takeProfitPct,
      ) ||
      takeProfitPct <= 0
    )
  ) {
    errors.take_profit_pct =
      "Take profit should be a positive percentage.";
  }

  if (
    !Number.isFinite(
      confidence,
    ) ||
    confidence < 0 ||
    confidence > 100
  ) {
    errors.confidence =
      "Confidence must be between 0 and 100.";
  }

  if (
    ![
      "Active",
      "Triggered",
      "Closed",
      "Expired",
    ].includes(status)
  ) {
    errors.status =
      "Invalid status value.";
  }

  if (
    status === "Closed" &&
    ![
      "WIN",
      "LOSS",
      "BREAKEVEN",
    ].includes(outcome)
  ) {
    errors.outcome =
      "Outcome is required when closing a signal.";
  }

  if (
    optionLegs.length === 0
  ) {
    errors.option_legs =
      "At least one option leg is required.";
  }

  optionLegs.forEach(
    (leg, index) => {
      const label =
        `Leg ${index + 1}`;

      if (
        ![
          "BUY_TO_OPEN",
          "SELL_TO_OPEN",
        ].includes(
          leg.action,
        )
      ) {
        errors.option_legs =
          `${label} has an invalid action.`;
      }

      if (
        ![
          "CALL",
          "PUT",
        ].includes(
          leg.option_type,
        )
      ) {
        errors.option_legs =
          `${label} has an invalid option type.`;
      }

      if (
        !Number.isFinite(
          leg.strike_price,
        ) ||
        leg.strike_price <= 0
      ) {
        errors.option_legs =
          `${label} strike must be greater than 0.`;
      }

      if (
        !isValidDateString(
          leg.expiration_date,
        )
      ) {
        errors.option_legs =
          `${label} expiration date is invalid.`;
      }

      if (
        !Number.isInteger(
          leg.contracts,
        ) ||
        leg.contracts <= 0
      ) {
        errors.option_legs =
          `${label} contracts must be a positive whole number.`;
      }

      if (
        !Number.isFinite(
          leg.entry_price,
        ) ||
        leg.entry_price < 0
      ) {
        errors.option_legs =
          `${label} premium must be zero or greater.`;
      }
    },
  );

  if (!strategyType) {
    errors.strategy_type =
      "Option strategy could not be detected.";
  }

  if (
    strategyEntry.type ===
      "EVEN" ||
    strategyEntry.absoluteNetEntry <=
      0
  ) {
    errors.entry_price =
      "The option legs must produce a positive net debit or credit.";
  }

  return errors;
}

/* -------------------------------------------------
   ERROR REDIRECT
------------------------------------------------- */
function redirectWithErrors({
  signalId,
  organizationSlug,
  errors,
}: {
  signalId: string;
  organizationSlug?: string | null;
  errors: ValidationErrors;
}): never {
  const params =
    new URLSearchParams(
      errors,
    );

  if (organizationSlug) {
    params.set(
      "org",
      organizationSlug,
    );
  }

  redirect(
    `/dashboard/signals/edit/${signalId}?${params.toString()}`,
  );
}

/* -------------------------------------------------
   UPDATE SIGNAL ACTION
------------------------------------------------- */
export async function updateSignal(
  signalId: string,
  formData: FormData,
): Promise<UpdateSignalResult> {
  const role =
    await resolveCurrentUserRole();

  if (
    !role ||
    role.role_rank !== 4
  ) {
    throw new Error(
      "Unauthorized",
    );
  }

  const organizationId =
    normalizeText(
      formData.get(
        "organization_id",
      ),
    );

  const organizationSlug =
    normalizeText(
      formData.get("org"),
    );

  if (!organizationId) {
    throw new Error(
      "Missing organization_id.",
    );
  }

  const profile =
    await getProfile({
      organizationSlug:
        organizationSlug ||
        undefined,
    });

  const isMasterAdmin =
    profile.current_organization
      ?.is_master_admin === true ||
    profile.roles?.[0]?.name ===
      "master_admin" ||
    Number(
      profile.roles?.[0]?.rank ??
        0,
    ) >= 4 ||
    normalizeText(
      profile.email,
    ).toLowerCase() ===
      "csthilaire@xilairetechnologies.com";

  if (!isMasterAdmin) {
    throw new Error(
      "Unauthorized",
    );
  }

  const asset =
    normalizeTicker(
      formData.get("asset"),
    );

  const underlying =
    normalizeTicker(
      formData.get(
        "underlying",
      ),
    );

  const action =
    normalizeText(
      formData.get("action"),
    ).toUpperCase() as SignalAction;

  const executionStyle =
    normalizeText(
      formData.get(
        "trade_style",
      ),
    ).toLowerCase() as ExecutionStyle;

  const underlyingEntryPrice =
    toNullableNumber(
      formData.get(
        "underlying_entry_price",
      ),
    );

  const stopLossPct =
    toNullableNumber(
      formData.get(
        "stop_loss_pct",
      ),
    );

  const takeProfitPct =
    toNullableNumber(
      formData.get(
        "take_profit_pct",
      ),
    );

  const confidence =
    toNumber(
      formData.get(
        "confidence",
      ),
    );

  const status =
    normalizeText(
      formData.get("status"),
    ) as SignalStatus;

  const outcome =
    normalizeText(
      formData.get("outcome"),
    ).toUpperCase();

  const rationale =
    normalizeText(
      formData.get(
        "rationale",
      ),
    );

  const optionLegs =
    parseOptionLegs(
      formData,
    );

  const strategyEntry =
    calculateStrategyEntry(
      optionLegs,
    );

  const detectedStrategy =
    detectTradeStyle({
      instrumentType:
        "OPTION",
      legs:
        mapLegsForDetection(
          optionLegs,
        ),
    });

  const strategyType =
    normalizeStrategyType(
      detectedStrategy.style,
    );

  const openAction: OptionLegAction =
    optionLegs[0]?.action ??
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
        optionLegs[0]?.option_type,

      strike_price:
        optionLegs[0]?.strike_price,

      expiration_date:
        optionLegs[0]?.expiration_date,

      option_legs:
        optionLegs as TradeSummaryOptionLegInput[],
    });

  const validationErrors =
    validateInput({
      asset,
      underlying,
      action,
      executionStyle,
      underlyingEntryPrice,
      stopLossPct,
      takeProfitPct,
      confidence,
      status,
      outcome,
      optionLegs,
      strategyType,
      strategyEntry,
    });

  if (
    Object.keys(
      validationErrors,
    ).length > 0
  ) {
    redirectWithErrors({
      signalId,
      organizationSlug,
      errors:
        validationErrors,
    });
  }

  const supabaseAdmin =
    createSupabaseAdminClient();

  const {
    data:
      currentSignalData,
    error:
      currentSignalError,
  } = await supabaseAdmin
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
      trade_style,
      strategy_type,
      status,
      outcome,
      closed_at
    `,
    )
    .eq("id", signalId)
    .eq(
      "organization_id",
      organizationId,
    )
    .maybeSingle();

  if (
    currentSignalError ||
    !currentSignalData
  ) {
    console.error(
      "Edit signal organization guard failed",
      {
        signalId,
        organizationId,
        currentSignalError,
      },
    );

    throw new Error(
      "Signal not found for selected organization.",
    );
  }

  const currentSignal =
    currentSignalData as ExistingSignalRow;

  const {
    data:
      existingLegData,
    error:
      existingLegError,
  } = await supabaseAdmin
    .from(
      "signal_option_legs",
    )
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
    .eq(
      "signal_id",
      signalId,
    )
    .order(
      "leg_order",
      {
        ascending: true,
      },
    );

  if (existingLegError) {
    console.error(
      "Edit signal existing option-leg lookup failed",
      existingLegError,
    );

    throw new Error(
      "Failed to load existing option legs.",
    );
  }

  const existingLegs =
    (existingLegData ??
      []) as ExistingOptionLegRow[];

  const existingLegIds =
    new Set(
      existingLegs.map(
        (leg) => leg.id,
      ),
    );

  for (const leg of optionLegs) {
    if (
      leg.id &&
      !existingLegIds.has(
        leg.id,
      )
    ) {
      throw new Error(
        "One or more option legs do not belong to this signal.",
      );
    }
  }

  const primaryLeg =
    optionLegs[0];

  if (!primaryLeg) {
    throw new Error(
      "Primary option leg is missing.",
    );
  }

  if (
    tradeSummary.strategyContracts <=
    0
  ) {
    throw new Error(
      "Strategy contract count could not be calculated.",
    );
  }

  const nextClosedAt =
    status === "Closed"
      ? currentSignal.closed_at ??
        new Date().toISOString()
      : null;

  const {
    error:
      signalUpdateError,
  } = await supabaseAdmin
    .from("signals")
    .update({
      asset,
      underlying,
      action,

      open_action:
        openAction,

      instrument_type:
        "OPTION",

      option_type:
        primaryLeg.option_type,

      strike_price:
        primaryLeg.strike_price,

      expiration_date:
        primaryLeg.expiration_date,

      contracts:
        tradeSummary.strategyContracts,

      quantity:
        tradeSummary.strategyContracts,

      trade_style:
        executionStyle,

      strategy_type:
        strategyType,

      price:
        tradeSummary.netEntryAmount ??
        strategyEntry.absoluteNetEntry,

      entry_price:
        tradeSummary.netEntryAmount ??
        strategyEntry.absoluteNetEntry,

      underlying_entry_price:
        underlyingEntryPrice,

      stop_loss_pct:
        stopLossPct,

      take_profit_pct:
        takeProfitPct,

      confidence,

      status,

      outcome:
        status === "Closed"
          ? outcome
          : null,

      closed_at:
        nextClosedAt,

      rationale:
        rationale || null,

      updated_by:
        role.user_id,

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", signalId)
    .eq(
      "organization_id",
      organizationId,
    );

  if (signalUpdateError) {
    console.error(
      "Edit signal save error",
      signalUpdateError,
    );

    redirectWithErrors({
      signalId,
      organizationSlug,
      errors: {
        _form:
          "Signal save failed.",
      },
    });
  }

  const submittedExistingIds =
    new Set(
      optionLegs
        .map((leg) => leg.id)
        .filter(
          (
            legId,
          ): legId is string =>
            Boolean(legId),
        ),
    );

  const removedLegIds =
    existingLegs
      .map((leg) => leg.id)
      .filter(
        (legId) =>
          !submittedExistingIds.has(
            legId,
          ),
      );

  for (const leg of optionLegs) {
    const legPayload = {
      signal_id:
        signalId,

      leg_order:
        leg.leg_order,

      action:
        leg.action,

      option_type:
        leg.option_type,

      strike_price:
        leg.strike_price,

      expiration_date:
        leg.expiration_date,

      contracts:
        leg.contracts,

      entry_price:
        leg.entry_price,

      updated_at:
        new Date().toISOString(),
    };

    if (leg.id) {
      const {
        error:
          legUpdateError,
      } = await supabaseAdmin
        .from(
          "signal_option_legs",
        )
        .update(
          legPayload,
        )
        .eq(
          "id",
          leg.id,
        )
        .eq(
          "signal_id",
          signalId,
        );

      if (legUpdateError) {
        console.error(
          "Edit signal option-leg update failed",
          {
            signalId,
            legId: leg.id,
            error:
              legUpdateError,
          },
        );

        throw new Error(
          "Signal was updated, but an option leg could not be updated.",
        );
      }
    } else {
      const {
        error:
          legInsertError,
      } = await supabaseAdmin
        .from(
          "signal_option_legs",
        )
        .insert(
          legPayload,
        );

      if (legInsertError) {
        console.error(
          "Edit signal option-leg insert failed",
          {
            signalId,
            error:
              legInsertError,
          },
        );

        throw new Error(
          "Signal was updated, but a new option leg could not be inserted.",
        );
      }
    }
  }

  if (
    removedLegIds.length > 0
  ) {
    const {
      data:
        referencedRemovedLegs,
      error:
        removedLegReferenceError,
    } = await supabaseAdmin
      .from(
        "execution_fills",
      )
      .select(
        "signal_option_leg_id",
      )
      .in(
        "signal_option_leg_id",
        removedLegIds,
      );

    if (
      removedLegReferenceError
    ) {
      console.error(
        "Edit signal removed-leg reference lookup failed",
        removedLegReferenceError,
      );

      throw new Error(
        "Unable to verify removed option-leg references.",
      );
    }

    const referencedLegIds =
      new Set(
        (
          referencedRemovedLegs ??
          []
        )
          .map(
            (row) =>
              row.signal_option_leg_id,
          )
          .filter(
            (
              legId,
            ): legId is string =>
              Boolean(legId),
          ),
      );

    const safeToDeleteIds =
      removedLegIds.filter(
        (legId) =>
          !referencedLegIds.has(
            legId,
          ),
      );

    if (
      safeToDeleteIds.length > 0
    ) {
      const {
        error:
          removedLegDeleteError,
      } = await supabaseAdmin
        .from(
          "signal_option_legs",
        )
        .delete()
        .in(
          "id",
          safeToDeleteIds,
        )
        .eq(
          "signal_id",
          signalId,
        );

      if (
        removedLegDeleteError
      ) {
        console.error(
          "Edit signal removed option-leg delete failed",
          removedLegDeleteError,
        );

        throw new Error(
          "Signal was updated, but removed option legs could not be deleted.",
        );
      }
    }

    if (
      referencedLegIds.size > 0
    ) {
      console.warn(
        "Edit signal retained removed option legs because execution fills reference them",
        {
          signalId,
          referencedLegIds:
            Array.from(
              referencedLegIds,
            ),
        },
      );
    }
  }

  revalidatePath(
    "/dashboard/signals",
  );

  revalidatePath(
    "/dashboard/admin/signals",
  );

  revalidatePath(
    `/dashboard/signals/${signalId}`,
  );

  revalidatePath(
    `/dashboard/signals/edit/${signalId}`,
  );

  const redirectUrl =
    withOrgQuery(
      `/dashboard/signals/${signalId}?saved=1`,
      organizationSlug,
    );

  redirect(redirectUrl);
}
