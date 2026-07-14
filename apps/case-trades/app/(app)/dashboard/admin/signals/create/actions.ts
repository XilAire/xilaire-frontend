"use server";

import { createClient } from "@supabase/supabase-js";

import applyExecutionTemplate from "@/lib/applyExecutionRuleTemplate";
import { EXECUTION_RULE_TEMPLATES } from "@/lib/executionRuleTemplates";
import { sendSignalToDiscord } from "@/lib/discord/sendSignalToDiscord";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

const DEFAULT_ORG_SLUG =
  "case-trades";

const DEFAULT_EXECUTION_STYLE:
  ExecutionStyle = "swing";

export type SignalStatus =
  | "Active"
  | "Triggered"
  | "Closed"
  | "Expired";

export type SignalOutcome =
  | "WIN"
  | "LOSS"
  | "BREAKEVEN"
  | null;

export type OpenAction =
  | "BUY_TO_OPEN"
  | "SELL_TO_OPEN";

export type ExecutionStyle =
  | "scalp"
  | "swing"
  | "leap";

export type CreateSignalOptionLegInput = {
  leg_order: number;
  action: OpenAction;
  option_type: "CALL" | "PUT";
  strike_price: number;
  expiration_date: string;
  contracts?: number | null;
  entry_price?: number | null;
  exit_price?: number | null;
};

export type CreateSignalInput = {
  organization_id?: string;
  organization_slug?: string;

  asset: string;
  underlying: string;

  action: "BUY" | "SELL";
  open_action?: OpenAction;

  instrument_type:
    | "OPTION"
    | "STOCK";

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

  /**
   * Execution timeframe stored in signals.trade_style.
   *
   * Valid values:
   * scalp
   * swing
   * leap
   */
  trade_style: ExecutionStyle;

  /**
   * Detected strategy structure stored independently
   * in signals.strategy_type.
   *
   * Examples:
   * STOCK
   * LONG_CALL
   * LONG_PUT
   * CALL_DEBIT_SPREAD
   * CALL_CREDIT_SPREAD
   * IRON_CONDOR
   * IRON_BUTTERFLY
   */
  strategy_type?: string;

  /**
   * Backward-compatible execution-style alias.
   */
  execution_style?: ExecutionStyle;

  /**
   * Optional strategy-entry metadata supplied by the UI.
   *
   * The server independently rebuilds these values through
   * buildTradeSummary() before sending the Discord alert.
   */
  strategy_entry_type?:
    | "DEBIT"
    | "CREDIT"
    | "EVEN";

  signed_strategy_entry?:
    | number
    | null;

  total_debit?: number;
  total_credit?: number;

  /**
   * Multi-leg option structure.
   */
  option_legs?: CreateSignalOptionLegInput[];
};

type CreateSignalResult =
  | {
      success: true;
      id: string;
      organization_id: string;
      organization_slug: string;
      strategy_type: string;
      execution_style: ExecutionStyle;
    }
  | {
      success: false;
      errors: Record<string, string>;
    };

/* -------------------------------------------------
   SUPABASE ADMIN
------------------------------------------------- */
function createSupabaseAdmin() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES;

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
   AUTHORIZATION
------------------------------------------------- */
function isMasterAdmin(
  role: Awaited<
    ReturnType<
      typeof resolveCurrentUserRole
    >
  >,
) {
  return (
    role?.role_name ===
      "master_admin" ||
    role?.role_rank === 4 ||
    String(
      role?.email ?? "",
    ).toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

/* -------------------------------------------------
   NORMALIZATION
------------------------------------------------- */
function normalizeText(
  value:
    | string
    | null
    | undefined,
) {
  return String(
    value ?? "",
  ).trim();
}

function normalizeTicker(
  value:
    | string
    | null
    | undefined,
) {
  return normalizeText(
    value,
  ).toUpperCase();
}

function normalizeStrategyType(
  value:
    | string
    | null
    | undefined,
) {
  return normalizeText(
    value,
  )
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function normalizeNumber(
  value:
    | number
    | string
    | null
    | undefined,
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(
        value
          .replace("%", "")
          .trim(),
      );

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function normalizeStatus(
  value:
    | SignalStatus
    | undefined,
): SignalStatus {
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

function normalizeOutcome(
  value:
    | SignalOutcome
    | undefined,
): SignalOutcome {
  if (
    value === "WIN" ||
    value === "LOSS" ||
    value === "BREAKEVEN"
  ) {
    return value;
  }

  return null;
}

function normalizeExecutionStyle(
  value:
    | ExecutionStyle
    | string
    | null
    | undefined,
): ExecutionStyle {
  const normalized =
    String(
      value ?? "",
    )
      .trim()
      .toLowerCase();

  if (
    normalized === "scalp" ||
    normalized === "swing" ||
    normalized === "leap"
  ) {
    return normalized;
  }

  return DEFAULT_EXECUTION_STYLE;
}

/* -------------------------------------------------
   RETURN / OUTCOME
------------------------------------------------- */
function calculateReturnPct({
  entryPrice,
  exitPrice,
}: {
  entryPrice: number | null;
  exitPrice: number | null;
}) {
  if (
    entryPrice === null ||
    exitPrice === null ||
    entryPrice === 0
  ) {
    return null;
  }

  return Number(
    (
      (
        (exitPrice -
          entryPrice) /
        entryPrice
      ) *
      100
    ).toFixed(2),
  );
}

function inferOutcomeFromReturnPct(
  returnPct: number | null,
): SignalOutcome {
  if (
    returnPct === null
  ) {
    return null;
  }

  if (
    returnPct > 0
  ) {
    return "WIN";
  }

  if (
    returnPct < 0
  ) {
    return "LOSS";
  }

  return "BREAKEVEN";
}

/* -------------------------------------------------
   LIFECYCLE
------------------------------------------------- */
function isOpenLifecycleStatus(
  status: SignalStatus,
) {
  return (
    status === "Active" ||
    status === "Triggered"
  );
}

function isClosedLifecycleStatus(
  status: SignalStatus,
) {
  return (
    status === "Closed" ||
    status === "Expired"
  );
}

/* -------------------------------------------------
   SIGNAL HELPERS
------------------------------------------------- */
function getBrokerAction(
  input: CreateSignalInput,
) {
  if (
    input.open_action ===
    "SELL_TO_OPEN"
  ) {
    return "SELL";
  }

  if (
    input.open_action ===
    "BUY_TO_OPEN"
  ) {
    return "BUY";
  }

  return input.action;
}

function getQuantity(
  input: CreateSignalInput,
) {
  const quantity =
    normalizeNumber(
      input.quantity,
    );

  const contracts =
    normalizeNumber(
      input.contracts,
    );

  const shares =
    normalizeNumber(
      input.shares,
    );

  if (
    input.instrument_type ===
    "OPTION"
  ) {
    return (
      contracts ??
      quantity
    );
  }

  return (
    shares ??
    quantity
  );
}

function normalizeOptionLegs(
  input: CreateSignalInput,
) {
  if (
    input.instrument_type !==
    "OPTION"
  ) {
    return [];
  }

  return (
    input.option_legs ??
    []
  )
    .map(
      (leg, index) => {
        return {
          leg_order:
            normalizeNumber(
              leg.leg_order,
            ) ??
            index + 1,

          action:
            leg.action,

          option_type:
            leg.option_type,

          strike_price:
            normalizeNumber(
              leg.strike_price,
            ),

          expiration_date:
            normalizeText(
              leg.expiration_date,
            ),

          contracts:
            normalizeNumber(
              leg.contracts,
            ) ?? 1,

          entry_price:
            normalizeNumber(
              leg.entry_price,
            ),

          exit_price:
            normalizeNumber(
              leg.exit_price,
            ),
        };
      },
    )
    .filter((leg) => {
      return (
        Boolean(leg.action) &&
        Boolean(leg.option_type) &&
        leg.strike_price !==
          null &&
        leg.strike_price > 0 &&
        Boolean(
          leg.expiration_date,
        ) &&
        leg.contracts !==
          null &&
        leg.contracts > 0
      );
    })
    .sort(
      (
        firstLeg,
        secondLeg,
      ) =>
        firstLeg.leg_order -
        secondLeg.leg_order,
    );
}

/* -------------------------------------------------
   ORGANIZATION
------------------------------------------------- */
async function resolveOrganization({
  organizationId,
  organizationSlug,
}: {
  organizationId?: string;
  organizationSlug?: string;
}) {
  const supabase =
    createSupabaseAdmin();

  let query =
    supabase
      .from("organizations")
      .select(
        "id, slug, name, active",
      )
      .eq(
        "active",
        true,
      );

  if (
    organizationId
  ) {
    query =
      query.eq(
        "id",
        organizationId,
      );
  } else {
    query =
      query.eq(
        "slug",
        organizationSlug ||
          DEFAULT_ORG_SLUG,
      );
  }

  const {
    data: organization,
    error,
  } =
    await query.maybeSingle();

  if (
    error ||
    !organization
  ) {
    console.error(
      "Create signal organization lookup failed",
      {
        organizationId,
        organizationSlug,
        error,
      },
    );

    return null;
  }

  return organization;
}

/* -------------------------------------------------
   CREATE SIGNAL
------------------------------------------------- */
export async function createSignal(
  input: CreateSignalInput,
): Promise<CreateSignalResult> {
  const errors:
    Record<string, string> = {};

  const now =
    new Date().toISOString();

  const role =
    await resolveCurrentUserRole();

  if (
    !role ||
    !isMasterAdmin(role)
  ) {
    return {
      success: false,
      errors: {
        _form:
          "Unauthorized.",
      },
    };
  }

  const organization =
    await resolveOrganization({
      organizationId:
        input.organization_id,

      organizationSlug:
        input.organization_slug,
    });

  if (!organization) {
    errors.organization =
      "Organization is required.";
  }

  const asset =
    normalizeTicker(
      input.asset,
    );

  const suppliedUnderlying =
    normalizeTicker(
      input.underlying,
    );

  const underlying =
    suppliedUnderlying ||
    asset;

  const status =
    normalizeStatus(
      input.status,
    );

  const isOpeningSignal =
    isOpenLifecycleStatus(
      status,
    );

  const isClosedSignal =
    isClosedLifecycleStatus(
      status,
    );

  const watching =
    Boolean(
      input.watching,
    );

  const watched =
    Boolean(
      input.watched,
    ) ||
    watching;

  const action =
    getBrokerAction(
      input,
    );

  const openAction:
    OpenAction =
    input.open_action ??
    (
      action === "SELL"
        ? "SELL_TO_OPEN"
        : "BUY_TO_OPEN"
    );

  const entryPrice =
    normalizeNumber(
      input.entry_price,
    );

  const openPrice =
    normalizeNumber(
      input.open_price,
    ) ??
    entryPrice;

  const underlyingEntryPrice =
    normalizeNumber(
      input.underlying_entry_price,
    ) ??
    entryPrice;

  const quantity =
    getQuantity(
      input,
    );

  const contracts =
    input.instrument_type ===
    "OPTION"
      ? quantity
      : null;

  const shares =
    input.instrument_type ===
    "STOCK"
      ? quantity
      : null;

  const exitPrice =
    normalizeNumber(
      input.exit_price,
    );

  const providedReturnPct =
    normalizeNumber(
      input.return_pct,
    );

  const calculatedReturnPct =
    providedReturnPct ??
    calculateReturnPct({
      entryPrice,
      exitPrice,
    });

  const providedOutcome =
    normalizeOutcome(
      input.outcome,
    );

  const inferredOutcome =
    inferOutcomeFromReturnPct(
      calculatedReturnPct,
    );

  const finalReturnPct =
    isClosedSignal
      ? calculatedReturnPct
      : null;

  const finalOutcome =
    isClosedSignal
      ? providedOutcome ??
        inferredOutcome
      : null;

  const openedAt =
    isOpeningSignal
      ? input.opened_at ??
        now
      : null;

  const closedAt =
    isClosedSignal
      ? input.closed_at ??
        now
      : null;

  /*
   * signals.trade_style stores the execution timeframe.
   *
   * signals.strategy_type stores the actual trade
   * structure independently.
   */
  const executionStyle =
    normalizeExecutionStyle(
      input.trade_style ??
        input.execution_style,
    );

  const strategyType =
    input.instrument_type ===
    "OPTION"
      ? normalizeStrategyType(
          input.strategy_type,
        )
      : "STOCK";

  const optionLegs =
    normalizeOptionLegs(
      input,
    );

  const primaryOptionLeg =
    optionLegs[0];

  /* -------------------------------------------------
     VALIDATION
  ------------------------------------------------- */
  if (!asset) {
    errors.asset =
      "Ticker is required.";
  }

  if (!underlying) {
    errors.underlying =
      "Underlying ticker is required.";
  }

  if (!input.instrument_type) {
    errors.instrument_type =
      "Instrument type is required.";
  }

  if (!input.action) {
    errors.action =
      "Action is required.";
  }

  if (
    entryPrice === null ||
    entryPrice <= 0
  ) {
    errors.entry_price =
      "Entry/open price must be greater than 0.";
  }

  if (
    underlyingEntryPrice ===
      null ||
    underlyingEntryPrice <= 0
  ) {
    errors.underlying_entry_price =
      "Underlying market price is required.";
  }

  if (
    !input.confidence ||
    input.confidence < 1 ||
    input.confidence > 100
  ) {
    errors.confidence =
      "Confidence must be between 1 and 100.";
  }

  if (
    input.instrument_type ===
      "OPTION" &&
    !strategyType
  ) {
    errors.strategy_type =
      "Option strategy could not be detected.";
  }

  if (
    input.instrument_type ===
      "STOCK" &&
    strategyType !== "STOCK"
  ) {
    errors.strategy_type =
      "Stock signals must use the STOCK strategy type.";
  }

  if (
    isOpeningSignal &&
    (
      quantity === null ||
      quantity <= 0
    )
  ) {
    errors.quantity =
      input.instrument_type ===
      "OPTION"
        ? "Contracts are required for an active option signal."
        : "Shares are required for an active stock signal.";
  }

  if (
    input.instrument_type ===
    "OPTION"
  ) {
    if (
      optionLegs.length < 1
    ) {
      errors.option_legs =
        "At least one option leg is required.";
    }

    if (
      !input.option_type &&
      !primaryOptionLeg?.option_type
    ) {
      errors.option_type =
        "Option type is required.";
    }

    if (
      (
        !input.strike_price ||
        input.strike_price <= 0
      ) &&
      !primaryOptionLeg?.strike_price
    ) {
      errors.strike_price =
        "Strike price is required.";
    }

    if (
      !input.expiration_date &&
      !primaryOptionLeg?.expiration_date
    ) {
      errors.expiration_date =
        "Expiration date is required.";
    }
  }

  if (
    isClosedSignal
  ) {
    if (!finalOutcome) {
      errors.outcome =
        "Closed or expired signals require an outcome.";
    }

    if (
      finalReturnPct ===
      null
    ) {
      errors.return_pct =
        "Closed or expired signals require a return percentage or exit price.";
    }
  }

  if (
    Object.keys(
      errors,
    ).length > 0 ||
    !organization
  ) {
    return {
      success: false,
      errors,
    };
  }

  /*
   * Validation above guarantees both required prices are
   * valid numbers from this point forward. These constants
   * preserve that non-null type for database and Discord calls.
   */
  const validatedEntryPrice = entryPrice as number;
  const validatedUnderlyingEntryPrice =
    underlyingEntryPrice as number;

  /* -------------------------------------------------
     CENTRALIZED STRATEGY SUMMARY
  ------------------------------------------------- */
  const tradeSummary =
    buildTradeSummary({
      symbol:
        asset,

      underlying,

      instrument_type:
        input.instrument_type,

      trade_style:
        strategyType,

      execution_style:
        executionStyle,

      action,

      open_action:
        openAction,

      entry_price:
        validatedEntryPrice,

      exit_price:
        exitPrice,

      contracts,

      quantity,

      shares,

      option_type:
        input.option_type ??
        primaryOptionLeg?.option_type,

      strike_price:
        input.strike_price ??
        primaryOptionLeg?.strike_price,

      expiration_date:
        input.expiration_date ??
        primaryOptionLeg?.expiration_date,

      option_legs:
        optionLegs as TradeSummaryOptionLegInput[],
    });

  const resolvedOptionType =
    input.instrument_type ===
    "OPTION"
      ? input.option_type ??
        primaryOptionLeg?.option_type ??
        null
      : null;

  const resolvedStrikePrice =
    input.instrument_type ===
    "OPTION"
      ? input.strike_price ??
        primaryOptionLeg?.strike_price ??
        null
      : null;

  const resolvedExpirationDate =
    input.instrument_type ===
    "OPTION"
      ? input.expiration_date ??
        primaryOptionLeg?.expiration_date ??
        null
      : null;

  const supabase =
    createSupabaseAdmin();

  /* -------------------------------------------------
     INSERT SIGNAL
  ------------------------------------------------- */
  const {
    data: signal,
    error,
  } = await supabase
    .from("signals")
    .insert({
      organization_id:
        organization.id,

      asset,
      underlying,

      instrument_type:
        input.instrument_type,

      action,
      open_action:
        openAction,

      entry_price:
        validatedEntryPrice,

      price:
        validatedEntryPrice,

      open_price:
        openPrice,

      underlying_entry_price:
        validatedUnderlyingEntryPrice,

      quantity:
        quantity ??
        null,

      contracts,
      shares,

      option_type:
        resolvedOptionType,

      strike_price:
        resolvedStrikePrice,

      expiration_date:
        resolvedExpirationDate,

      confidence:
        input.confidence,

      trade_style:
        executionStyle,

      strategy_type:
        strategyType,

      status,
      watching,
      watched,

      outcome:
        finalOutcome,

      return_pct:
        finalReturnPct,

      exit_price:
        isClosedSignal
          ? exitPrice
          : null,

      opened_at:
        openedAt,

      closed_at:
        closedAt,

      created_by:
        role.user_id,

      updated_by:
        role.user_id,

      updated_at:
        now,
    })
    .select(
      `
      id,
      organization_id,
      trade_style,
      strategy_type
    `,
    )
    .single();

  if (
    error ||
    !signal
  ) {
    console.error(
      "Create signal failed",
      error,
    );

    return {
      success: false,
      errors: {
        _form:
          `Failed to create signal. ${
            error?.message ??
            "Please try again."
          }`,
      },
    };
  }

  /* -------------------------------------------------
     INSERT OPTION LEGS
  ------------------------------------------------- */
  if (
    input.instrument_type ===
      "OPTION" &&
    optionLegs.length > 0
  ) {
    const signalOptionLegRows =
      optionLegs.map(
        (leg) => {
          return {
            signal_id:
              signal.id,

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

            exit_price:
              leg.exit_price,

            created_at:
              now,

            updated_at:
              now,
          };
        },
      );

    const {
      error:
        optionLegsError,
    } = await supabase
      .from(
        "signal_option_legs",
      )
      .insert(
        signalOptionLegRows,
      );

    if (
      optionLegsError
    ) {
      console.error(
        "Create signal option legs failed",
        optionLegsError,
      );

      return {
        success: false,
        errors: {
          _form:
            `Signal was created, but option legs failed to save. ${
              optionLegsError.message ??
              "Please check the signal_option_legs table."
            }`,
        },
      };
    }
  }

  /* -------------------------------------------------
     CREATE OPEN EXECUTION
  ------------------------------------------------- */
  if (
    isOpeningSignal &&
    quantity !== null &&
    quantity > 0 &&
    openPrice !== null
  ) {
    const {
      data: execution,
      error:
        executionError,
    } = await supabase
      .from(
        "signal_executions",
      )
      .insert({
        signal_id:
          signal.id,

        status:
          "OPEN",

        contracts:
          quantity,

        entry_price:
          openPrice,

        opened_at:
          openedAt ??
          now,

        created_by:
          role.user_id,
      })
      .select("id")
      .single();

    if (
      executionError ||
      !execution
    ) {
      console.error(
        "Create signal execution failed",
        executionError,
      );

      return {
        success: false,
        errors: {
          _form:
            "Signal was created, but the opening execution failed to create.",
        },
      };
    }

    const {
      error:
        fillError,
    } = await supabase
      .from(
        "execution_fills",
      )
      .insert({
        execution_id:
          execution.id,

        contracts:
          quantity,

        price:
          openPrice,

        side:
          "OPEN",

        created_by:
          role.user_id,
      });

    if (
      fillError
    ) {
      console.error(
        "Create signal opening fill failed",
        fillError,
      );

      return {
        success: false,
        errors: {
          _form:
            "Signal and execution were created, but the opening fill failed to create.",
        },
      };
    }
  }

  /* -------------------------------------------------
     APPLY EXECUTION TEMPLATE
  ------------------------------------------------- */
  const template =
    EXECUTION_RULE_TEMPLATES[
      executionStyle
    ];

  if (
    !template?.rules?.length
  ) {
    return {
      success: false,
      errors: {
        _form:
          "Invalid execution style.",
      },
    };
  }

  try {
    await applyExecutionTemplate(
      signal.id,
      executionStyle,
      template.rules,
    );
  } catch (templateError) {
    console.error(
      "Execution rule template failed",
      templateError,
    );

    return {
      success: false,
      errors: {
        _form:
          "Signal was created, but execution rules failed to apply.",
      },
    };
  }

  /* -------------------------------------------------
     DISCORD ALERT
  ------------------------------------------------- */
  try {
    await sendSignalToDiscord({
      organization_id:
        organization.id,

      organization_slug:
        organization.slug,

      organization_name:
        organization.name,

      asset,
      underlying,

      action,

      open_action:
        openAction,

      instrument_type:
        input.instrument_type,

      entry_price:
        validatedEntryPrice,

      underlying_entry_price:
        validatedUnderlyingEntryPrice ??
        undefined,

      option_type:
        resolvedOptionType ??
        undefined,

      strike_price:
        resolvedStrikePrice ??
        undefined,

      expiration_date:
        resolvedExpirationDate ??
        undefined,

      option_legs:
        optionLegs,

      confidence:
        input.confidence,

      /**
       * Correct separation:
       *
       * trade_style = execution timeframe
       * strategy_type = option structure
       */
      trade_style:
        executionStyle,

      execution_style:
        executionStyle,

      strategy_type:
        strategyType,

      /**
       * Authoritative centralized strategy metadata.
       *
       * Signed entry:
       * Debit  = negative
       * Credit = positive
       */
      strategy_entry_type:
        tradeSummary.debitCredit ===
          "UNKNOWN"
          ? undefined
          : tradeSummary.debitCredit,

      signed_strategy_entry:
        tradeSummary.netEntry ??
        undefined,

      total_debit:
        tradeSummary.totalPaid,

      total_credit:
        tradeSummary.totalReceived,

      signal_id:
        signal.id,

      manual_message:
        undefined,

      disable_auto_channels:
        false,
    });
  } catch (discordError) {
    console.error(
      "Discord post failed, but signal was created:",
      discordError,
    );
  }

  return {
    success: true,
    id:
      signal.id,
    organization_id:
      organization.id,
    organization_slug:
      organization.slug,
    strategy_type:
      strategyType,
    execution_style:
      executionStyle,
  };
}