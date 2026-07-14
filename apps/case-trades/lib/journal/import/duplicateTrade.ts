import type { ParsedBrokerTrade } from "@/lib/journal/import/normalizeTrade";

export type ExistingJournalTradeForDuplicateCheck = {
  id: string;

  symbol: string | null;
  instrument_type: string | null;

  /**
   * Strategy structure:
   * LONG_CALL, IRON_CONDOR, STOCK, etc.
   */
  strategy_type?: string | null;

  /**
   * Execution style:
   * SCALP, SWING, LEAP, IMPORT, etc.
   */
  trade_style?: string | null;

  side: string | null;
  open_action?: string | null;

  option_type?: string | null;
  strike_price?: number | string | null;
  expiration_date?: string | null;

  entry_date: string | null;
  exit_date: string | null;

  entry_price: number | string | null;
  exit_price: number | string | null;

  quantity: number | string | null;

  profit_loss: number | string | null;
  profit_loss_pct: number | string | null;
};

export type DuplicateTradeCheckResult = {
  trade: ParsedBrokerTrade;
  duplicate: boolean;
  duplicateTradeId: string | null;
  reason: string | null;
};

function normalizeString(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
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
          .replace(/\$/g, "")
          .replace(/,/g, "")
          .replace(/%/g, "")
          .replace(/\(/g, "-")
          .replace(/\)/g, "")
          .trim(),
      );

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function normalizeDate(
  value: string | null | undefined,
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(
      0,
      10,
    );
}

function numbersMatch(
  left:
    | number
    | string
    | null
    | undefined,
  right:
    | number
    | string
    | null
    | undefined,
  tolerance = 0.0001,
) {
  const leftNumber =
    normalizeNumber(left);

  const rightNumber =
    normalizeNumber(right);

  if (
    leftNumber === null &&
    rightNumber === null
  ) {
    return true;
  }

  if (
    leftNumber === null ||
    rightNumber === null
  ) {
    return false;
  }

  return (
    Math.abs(
      leftNumber -
        rightNumber,
    ) <= tolerance
  );
}

function datesMatch(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  return (
    normalizeDate(left) ===
    normalizeDate(right)
  );
}

function optionalStringsMatch(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  const normalizedLeft =
    normalizeString(left);

  const normalizedRight =
    normalizeString(right);

  /*
   * Historical journal rows may not contain the new strategy and
   * option metadata fields. A missing value on either side should not
   * automatically prevent duplicate detection.
   */
  if (
    !normalizedLeft ||
    !normalizedRight
  ) {
    return true;
  }

  return (
    normalizedLeft ===
    normalizedRight
  );
}

function optionalNumbersMatch(
  left:
    | number
    | string
    | null
    | undefined,
  right:
    | number
    | string
    | null
    | undefined,
  tolerance = 0.0001,
) {
  const leftNumber =
    normalizeNumber(left);

  const rightNumber =
    normalizeNumber(right);

  /*
   * Preserve compatibility with legacy records that do not have
   * strike data while still comparing strikes when both are present.
   */
  if (
    leftNumber === null ||
    rightNumber === null
  ) {
    return true;
  }

  return (
    Math.abs(
      leftNumber -
        rightNumber,
    ) <= tolerance
  );
}

function buildOptionIdentityMatches({
  importedTrade,
  existingTrade,
}: {
  importedTrade:
    ParsedBrokerTrade;
  existingTrade:
    ExistingJournalTradeForDuplicateCheck;
}) {
  if (
    normalizeString(
      importedTrade.instrument_type,
    ) !== "OPTION"
  ) {
    return true;
  }

  const optionTypeMatches =
    optionalStringsMatch(
      importedTrade.option_type,
      existingTrade.option_type,
    );

  const strikeMatches =
    optionalNumbersMatch(
      importedTrade.strike_price,
      existingTrade.strike_price,
    );

  const expirationMatches =
    optionalStringsMatch(
      normalizeDate(
        importedTrade.expiration_date,
      ),
      normalizeDate(
        existingTrade.expiration_date,
      ),
    );

  return (
    optionTypeMatches &&
    strikeMatches &&
    expirationMatches
  );
}

function isDuplicateTrade({
  importedTrade,
  existingTrade,
}: {
  importedTrade:
    ParsedBrokerTrade;
  existingTrade:
    ExistingJournalTradeForDuplicateCheck;
}) {
  const symbolMatches =
    normalizeString(
      importedTrade.symbol,
    ) ===
    normalizeString(
      existingTrade.symbol,
    );

  const instrumentMatches =
    normalizeString(
      importedTrade.instrument_type,
    ) ===
    normalizeString(
      existingTrade.instrument_type,
    );

  const sideMatches =
    normalizeString(
      importedTrade.side,
    ) ===
    normalizeString(
      existingTrade.side,
    );

  const openActionMatches =
    optionalStringsMatch(
      importedTrade.open_action,
      existingTrade.open_action,
    );

  const strategyMatches =
    optionalStringsMatch(
      importedTrade.strategy_type,
      existingTrade.strategy_type,
    );

  const executionStyleMatches =
    optionalStringsMatch(
      importedTrade.trade_style,
      existingTrade.trade_style,
    );

  const optionIdentityMatches =
    buildOptionIdentityMatches({
      importedTrade,
      existingTrade,
    });

  const entryDateMatches =
    datesMatch(
      importedTrade.entry_date,
      existingTrade.entry_date,
    );

  const exitDateMatches =
    datesMatch(
      importedTrade.exit_date,
      existingTrade.exit_date,
    );

  const quantityMatches =
    numbersMatch(
      importedTrade.quantity,
      existingTrade.quantity,
    );

  const entryPriceMatches =
    numbersMatch(
      importedTrade.entry_price,
      existingTrade.entry_price,
    );

  const exitPriceMatches =
    numbersMatch(
      importedTrade.exit_price,
      existingTrade.exit_price,
    );

  const exactLifecycleMatch =
    symbolMatches &&
    instrumentMatches &&
    sideMatches &&
    openActionMatches &&
    strategyMatches &&
    executionStyleMatches &&
    optionIdentityMatches &&
    entryDateMatches &&
    exitDateMatches &&
    quantityMatches &&
    entryPriceMatches &&
    exitPriceMatches;

  if (
    exactLifecycleMatch
  ) {
    return {
      duplicate:
        true,

      reason:
        normalizeString(
          importedTrade.instrument_type,
        ) === "OPTION"
          ? "Exact option contract lifecycle match."
          : "Exact trade match.",
    };
  }

  const pnlMatches =
    numbersMatch(
      importedTrade.profit_loss,
      existingTrade.profit_loss,
      0.01,
    );

  const pnlPctMatches =
    numbersMatch(
      importedTrade.profit_loss_pct,
      existingTrade.profit_loss_pct,
      0.01,
    );

  const likelyBrokerExportMatch =
    symbolMatches &&
    instrumentMatches &&
    sideMatches &&
    optionIdentityMatches &&
    quantityMatches &&
    entryDateMatches &&
    exitDateMatches &&
    pnlMatches &&
    pnlPctMatches;

  if (
    likelyBrokerExportMatch
  ) {
    return {
      duplicate:
        true,

      reason:
        normalizeString(
          importedTrade.instrument_type,
        ) === "OPTION"
          ? "Likely duplicate option broker export row."
          : "Likely duplicate broker export row.",
    };
  }

  return {
    duplicate:
      false,

    reason:
      null,
  };
}

function findDuplicateAgainstExistingTrades({
  trade,
  existingTrades,
}: {
  trade: ParsedBrokerTrade;
  existingTrades:
    ExistingJournalTradeForDuplicateCheck[];
}) {
  for (
    const existingTrade of
    existingTrades
  ) {
    const result =
      isDuplicateTrade({
        importedTrade:
          trade,

        existingTrade,
      });

    if (
      result.duplicate
    ) {
      return {
        duplicate:
          true,

        duplicateTradeId:
          existingTrade.id,

        reason:
          result.reason,
      };
    }
  }

  return {
    duplicate:
      false,

    duplicateTradeId:
      null,

    reason:
      null,
  };
}

function findDuplicateWithinImportBatch({
  trade,
  priorTrades,
}: {
  trade: ParsedBrokerTrade;
  priorTrades:
    ParsedBrokerTrade[];
}) {
  const syntheticExistingTrades =
    priorTrades.map(
      (
        priorTrade,
        index,
      ): ExistingJournalTradeForDuplicateCheck => ({
        id:
          `import-batch-${index}`,

        symbol:
          priorTrade.symbol,

        instrument_type:
          priorTrade.instrument_type,

        strategy_type:
          priorTrade.strategy_type,

        trade_style:
          priorTrade.trade_style,

        side:
          priorTrade.side,

        open_action:
          priorTrade.open_action,

        option_type:
          priorTrade.option_type,

        strike_price:
          priorTrade.strike_price,

        expiration_date:
          priorTrade.expiration_date,

        entry_date:
          priorTrade.entry_date,

        exit_date:
          priorTrade.exit_date,

        entry_price:
          priorTrade.entry_price,

        exit_price:
          priorTrade.exit_price,

        quantity:
          priorTrade.quantity,

        profit_loss:
          priorTrade.profit_loss,

        profit_loss_pct:
          priorTrade.profit_loss_pct,
      }),
    );

  return findDuplicateAgainstExistingTrades({
    trade,
    existingTrades:
      syntheticExistingTrades,
  });
}

export function checkDuplicateTrades({
  importedTrades,
  existingTrades,
}: {
  importedTrades:
    ParsedBrokerTrade[];
  existingTrades:
    ExistingJournalTradeForDuplicateCheck[];
}): DuplicateTradeCheckResult[] {
  const processedTrades:
    ParsedBrokerTrade[] = [];

  return importedTrades.map(
    (trade) => {
      const existingDuplicate =
        findDuplicateAgainstExistingTrades({
          trade,
          existingTrades,
        });

      if (
        existingDuplicate.duplicate
      ) {
        processedTrades.push(
          trade,
        );

        return {
          trade,

          duplicate:
            true,

          duplicateTradeId:
            existingDuplicate.duplicateTradeId,

          reason:
            existingDuplicate.reason,
        };
      }

      const batchDuplicate =
        findDuplicateWithinImportBatch({
          trade,
          priorTrades:
            processedTrades,
        });

      processedTrades.push(
        trade,
      );

      if (
        batchDuplicate.duplicate
      ) {
        return {
          trade,

          duplicate:
            true,

          duplicateTradeId:
            null,

          reason:
            "Duplicate row within the current import file.",
        };
      }

      return {
        trade,

        duplicate:
          false,

        duplicateTradeId:
          null,

        reason:
          null,
      };
    },
  );
}
