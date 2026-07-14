"use server";

import { createClient } from "@supabase/supabase-js";

import applyExecutionTemplate from "@/lib/applyExecutionRuleTemplate";
import { EXECUTION_RULE_TEMPLATES } from "@/lib/executionRuleTemplates";
import { sendSignalToDiscord } from "@/lib/discord/sendSignalToDiscord";
import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
export type SignalAction = "BUY" | "SELL";

export type InstrumentType = "OPTION" | "STOCK";

export type OptionType = "CALL" | "PUT";

export type OptionLegAction =
  | "BUY_TO_OPEN"
  | "SELL_TO_OPEN";

export type ExecutionStyle =
  | "scalp"
  | "swing"
  | "leap";

export type StrategyEntryType =
  | "DEBIT"
  | "CREDIT"
  | "EVEN";

export type CreateSignalOptionLegInput = {
  leg_order: number;
  action: OptionLegAction;
  option_type: OptionType;
  strike_price: number;
  expiration_date: string;
  contracts: number;
  entry_price: number;
};

export type CreateSignalInput = {
  action: SignalAction;
  instrument_type: InstrumentType;
  underlying: string;

  /**
   * STOCK:
   * The stock entry price.
   *
   * OPTION:
   * The absolute net strategy entry calculated from all legs.
   */
  entry_price: number;

  underlying_entry_price: number;

  /**
   * Legacy primary-leg fields retained for compatibility with
   * existing signal pages, table rows, alerts, and older records.
   */
  option_type?: OptionType;
  strike_price?: number;
  expiration_date?: string;

  confidence: number;

  /**
   * Execution timeframe used by the execution-rule template system.
   */
  trade_style: ExecutionStyle;

  /**
   * Detected strategy structure saved separately from execution style.
   *
   * Examples:
   * STOCK
   * LONG_CALL
   * LONG_PUT
   * CALL_DEBIT_SPREAD
   * CALL_CREDIT_SPREAD
   * PUT_DEBIT_SPREAD
   * PUT_CREDIT_SPREAD
   * IRON_CONDOR
   * STRADDLE
   * STRANGLE
   */
  strategy_type?: string;

  /**
   * Complete saved option structure.
   */
  option_legs?: CreateSignalOptionLegInput[];
};

type ValidationErrors = Record<string, string>;

type NormalizedOptionLeg = {
  leg_order: number;
  action: OptionLegAction;
  option_type: OptionType;
  strike_price: number;
  expiration_date: string;
  contracts: number;
  entry_price: number;
};

type StrategyEntryCalculation = {
  type: StrategyEntryType;

  /**
   * Positive means net debit.
   * Negative means net credit.
   */
  signedNetEntry: number;

  /**
   * Absolute strategy price stored in signals.entry_price.
   */
  absoluteNetEntry: number;

  totalDebit: number;
  totalCredit: number;
};

type CreateSignalSuccessResult = {
  success: true;
  id: string;
  strategy_type: string;
  execution_style: ExecutionStyle;
  strategy_entry: {
    type: StrategyEntryType;
    net_entry: number;
    signed_net_entry: number;
    total_debit: number;
    total_credit: number;
  } | null;
};

type CreateSignalErrorResult = {
  success: false;
  error: string;
  errors: ValidationErrors;
};

export type CreateSignalResult =
  | CreateSignalSuccessResult
  | CreateSignalErrorResult;

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

function roundPrice(value: number) {
  return Number(value.toFixed(4));
}

/* -------------------------------------------------
   STRING HELPERS
------------------------------------------------- */
function normalizeTicker(value: string) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeStrategyType(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function isValidDateString(value: string) {
  if (!value) {
    return false;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed);
}

/* -------------------------------------------------
   OPTION-LEG NORMALIZATION
------------------------------------------------- */
function normalizeOptionLegs(
  optionLegs:
    | CreateSignalOptionLegInput[]
    | undefined,
): NormalizedOptionLeg[] {
  if (!optionLegs) {
    return [];
  }

  return [...optionLegs]
    .map((leg, index) => {
      const submittedLegOrder = Number(
        leg.leg_order,
      );

      return {
        leg_order:
          Number.isInteger(
            submittedLegOrder,
          ) &&
          submittedLegOrder > 0
            ? submittedLegOrder
            : index + 1,

        action: leg.action,

        option_type:
          leg.option_type,

        strike_price:
          toNumber(
            leg.strike_price,
          ),

        expiration_date:
          String(
            leg.expiration_date ?? "",
          ).trim(),

        contracts:
          toNumber(
            leg.contracts,
          ),

        entry_price:
          toNumber(
            leg.entry_price,
          ),
      };
    })
    .sort(
      (firstLeg, secondLeg) =>
        firstLeg.leg_order -
        secondLeg.leg_order,
    )
    .map((leg, index) => ({
      ...leg,
      leg_order: index + 1,
    }));
}

/* -------------------------------------------------
   OPTION-LEG VALIDATION
------------------------------------------------- */
function validateOptionLegs(
  optionLegs: NormalizedOptionLeg[],
) {
  const errors: ValidationErrors = {};

  if (optionLegs.length === 0) {
    errors.option_legs =
      "At least one option leg is required.";

    return errors;
  }

  optionLegs.forEach(
    (leg, index) => {
      const legNumber = index + 1;

      if (
        leg.action !==
          "BUY_TO_OPEN" &&
        leg.action !==
          "SELL_TO_OPEN"
      ) {
        errors[
          `option_legs.${index}.action`
        ] =
          `Leg ${legNumber} has an invalid opening action.`;
      }

      if (
        leg.option_type !==
          "CALL" &&
        leg.option_type !==
          "PUT"
      ) {
        errors[
          `option_legs.${index}.option_type`
        ] =
          `Leg ${legNumber} has an invalid option type.`;
      }

      if (
        !Number.isFinite(
          leg.strike_price,
        ) ||
        leg.strike_price <= 0
      ) {
        errors[
          `option_legs.${index}.strike_price`
        ] =
          `Leg ${legNumber} strike must be greater than 0.`;
      }

      if (
        !isValidDateString(
          leg.expiration_date,
        )
      ) {
        errors[
          `option_legs.${index}.expiration_date`
        ] =
          `Leg ${legNumber} expiration date is invalid.`;
      }

      if (
        !Number.isInteger(
          leg.contracts,
        ) ||
        leg.contracts <= 0
      ) {
        errors[
          `option_legs.${index}.contracts`
        ] =
          `Leg ${legNumber} contracts must be a positive whole number.`;
      }

      if (
        !Number.isFinite(
          leg.entry_price,
        ) ||
        leg.entry_price < 0
      ) {
        errors[
          `option_legs.${index}.entry_price`
        ] =
          `Leg ${legNumber} premium cannot be negative.`;
      }
    },
  );

  return errors;
}

/* -------------------------------------------------
   STRATEGY ENTRY CALCULATION
------------------------------------------------- */
function calculateStrategyEntry(
  optionLegs: NormalizedOptionLeg[],
): StrategyEntryCalculation {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const leg of optionLegs) {
    const legPremium =
      leg.entry_price *
      leg.contracts;

    if (
      leg.action ===
      "BUY_TO_OPEN"
    ) {
      totalDebit += legPremium;
    }

    if (
      leg.action ===
      "SELL_TO_OPEN"
    ) {
      totalCredit += legPremium;
    }
  }

  /*
   * Positive:
   * Total paid is greater than total received.
   * The strategy opens for a DEBIT.
   *
   * Negative:
   * Total received is greater than total paid.
   * The strategy opens for a CREDIT.
   */
  const signedNetEntry =
    totalDebit - totalCredit;

  const absoluteNetEntry =
    Math.abs(signedNetEntry);

  const type: StrategyEntryType =
    signedNetEntry > 0
      ? "DEBIT"
      : signedNetEntry < 0
        ? "CREDIT"
        : "EVEN";

  return {
    type,

    signedNetEntry:
      roundPrice(
        signedNetEntry,
      ),

    absoluteNetEntry:
      roundPrice(
        absoluteNetEntry,
      ),

    totalDebit:
      roundPrice(
        totalDebit,
      ),

    totalCredit:
      roundPrice(
        totalCredit,
      ),
  };
}

/* -------------------------------------------------
   INPUT VALIDATION
------------------------------------------------- */
function validateCreateSignalInput({
  input,
  optionLegs,
  strategyEntry,
}: {
  input: CreateSignalInput;
  optionLegs: NormalizedOptionLeg[];
  strategyEntry:
    | StrategyEntryCalculation
    | null;
}) {
  const errors: ValidationErrors = {};

  const underlying =
    normalizeTicker(
      input.underlying,
    );

  const strategyType =
    normalizeStrategyType(
      input.strategy_type,
    );

  if (
    input.action !== "BUY" &&
    input.action !== "SELL"
  ) {
    errors.action =
      "Action is required.";
  }

  if (
    input.instrument_type !==
      "OPTION" &&
    input.instrument_type !==
      "STOCK"
  ) {
    errors.instrument_type =
      "Instrument type is required.";
  }

  if (!underlying) {
    errors.underlying =
      "Underlying ticker is required.";
  }

  if (
    !Number.isFinite(
      input.underlying_entry_price,
    ) ||
    input.underlying_entry_price <= 0
  ) {
    errors.underlying_entry_price =
      "Underlying market price is required.";
  }

  if (
    !Number.isFinite(
      input.confidence,
    ) ||
    input.confidence < 1 ||
    input.confidence > 100
  ) {
    errors.confidence =
      "Confidence must be between 1 and 100.";
  }

  if (
    input.trade_style !==
      "scalp" &&
    input.trade_style !==
      "swing" &&
    input.trade_style !==
      "leap"
  ) {
    errors.trade_style =
      "Execution style is invalid.";
  }

  if (
    input.instrument_type ===
    "STOCK"
  ) {
    if (
      !Number.isFinite(
        input.entry_price,
      ) ||
      input.entry_price <= 0
    ) {
      errors.entry_price =
        "Stock entry price must be greater than 0.";
    }

    if (
      strategyType &&
      strategyType !== "STOCK"
    ) {
      errors.strategy_type =
        "Stock signals must use the STOCK strategy type.";
    }
  }

  if (
    input.instrument_type ===
    "OPTION"
  ) {
    Object.assign(
      errors,
      validateOptionLegs(
        optionLegs,
      ),
    );

    if (!strategyType) {
      errors.strategy_type =
        "Option strategy could not be detected.";
    }

    if (!strategyEntry) {
      errors.entry_price =
        "Unable to calculate the option strategy entry.";
    } else {
      if (
        strategyEntry.type ===
        "EVEN"
      ) {
        errors.entry_price =
          "The entered premiums produce a zero-cost strategy.";
      }

      if (
        strategyEntry.absoluteNetEntry <=
        0
      ) {
        errors.entry_price =
          "The option strategy entry must be greater than 0.";
      }

      const submittedEntry =
        roundPrice(
          toNumber(
            input.entry_price,
          ),
        );

      const calculatedEntry =
        strategyEntry.absoluteNetEntry;

      const difference =
        Math.abs(
          submittedEntry -
            calculatedEntry,
        );

      if (difference > 0.0001) {
        errors.entry_price =
          `Strategy entry mismatch. Submitted ${submittedEntry.toFixed(
            4,
          )}, calculated ${calculatedEntry.toFixed(
            4,
          )}.`;
      }
    }
  }

  return errors;
}

/* -------------------------------------------------
   CLEANUP HELPER
------------------------------------------------- */
async function deleteCreatedSignal({
  signalId,
}: {
  signalId: string;
}) {
  const supabase =
    createSupabaseAdminClient();

  const {
    data: executions,
    error: executionsLookupError,
  } = await supabase
    .from("signal_executions")
    .select("id")
    .eq("signal_id", signalId);

  if (executionsLookupError) {
    console.error(
      "createSignal cleanup: execution lookup failed",
      executionsLookupError,
    );
  }

  const executionIds =
    executions?.map(
      (execution) =>
        execution.id,
    ) ?? [];

  if (
    executionIds.length > 0
  ) {
    const {
      error: fillsDeleteError,
    } = await supabase
      .from("execution_fills")
      .delete()
      .in(
        "execution_id",
        executionIds,
      );

    if (fillsDeleteError) {
      console.error(
        "createSignal cleanup: execution-fill deletion failed",
        fillsDeleteError,
      );
    }
  }

  const {
    error: executionDeleteError,
  } = await supabase
    .from("signal_executions")
    .delete()
    .eq("signal_id", signalId);

  if (executionDeleteError) {
    console.error(
      "createSignal cleanup: execution deletion failed",
      executionDeleteError,
    );
  }

  const {
    error: rulesDeleteError,
  } = await supabase
    .from("signal_execution_rules")
    .delete()
    .eq("signal_id", signalId);

  if (rulesDeleteError) {
    console.error(
      "createSignal cleanup: rule deletion failed",
      rulesDeleteError,
    );
  }

  const {
    error: legsDeleteError,
  } = await supabase
    .from("signal_option_legs")
    .delete()
    .eq("signal_id", signalId);

  if (legsDeleteError) {
    console.error(
      "createSignal cleanup: option-leg deletion failed",
      legsDeleteError,
    );
  }

  const {
    error: signalDeleteError,
  } = await supabase
    .from("signals")
    .delete()
    .eq("id", signalId);

  if (signalDeleteError) {
    console.error(
      "createSignal cleanup: signal deletion failed",
      signalDeleteError,
    );
  }
}

/* -------------------------------------------------
   CREATE SIGNAL
------------------------------------------------- */
export async function createSignal(
  input: CreateSignalInput,
): Promise<CreateSignalResult> {
  const normalizedUnderlying =
    normalizeTicker(
      input.underlying,
    );

  const normalizedStrategyType =
    input.instrument_type === "OPTION"
      ? normalizeStrategyType(
          input.strategy_type,
        )
      : "STOCK";

  const optionLegs =
    input.instrument_type ===
    "OPTION"
      ? normalizeOptionLegs(
          input.option_legs,
        )
      : [];

  const strategyEntry =
    input.instrument_type ===
      "OPTION" &&
    optionLegs.length > 0
      ? calculateStrategyEntry(
          optionLegs,
        )
      : null;

  const errors =
    validateCreateSignalInput({
      input,
      optionLegs,
      strategyEntry,
    });

  if (
    Object.keys(errors).length >
    0
  ) {
    return {
      success: false,

      error:
        errors._form ??
        errors.entry_price ??
        errors.option_legs ??
        "Please correct the signal form.",

      errors,
    };
  }

  const template =
    EXECUTION_RULE_TEMPLATES[
      input.trade_style
    ];

  if (
    !template?.rules?.length
  ) {
    return {
      success: false,

      error:
        "Invalid execution style.",

      errors: {
        trade_style:
          "Invalid execution style.",
      },
    };
  }

  const supabase =
    createSupabaseAdminClient();

  const primaryLeg =
    optionLegs[0] ?? null;

  const openAction: OptionLegAction =
    input.instrument_type === "OPTION"
      ? primaryLeg?.action ??
        (
          input.action === "SELL"
            ? "SELL_TO_OPEN"
            : "BUY_TO_OPEN"
        )
      : input.action === "SELL"
        ? "SELL_TO_OPEN"
        : "BUY_TO_OPEN";

  /*
   * For options, the server-calculated strategy entry is
   * authoritative. Never replace this value with the premium
   * from the first option leg.
   */
  const resolvedEntryPrice =
    input.instrument_type ===
      "OPTION" &&
    strategyEntry
      ? strategyEntry.absoluteNetEntry
      : roundPrice(
          input.entry_price,
        );

  const resolvedOptionType =
    input.instrument_type ===
    "OPTION"
      ? primaryLeg
          ?.option_type ??
        input.option_type ??
        null
      : null;

  const resolvedStrikePrice =
    input.instrument_type ===
    "OPTION"
      ? primaryLeg
          ?.strike_price ??
        input.strike_price ??
        null
      : null;

  const resolvedExpirationDate =
    input.instrument_type ===
    "OPTION"
      ? primaryLeg
          ?.expiration_date ??
        input.expiration_date ??
        null
      : null;

  /* -------------------------------------------------
     CENTRALIZED TRADE SUMMARY
  ------------------------------------------------- */
  const tradeSummary =
    buildTradeSummary({
      symbol:
        normalizedUnderlying,

      underlying:
        normalizedUnderlying,

      instrument_type:
        input.instrument_type,

      trade_style:
        normalizedStrategyType,

      execution_style:
        input.trade_style,

      action:
        input.action,

      open_action:
        openAction,

      entry_price:
        resolvedEntryPrice,

      option_type:
        resolvedOptionType,

      strike_price:
        resolvedStrikePrice,

      expiration_date:
        resolvedExpirationDate,

      contracts:
        input.instrument_type ===
        "OPTION"
          ? undefined
          : null,

      option_legs:
        optionLegs as TradeSummaryOptionLegInput[],
    });

  const strategyContracts =
    input.instrument_type ===
    "OPTION"
      ? tradeSummary.strategyContracts
      : null;

  /* -------------------------------------------------
     INSERT SIGNAL
  ------------------------------------------------- */
  const {
    data: signal,
    error: signalInsertError,
  } = await supabase
    .from("signals")
    .insert({
      asset:
        normalizedUnderlying,

      underlying:
        normalizedUnderlying,

      instrument_type:
        input.instrument_type,

      action:
        input.action,

      open_action:
        openAction,

      entry_price:
        resolvedEntryPrice,

      /*
       * Preserve the legacy price column for older components
       * that still use price as an entry fallback.
       */
      price:
        resolvedEntryPrice,

      underlying_entry_price:
        input.underlying_entry_price,

      option_type:
        resolvedOptionType,

      strike_price:
        resolvedStrikePrice,

      expiration_date:
        resolvedExpirationDate,

      contracts:
        input.instrument_type ===
        "OPTION"
          ? strategyContracts
          : null,

      quantity:
        input.instrument_type ===
        "OPTION"
          ? strategyContracts
          : null,

      shares:
        input.instrument_type ===
        "STOCK"
          ? 1
          : null,

      confidence:
        input.confidence,

      /*
       * This remains the execution timeframe used by the
       * automatic execution-rule templates.
       *
       * The actual option strategy is derived from
       * signal_option_legs by buildTradeSummary and
       * detectTradeStyle.
       */
      trade_style:
        input.trade_style,

      strategy_type:
        normalizedStrategyType,

      status:
        "Active",
    })
    .select(
      `
      id,
      asset,
      underlying,
      instrument_type,
      action,
      open_action,
      entry_price,
      underlying_entry_price,
      option_type,
      strike_price,
      expiration_date,
      contracts,
      quantity,
      confidence,
      trade_style,
      strategy_type,
      status
    `,
    )
    .single();

  if (
    signalInsertError ||
    !signal
  ) {
    console.error(
      "Create signal failed",
      signalInsertError,
    );

    return {
      success: false,

      error:
        "Failed to create signal. Please try again.",

      errors: {
        _form:
          "Failed to create signal. Please try again.",
      },
    };
  }

  /* -------------------------------------------------
     INSERT OPTION LEGS
  ------------------------------------------------- */
  if (
    input.instrument_type ===
    "OPTION"
  ) {
    const optionLegRows =
      optionLegs.map((leg) => ({
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
          null,
      }));

    const {
      data: insertedLegs,
      error: optionLegInsertError,
    } = await supabase
      .from("signal_option_legs")
      .insert(optionLegRows)
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
      );

    if (
      optionLegInsertError ||
      !insertedLegs ||
      insertedLegs.length !==
        optionLegRows.length
    ) {
      console.error(
        "Create signal option-leg insert failed",
        optionLegInsertError,
      );

      await deleteCreatedSignal({
        signalId:
          signal.id,
      });

      return {
        success: false,

        error:
          "Failed to save all option legs.",

        errors: {
          _form:
            "The signal could not be created because its option legs failed to save.",
        },
      };
    }
  }

  /* -------------------------------------------------
     APPLY EXECUTION RULE TEMPLATE
  ------------------------------------------------- */
  try {
    await applyExecutionTemplate(
      signal.id,
      input.trade_style,
      template.rules,
    );
  } catch (error) {
    console.error(
      "Execution rule template failed",
      error,
    );

    await deleteCreatedSignal({
      signalId:
        signal.id,
    });

    return {
      success: false,

      error:
        "Execution rules failed to apply.",

      errors: {
        _form:
          "The signal could not be completed because its execution rules failed to apply.",
      },
    };
  }

  /* -------------------------------------------------
     SEND DISCORD ALERT
  ------------------------------------------------- */
  try {
    await sendSignalToDiscord({
      asset:
        normalizedUnderlying,

      underlying:
        normalizedUnderlying,

      action:
        input.action,

      open_action:
        openAction,

      instrument_type:
        input.instrument_type,

      entry_price:
        resolvedEntryPrice,

      underlying_entry_price:
        input.underlying_entry_price,

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

      /*
       * Correct separation:
       *
       * trade_style = execution timeframe
       * strategy_type = strategy structure
       */
      trade_style:
        input.trade_style,

      execution_style:
        input.trade_style,

      strategy_type:
        normalizedStrategyType,

      /*
       * Centralized strategy-entry metadata.
       *
       * buildTradeSummary uses signed cash flow:
       * debit  = negative
       * credit = positive
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
    });
  } catch (error) {
    console.error(
      "Discord post failed, but signal was created:",
      error,
    );
  }

  return {
    success: true,

    id:
      signal.id,

    strategy_type:
      normalizedStrategyType,

    execution_style:
      input.trade_style,

    strategy_entry:
      input.instrument_type ===
        "OPTION" &&
      strategyEntry
        ? {
            type:
              strategyEntry.type,

            net_entry:
              strategyEntry.absoluteNetEntry,

            signed_net_entry:
              strategyEntry.signedNetEntry,

            total_debit:
              strategyEntry.totalDebit,

            total_credit:
              strategyEntry.totalCredit,
          }
        : null,
  };
}