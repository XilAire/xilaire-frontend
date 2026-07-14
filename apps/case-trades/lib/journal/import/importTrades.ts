import type { SupabaseClient } from "@supabase/supabase-js";

import {
  checkDuplicateTrades,
  type DuplicateTradeCheckResult,
  type ExistingJournalTradeForDuplicateCheck,
} from "@/lib/journal/import/duplicateTrade";
import type { ParsedBrokerTrade } from "@/lib/journal/import/normalizeTrade";
import {
  getGroupedTradeOptionLegInputs,
  isGroupedBrokerStrategyTrade,
  type GroupedBrokerStrategyTrade,
} from "@/lib/journal/import/groupStrategies";
import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

export type JournalImportResult = {
  success: boolean;
  imported: number;
  skipped: number;
  duplicates: DuplicateTradeCheckResult[];

  /**
   * Non-fatal notices are returned in errors for backward compatibility
   * with the existing server action and import page.
   */
  errors: string[];
};

type InvalidTradeResult = {
  trade: GroupedBrokerStrategyTrade;
  index: number;
  missingFields: string[];
};

type JournalTradeInsertRow = {
  user_id: string;

  symbol: string;
  instrument_type: "STOCK" | "OPTION";

  side: "BUY" | "SELL";

  /**
   * New strategy architecture.
   */
  open_action: string;
  strategy_type: string;
  trade_style: string;

  option_type: string | null;
  strike_price: number | null;
  expiration_date: string | null;

  entry_date: string | null;
  exit_date: string | null;

  entry_price: number | null;
  exit_price: number | null;

  quantity: number;

  profit_loss: number | null;
  profit_loss_pct: number | null;

  /**
   * Grouped strategy-level metadata.
   *
   * These columns are inserted when present in journal_trades. If the
   * migration has not been applied, the importer retries with the legacy
   * schema and preserves this data inside notes.
   */
  strategy_entry_type: string | null;
  signed_strategy_entry: number | null;
  strategy_entry_price: number | null;

  total_debit: number | null;
  total_credit: number | null;

  signed_strategy_exit: number | null;
  strategy_exit_price: number | null;

  total_exit_debit: number | null;
  total_exit_credit: number | null;

  strategy_contracts: number | null;
  total_contracts: number | null;
  leg_count: number;

  /**
   * JSON representation of all grouped option legs.
   */
  option_legs: TradeSummaryOptionLegInput[] | null;

  notes: string | null;
};

type LegacyJournalTradeInsertRow = {
  user_id: string;
  symbol: string;
  instrument_type: "STOCK" | "OPTION";
  side: "BUY" | "SELL";
  entry_date: string | null;
  exit_date: string | null;
  entry_price: number | null;
  exit_price: number | null;
  quantity: number;
  profit_loss: number | null;
  profit_loss_pct: number | null;
  notes: string | null;
};

function asParsedBrokerTrades(
  trades: GroupedBrokerStrategyTrade[],
): ParsedBrokerTrade[] {
  return trades;
}

function isBlank(
  value:
    | string
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return true;
  }

  if (
    typeof value === "number"
  ) {
    return !Number.isFinite(value);
  }

  return (
    value.trim().length === 0
  );
}

function normalizePositiveNumber(
  value:
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function validateTradeForImport(
  trade: GroupedBrokerStrategyTrade,
  index: number,
): InvalidTradeResult | null {
  const missingFields:
    string[] = [];

  if (
    isBlank(
      trade.symbol,
    )
  ) {
    missingFields.push(
      "symbol",
    );
  }

  if (
    isBlank(
      trade.instrument_type,
    )
  ) {
    missingFields.push(
      "instrument_type",
    );
  }

  if (
    isBlank(
      trade.side,
    )
  ) {
    missingFields.push(
      "side",
    );
  }

  /*
   * Matched and open-only trades normally contain entry_date.
   * Close-only broker rows may only contain exit_date, so require
   * at least one lifecycle date rather than entry_date specifically.
   */
  if (
    isBlank(
      trade.entry_date,
    ) &&
    isBlank(
      trade.exit_date,
    )
  ) {
    missingFields.push(
      "entry_date_or_exit_date",
    );
  }

  if (
    isBlank(
      trade.quantity,
    ) ||
    Number(
      trade.quantity,
    ) <= 0
  ) {
    missingFields.push(
      "quantity",
    );
  }

  if (
    trade.instrument_type ===
      "OPTION" &&
    (
      !Array.isArray(
        trade.option_legs,
      ) ||
      trade.option_legs.length ===
        0
    )
  ) {
    missingFields.push(
      "option_legs",
    );
  }

  if (
    trade.instrument_type ===
      "OPTION" &&
    isBlank(
      trade.strategy_type,
    )
  ) {
    missingFields.push(
      "strategy_type",
    );
  }

  if (
    missingFields.length ===
    0
  ) {
    return null;
  }

  return {
    trade,
    index,
    missingFields,
  };
}

function formatInvalidTradeError(
  invalidTrade:
    InvalidTradeResult,
) {
  const tradeNumber =
    invalidTrade.index + 1;

  const trade =
    invalidTrade.trade;

  return [
    `Trade #${tradeNumber} is missing required field(s): ${invalidTrade.missingFields.join(
      ", ",
    )}.`,
    `Symbol: ${trade.symbol || "—"}.`,
    `Instrument: ${trade.instrument_type || "—"}.`,
    `Strategy: ${trade.strategy_type || "—"}.`,
    `Execution Style: ${trade.trade_style || "—"}.`,
    `Side: ${trade.side || "—"}.`,
    `Open Action: ${trade.open_action || "—"}.`,
    `Option Type: ${trade.option_type || "—"}.`,
    `Strike: ${trade.strike_price ?? "—"}.`,
    `Expiration: ${trade.expiration_date || "—"}.`,
    `Option Legs: ${trade.leg_count ?? 0}.`,
    `Entry Date: ${trade.entry_date || "—"}.`,
    `Exit Date: ${trade.exit_date || "—"}.`,
    `Quantity: ${trade.quantity ?? "—"}.`,
  ].join(" ");
}

function buildOptionLegs(
  trade: GroupedBrokerStrategyTrade,
): TradeSummaryOptionLegInput[] {
  if (
    trade.instrument_type !==
    "OPTION"
  ) {
    return [];
  }

  if (
    isGroupedBrokerStrategyTrade(
      trade,
    ) &&
    trade.option_legs.length >
      0
  ) {
    return getGroupedTradeOptionLegInputs(
      trade,
    );
  }

  return [
    {
      leg_order:
        1,

      action:
        trade.open_action,

      option_type:
        trade.option_type,

      strike_price:
        trade.strike_price,

      expiration_date:
        trade.expiration_date,

      contracts:
        trade.quantity,

      entry_price:
        trade.entry_price,

      exit_price:
        trade.exit_price,
    },
  ];
}

function buildJournalTradeInsertRow({
  userId,
  trade,
}: {
  userId: string;
  trade: GroupedBrokerStrategyTrade;
}): JournalTradeInsertRow {
  const optionLegs =
    buildOptionLegs(
      trade,
    );

  const tradeSummary =
    buildTradeSummary({
      symbol:
        trade.symbol,

      instrument_type:
        trade.instrument_type,

      strategy_type:
        trade.strategy_type,

      execution_style:
        trade.trade_style,

      action:
        trade.side,

      open_action:
        trade.open_action,

      entry_price:
        trade.entry_price,

      exit_price:
        trade.exit_price,

      quantity:
        trade.quantity,

      contracts:
        trade.instrument_type ===
        "OPTION"
          ? trade.quantity
          : undefined,

      option_type:
        trade.option_type,

      strike_price:
        trade.strike_price,

      expiration_date:
        trade.expiration_date,

      option_legs:
        optionLegs,
    });

  const quantity =
    normalizePositiveNumber(
      trade.quantity,
    ) ?? 1;

  const notes = [
    trade.notes,

    `Broker: ${trade.broker}`,

    `Detected Strategy: ${tradeSummary.strategyTypeLabel}`,

    `Execution Style: ${
      tradeSummary.executionStyle ??
      trade.trade_style
    }`,

    trade.instrument_type ===
      "OPTION"
      ? `Option Legs: ${tradeSummary.legCount}`
      : null,

    tradeSummary.debitCredit !==
      "UNKNOWN"
      ? `Entry Type: ${tradeSummary.debitCredit}`
      : null,

    tradeSummary.netEntryAmount !==
      null
      ? `Net Entry: ${tradeSummary.netEntryAmount.toFixed(
          2,
        )}`
      : null,

    trade.instrument_type ===
      "OPTION"
      ? `Premium Paid: ${tradeSummary.totalPaid.toFixed(
          2,
        )}`
      : null,

    trade.instrument_type ===
      "OPTION"
      ? `Premium Received: ${tradeSummary.totalReceived.toFixed(
          2,
        )}`
      : null,

    trade.grouped
      ? `Grouped Strategy: Yes`
      : null,
  ]
    .filter(
      (
        value,
      ): value is string =>
        Boolean(
          value?.trim(),
        ),
    )
    .join(" | ");

  return {
    user_id:
      userId,

    symbol:
      tradeSummary.symbol,

    instrument_type:
      trade.instrument_type,

    side:
      trade.side,

    open_action:
      trade.open_action,

    strategy_type:
      tradeSummary.strategyType,

    trade_style:
      tradeSummary.executionStyle ??
      trade.trade_style,

    option_type:
      trade.option_type,

    strike_price:
      trade.strike_price,

    expiration_date:
      trade.expiration_date,

    entry_date:
      trade.entry_date,

    exit_date:
      trade.exit_date,

    entry_price:
      trade.strategy_entry_price ??
      tradeSummary.netEntryAmount ??
      trade.entry_price,

    exit_price:
      trade.strategy_exit_price ??
      tradeSummary.netExitAmount ??
      trade.exit_price,

    quantity,

    profit_loss:
      trade.strategy_profit_loss_dollars ??
      trade.profit_loss ??
      tradeSummary.netPnlDollars,

    profit_loss_pct:
      trade.strategy_return_pct ??
      trade.profit_loss_pct ??
      tradeSummary.returnPct,

    strategy_entry_type:
      trade.strategy_entry_type ??
      tradeSummary.debitCredit,

    signed_strategy_entry:
      trade.signed_strategy_entry ??
      tradeSummary.netEntry,

    strategy_entry_price:
      trade.strategy_entry_price ??
      tradeSummary.netEntryAmount,

    total_debit:
      trade.total_debit ??
      tradeSummary.totalPaid,

    total_credit:
      trade.total_credit ??
      tradeSummary.totalReceived,

    signed_strategy_exit:
      trade.signed_strategy_exit ??
      tradeSummary.netExit,

    strategy_exit_price:
      trade.strategy_exit_price ??
      tradeSummary.netExitAmount,

    total_exit_debit:
      trade.total_exit_debit ??
      tradeSummary.totalExitPaid,

    total_exit_credit:
      trade.total_exit_credit ??
      tradeSummary.totalExitReceived,

    strategy_contracts:
      trade.strategy_contracts ??
      tradeSummary.strategyContracts,

    total_contracts:
      trade.total_contracts ??
      tradeSummary.totalContracts,

    leg_count:
      trade.leg_count ??
      tradeSummary.legCount,

    option_legs:
      optionLegs.length > 0
        ? optionLegs
        : null,

    notes:
      notes ||
      null,
  };
}

function toLegacyInsertRow(
  row: JournalTradeInsertRow,
): LegacyJournalTradeInsertRow {
  return {
    user_id:
      row.user_id,

    symbol:
      row.symbol,

    instrument_type:
      row.instrument_type,

    side:
      row.side,

    entry_date:
      row.entry_date,

    exit_date:
      row.exit_date,

    entry_price:
      row.entry_price,

    exit_price:
      row.exit_price,

    quantity:
      row.quantity,

    profit_loss:
      row.profit_loss,

    profit_loss_pct:
      row.profit_loss_pct,

    /*
     * Preserve strategy metadata in notes when the database has not yet
     * received the new journal_trades columns.
     */
    notes: [
      row.notes,

      `Open Action: ${row.open_action}`,

      `Strategy Type: ${row.strategy_type}`,

      `Execution Style: ${row.trade_style}`,

      row.option_type
        ? `Option Type: ${row.option_type}`
        : null,

      row.strike_price !==
        null
        ? `Strike: ${row.strike_price}`
        : null,

      row.expiration_date
        ? `Expiration: ${row.expiration_date}`
        : null,

      row.strategy_entry_type
        ? `Entry Type: ${row.strategy_entry_type}`
        : null,

      row.strategy_entry_price !==
        null
        ? `Strategy Entry: ${row.strategy_entry_price}`
        : null,

      row.total_debit !==
        null
        ? `Total Debit: ${row.total_debit}`
        : null,

      row.total_credit !==
        null
        ? `Total Credit: ${row.total_credit}`
        : null,

      `Leg Count: ${row.leg_count}`,

      row.option_legs
        ? `Option Legs JSON: ${JSON.stringify(
            row.option_legs,
          )}`
        : null,
    ]
      .filter(
        (
          value,
        ): value is string =>
          Boolean(
            value?.trim(),
          ),
      )
      .join(" | "),
  };
}

function isMissingColumnError(
  message:
    string | null | undefined,
) {
  const normalized =
    String(message ?? "")
      .toLowerCase();

  return (
    normalized.includes(
      "column",
    ) &&
    (
      normalized.includes(
        "does not exist",
      ) ||
      normalized.includes(
        "schema cache",
      ) ||
      normalized.includes(
        "could not find",
      )
    )
  );
}

async function insertJournalTrades({
  supabase,
  rows,
}: {
  supabase:
    SupabaseClient;
  rows:
    JournalTradeInsertRow[];
}) {
  const enrichedInsert =
    await supabase
      .from(
        "journal_trades",
      )
      .insert(rows);

  if (
    !enrichedInsert.error
  ) {
    return {
      error:
        null,
      usedLegacyFallback:
        false,
    };
  }

  /*
   * Deployment-safe compatibility:
   *
   * If the journal_trades migration has not yet added strategy_type,
   * trade_style, open_action, and option metadata columns, retry using
   * the legacy schema and preserve the new metadata inside notes.
   */
  if (
    !isMissingColumnError(
      enrichedInsert.error.message,
    )
  ) {
    return {
      error:
        enrichedInsert.error,
      usedLegacyFallback:
        false,
    };
  }

  const legacyRows =
    rows.map(
      toLegacyInsertRow,
    );

  const legacyInsert =
    await supabase
      .from(
        "journal_trades",
      )
      .insert(
        legacyRows,
      );

  return {
    error:
      legacyInsert.error,

    usedLegacyFallback:
      true,
  };
}

export async function importParsedBrokerTrades({
  supabase,
  userId,
  trades,
}: {
  supabase:
    SupabaseClient;
  userId:
    string;
  trades:
    GroupedBrokerStrategyTrade[];
}): Promise<JournalImportResult> {
  const errors:
    string[] = [];

  if (!userId) {
    return {
      success:
        false,
      imported:
        0,
      skipped:
        0,
      duplicates:
        [],
      errors:
        ["Missing user ID."],
    };
  }

  if (
    !trades.length
  ) {
    return {
      success:
        false,
      imported:
        0,
      skipped:
        0,
      duplicates:
        [],
      errors:
        [
          "There are no trades to import.",
        ],
    };
  }

  const {
    data:
      existingTradesData,
    error:
      existingTradesError,
  } =
    await supabase
      .from(
        "journal_trades",
      )
      .select(
        `
        id,
        symbol,
        instrument_type,
        strategy_type,
        trade_style,
        side,
        open_action,
        option_type,
        strike_price,
        expiration_date,
        entry_date,
        exit_date,
        entry_price,
        exit_price,
        quantity,
        profit_loss,
        profit_loss_pct
        `,
      )
      .eq(
        "user_id",
        userId,
      );

  let existingTrades:
    ExistingJournalTradeForDuplicateCheck[];

  if (
    existingTradesError &&
    isMissingColumnError(
      existingTradesError.message,
    )
  ) {
    const legacyQuery =
      await supabase
        .from(
          "journal_trades",
        )
        .select(
          `
          id,
          symbol,
          instrument_type,
          side,
          entry_date,
          exit_date,
          entry_price,
          exit_price,
          quantity,
          profit_loss,
          profit_loss_pct
          `,
        )
        .eq(
          "user_id",
          userId,
        );

    if (
      legacyQuery.error
    ) {
      return {
        success:
          false,
        imported:
          0,
        skipped:
          0,
        duplicates:
          [],
        errors: [
          `Failed to check existing journal trades: ${legacyQuery.error.message}`,
        ],
      };
    }

    existingTrades =
      (
        legacyQuery.data ??
        []
      ) as ExistingJournalTradeForDuplicateCheck[];
  } else if (
    existingTradesError
  ) {
    return {
      success:
        false,
      imported:
        0,
      skipped:
        0,
      duplicates:
        [],
      errors: [
        `Failed to check existing journal trades: ${existingTradesError.message}`,
      ],
    };
  } else {
    existingTrades =
      (
        existingTradesData ??
        []
      ) as ExistingJournalTradeForDuplicateCheck[];
  }

  /*
   * GroupedBrokerStrategyTrade extends ParsedBrokerTrade, so the existing
   * duplicate engine can compare the grouped strategy records directly.
   */
  const duplicateResults =
    checkDuplicateTrades({
      importedTrades:
        asParsedBrokerTrades(
          trades,
        ),
      existingTrades,
    });

  const duplicateTrades =
    duplicateResults.filter(
      (result) =>
        result.duplicate,
    );

  const newTrades =
    duplicateResults
      .filter(
        (result) =>
          !result.duplicate,
      )
      .map(
        (result) =>
          result.trade as GroupedBrokerStrategyTrade,
      );

  if (
    newTrades.length ===
    0
  ) {
    return {
      success:
        true,
      imported:
        0,
      skipped:
        duplicateTrades.length,
      duplicates:
        duplicateTrades,
      errors,
    };
  }

  const invalidTrades =
    newTrades
      .map(
        (
          trade,
          index,
        ) =>
          validateTradeForImport(
            trade,
            index,
          ),
      )
      .filter(
        (
          result,
        ): result is InvalidTradeResult =>
          result !== null,
      );

  if (
    invalidTrades.length >
    0
  ) {
    return {
      success:
        false,
      imported:
        0,
      skipped:
        duplicateTrades.length +
        invalidTrades.length,
      duplicates:
        duplicateTrades,
      errors:
        invalidTrades.map(
          formatInvalidTradeError,
        ),
    };
  }

  const rows =
    newTrades.map(
      (trade) =>
        buildJournalTradeInsertRow({
          userId,
          trade,
        }),
    );

  const insertResult =
    await insertJournalTrades({
      supabase,
      rows,
    });

  if (
    insertResult.error
  ) {
    return {
      success:
        false,
      imported:
        0,
      skipped:
        duplicateTrades.length,
      duplicates:
        duplicateTrades,
      errors: [
        `Failed to import broker trades: ${insertResult.error.message}`,
      ],
    };
  }

  if (
    insertResult.usedLegacyFallback
  ) {
    errors.push(
      "Trades were imported using the legacy journal_trades schema. Strategy and option metadata were preserved in notes. Apply the journal strategy migration to store these values in dedicated columns.",
    );
  }

  return {
    success:
      true,
    imported:
      rows.length,
    skipped:
      duplicateTrades.length,
    duplicates:
      duplicateTrades,
    errors,
  };
}
