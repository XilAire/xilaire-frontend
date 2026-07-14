import {
  detectTradeStyle,
  getTradeStyleLabel,
  type TradeStyle,
} from "@/lib/signals/detectTradeStyle";

export type TradeSummaryOptionLegAction =
  | "BUY_TO_OPEN"
  | "SELL_TO_OPEN"
  | "BUY_TO_CLOSE"
  | "SELL_TO_CLOSE"
  | "BUY"
  | "SELL"
  | "LONG"
  | "SHORT"
  | "BTO"
  | "STO"
  | "BTC"
  | "STC";

export type TradeSummaryOptionType = "CALL" | "PUT";

export type TradeSummaryDebitCredit =
  | "DEBIT"
  | "CREDIT"
  | "EVEN"
  | "UNKNOWN";

export type TradeSummaryOptionLegInput = {
  id?: string | null;
  leg_order?: number | null;
  action?: TradeSummaryOptionLegAction | string | null;
  option_type?: TradeSummaryOptionType | string | null;
  optionType?: TradeSummaryOptionType | string | null;
  strike_price?: number | string | null;
  strikePrice?: number | string | null;
  expiration_date?: string | null;
  expirationDate?: string | null;
  contracts?: number | string | null;
  quantity?: number | string | null;
  entry_price?: number | string | null;
  entryPrice?: number | string | null;
  exit_price?: number | string | null;
  exitPrice?: number | string | null;
};

export type BuildTradeSummaryInput = {
  symbol?: string | null;
  asset?: string | null;
  underlying?: string | null;

  instrument_type?: string | null;
  instrumentType?: string | null;

  /**
   * Strategy structure:
   * LONG_CALL, IRON_CONDOR, BULL_PUT_CREDIT_SPREAD, etc.
   */
  strategy_type?: TradeStyle | string | null;
  strategyType?: TradeStyle | string | null;

  /**
   * Legacy strategy field.
   *
   * Newer callers should pass strategy_type/strategyType and reserve
   * trade_style/tradeStyle for execution style compatibility only.
   */
  trade_style?: TradeStyle | string | null;
  tradeStyle?: TradeStyle | string | null;

  execution_style?: string | null;
  executionStyle?: string | null;

  action?: string | null;
  open_action?: string | null;
  openAction?: string | null;

  entry_price?: number | string | null;
  entryPrice?: number | string | null;

  exit_price?: number | string | null;
  exitPrice?: number | string | null;

  contracts?: number | string | null;
  shares?: number | string | null;
  quantity?: number | string | null;

  option_type?: TradeSummaryOptionType | string | null;
  optionType?: TradeSummaryOptionType | string | null;

  strike_price?: number | string | null;
  strikePrice?: number | string | null;

  expiration_date?: string | null;
  expirationDate?: string | null;

  option_legs?: TradeSummaryOptionLegInput[] | null;
  optionLegs?: TradeSummaryOptionLegInput[] | null;
};

export type NormalizedTradeSummaryLeg = {
  id: string | null;
  legOrder: number;

  action:
    | "BTO"
    | "STO"
    | "BTC"
    | "STC"
    | "BUY"
    | "SELL"
    | "LONG"
    | "SHORT";

  actionLabel: string;
  direction: "LONG" | "SHORT" | "UNKNOWN";

  optionType: TradeSummaryOptionType;
  strikePrice: number | null;
  expirationDate: string | null;

  contracts: number;

  entryPrice: number | null;
  exitPrice: number | null;

  signedEntryValue: number | null;
  signedExitValue: number | null;

  entryPremiumPaid: number;
  entryPremiumReceived: number;

  exitPremiumPaid: number;
  exitPremiumReceived: number;

  displayLine: string;
  discordLine: string;
};

export type TradeSummary = {
  symbol: string;

  instrumentType:
    | "OPTION"
    | "STOCK"
    | "UNKNOWN";

  /**
   * Authoritative strategy structure.
   */
  strategyType: string;
  strategyTypeLabel: string;

  /**
   * Legacy compatibility aliases.
   */
  tradeStyle: string;
  tradeStyleLabel: string;

  executionStyle: string | null;
  action: string | null;

  debitCredit: TradeSummaryDebitCredit;

  /**
   * Signed strategy entry:
   *
   * Debit  = negative
   * Credit = positive
   */
  netEntry: number | null;

  /**
   * Absolute strategy entry amount.
   */
  netEntryAmount: number | null;

  /**
   * Signed strategy exit:
   *
   * Proceeds received = positive
   * Premium paid      = negative
   */
  netExit: number | null;

  /**
   * Absolute strategy exit amount.
   */
  netExitAmount: number | null;

  /**
   * Strategy P/L in option premium points.
   *
   * Example:
   * -3.55 entry + 0.11 exit = -3.44
   */
  netPnl: number | null;

  /**
   * Actual option dollar P/L after applying
   * the standard 100-share option multiplier.
   *
   * Example:
   * -3.44 × 100 = -344.00
   */
  netPnlDollars: number | null;

  returnPct: number | null;

  totalPaid: number;
  totalReceived: number;

  totalExitPaid: number;
  totalExitReceived: number;

  totalContracts: number;
  strategyContracts: number;

  totalShares: number | null;

  legCount: number;

  primaryExpirationDate: string | null;
  primaryStrikePrice: number | null;

  legs: NormalizedTradeSummaryLeg[];

  displayLines: string[];
  discordLines: string[];

  title: string;
  subtitle: string;
};

const OPTION_CONTRACT_MULTIPLIER = 100;

/* -------------------------------------------------
   BUILD TRADE SUMMARY
------------------------------------------------- */
export function buildTradeSummary(
  input: BuildTradeSummaryInput,
): TradeSummary {
  const symbol = normalizeSymbol(
    input.symbol ??
      input.asset ??
      input.underlying,
  );

  const instrumentType =
    normalizeInstrumentType(
      input.instrument_type ??
        input.instrumentType,
    );

  const executionStyle =
    resolveExecutionStyle(input);

  const normalizedOptionLegs =
    normalizeOptionLegs(
      input.option_legs ??
        input.optionLegs ??
        [],
      symbol,
    );

  /*
   * Legacy compatibility:
   *
   * Older single-leg signals may not contain rows in
   * signal_option_legs. Build a temporary normalized
   * leg from the original signal columns.
   */
  const fallbackSingleLeg =
    instrumentType === "OPTION" &&
    normalizedOptionLegs.length === 0
      ? buildFallbackSingleOptionLeg(
          input,
          symbol,
        )
      : null;

  const legs = fallbackSingleLeg
    ? [fallbackSingleLeg]
    : normalizedOptionLegs;

  const detectedTradeStyle =
    detectTradeStyle({
      instrumentType,
      legs: legs.map((leg) => ({
        action: leg.action,
        optionType: leg.optionType,
        strikePrice: leg.strikePrice,
        expirationDate:
          leg.expirationDate,
        contracts: leg.contracts,
        entryPrice: leg.entryPrice,
      })),
    });

  const storedTradeStyle =
    normalizeText(
      input.strategy_type ??
        input.strategyType ??
        input.trade_style ??
        input.tradeStyle,
    );

  const tradeStyle =
    shouldUseDetectedTradeStyle(
      storedTradeStyle,
    )
      ? detectedTradeStyle.style
      : storedTradeStyle;

  const tradeStyleLabel =
    instrumentType === "STOCK"
      ? "Stock"
      : getSafeTradeStyleLabel(
          tradeStyle,
        );

  const premiumSummary =
    calculatePremiumSummary(legs);

  const netEntry = calculateNetEntry(
    legs,
    input,
  );

  const netExit = calculateNetExit(
    legs,
    input,
  );

  /*
   * Entry and exit are already signed cash-flow values.
   *
   * Debit entry:
   * -3.55
   *
   * Long-position exit:
   * +0.11
   *
   * P/L:
   * -3.55 + 0.11 = -3.44
   */
  const netPnl =
    calculateNetPnl(
      netEntry,
      netExit,
    );

  const netPnlDollars =
    calculateNetPnlDollars({
      instrumentType,
      netPnl,
      shares:
        input.shares ??
        input.quantity,
    });

  const returnPct =
    calculateReturnPct(
      netEntry,
      netPnl,
    );

  const debitCredit =
    getDebitCredit(netEntry);

  const totalContracts =
    calculateTotalContracts(legs);

  const strategyContracts =
    calculateStrategyContracts(
      legs,
      input,
    );

  const totalShares =
    instrumentType === "STOCK"
      ? normalizeNumber(
          input.shares ??
            input.quantity,
        )
      : null;

  const primaryLeg =
    legs[0] ?? null;

  const title = buildTitle({
    symbol,
    tradeStyleLabel,
    instrumentType,
  });

  const subtitle = buildSubtitle({
    debitCredit,
    netEntry,
    strategyContracts,
    executionStyle,
  });

  return {
    symbol,
    instrumentType,

    strategyType:
      tradeStyle,

    strategyTypeLabel:
      tradeStyleLabel,

    tradeStyle,
    tradeStyleLabel,

    executionStyle,

    action:
      normalizeNullableText(
        input.open_action ??
          input.openAction ??
          input.action,
      ),

    debitCredit,

    netEntry,

    netEntryAmount:
      netEntry !== null
        ? roundMoney(
            Math.abs(netEntry),
          )
        : null,

    netExit,

    netExitAmount:
      netExit !== null
        ? roundMoney(
            Math.abs(netExit),
          )
        : null,

    netPnl,
    netPnlDollars,
    returnPct,

    totalPaid:
      premiumSummary.totalPaid,

    totalReceived:
      premiumSummary.totalReceived,

    totalExitPaid:
      premiumSummary.totalExitPaid,

    totalExitReceived:
      premiumSummary.totalExitReceived,

    totalContracts,
    strategyContracts,
    totalShares,

    legCount: legs.length,

    primaryExpirationDate:
      primaryLeg?.expirationDate ??
      null,

    primaryStrikePrice:
      primaryLeg?.strikePrice ??
      null,

    legs,

    displayLines:
      legs.map(
        (leg) => leg.displayLine,
      ),

    discordLines:
      legs.map(
        (leg) => leg.discordLine,
      ),

    title,
    subtitle,
  };
}

/* -------------------------------------------------
   STRATEGY SELECTION
------------------------------------------------- */
function shouldUseDetectedTradeStyle(
  value: string,
) {
  return (
    !value ||
    value === "UNKNOWN" ||
    value ===
      "MULTI_LEG_OPTIONS" ||
    value === "SCALP" ||
    value === "SWING" ||
    value === "LEAP" ||
    value === "IMPORT" ||
    value === "IMPORTED" ||
    value === "BROKER_IMPORT"
  );
}

/* -------------------------------------------------
   OPTION LEG NORMALIZATION
------------------------------------------------- */
function normalizeOptionLegs(
  legs: TradeSummaryOptionLegInput[],
  symbol: string,
): NormalizedTradeSummaryLeg[] {
  return [...legs]
    .map((leg, index) =>
      normalizeOptionLeg(
        leg,
        index,
        symbol,
      ),
    )
    .filter(
      (
        leg,
      ): leg is NormalizedTradeSummaryLeg =>
        leg !== null,
    )
    .sort(
      (firstLeg, secondLeg) =>
        firstLeg.legOrder -
        secondLeg.legOrder,
    );
}

function normalizeOptionLeg(
  leg: TradeSummaryOptionLegInput,
  index: number,
  symbol: string,
): NormalizedTradeSummaryLeg | null {
  const optionType =
    normalizeOptionType(
      leg.option_type ??
        leg.optionType,
    );

  if (!optionType) {
    return null;
  }

  const action =
    normalizeLegAction(
      leg.action,
    );

  const direction =
    normalizeLegDirection(
      action,
    );

  const strikePrice =
    normalizeNumber(
      leg.strike_price ??
        leg.strikePrice,
    );

  const expirationDate =
    normalizeNullableText(
      leg.expiration_date ??
        leg.expirationDate,
    );

  const contracts =
    normalizePositiveNumber(
      leg.contracts ??
        leg.quantity,
    ) ?? 1;

  const entryPrice =
    normalizeNumber(
      leg.entry_price ??
        leg.entryPrice,
    );

  const exitPrice =
    normalizeNumber(
      leg.exit_price ??
        leg.exitPrice,
    );

  const legOrder =
    normalizePositiveNumber(
      leg.leg_order,
    ) ??
    index + 1;

  const signedEntryValue =
    entryPrice === null
      ? null
      : getSignedEntryValue(
          action,
          entryPrice,
          contracts,
        );

  const signedExitValue =
    exitPrice === null
      ? null
      : getSignedExitValue(
          action,
          exitPrice,
          contracts,
        );

  const entryPremiumPaid =
    entryPrice !== null &&
    isDebitOpeningAction(action)
      ? roundMoney(
          entryPrice *
            contracts,
        )
      : 0;

  const entryPremiumReceived =
    entryPrice !== null &&
    isCreditOpeningAction(action)
      ? roundMoney(
          entryPrice *
            contracts,
        )
      : 0;

  const exitPremiumPaid =
    exitPrice !== null &&
    isCreditOpeningAction(action)
      ? roundMoney(
          exitPrice *
            contracts,
        )
      : 0;

  const exitPremiumReceived =
    exitPrice !== null &&
    isDebitOpeningAction(action)
      ? roundMoney(
          exitPrice *
            contracts,
        )
      : 0;

  const displayLine =
    buildLegDisplayLine({
      action,
      contracts,
      symbol,
      strikePrice,
      optionType,
      expirationDate,
      entryPrice,
    });

  const discordLine =
    buildLegDiscordLine({
      action,
      contracts,
      symbol,
      strikePrice,
      optionType,
      expirationDate,
      entryPrice,
    });

  return {
    id: leg.id ?? null,

    legOrder,

    action,
    actionLabel:
      getActionLabel(action),

    direction,

    optionType,
    strikePrice,
    expirationDate,

    contracts,

    entryPrice,
    exitPrice,

    signedEntryValue,
    signedExitValue,

    entryPremiumPaid,
    entryPremiumReceived,

    exitPremiumPaid,
    exitPremiumReceived,

    displayLine,
    discordLine,
  };
}

/* -------------------------------------------------
   LEGACY SINGLE-LEG FALLBACK
------------------------------------------------- */
function buildFallbackSingleOptionLeg(
  input: BuildTradeSummaryInput,
  symbol: string,
): NormalizedTradeSummaryLeg | null {
  const optionType =
    normalizeOptionType(
      input.option_type ??
        input.optionType,
    );

  if (!optionType) {
    return null;
  }

  return normalizeOptionLeg(
    {
      leg_order: 1,

      action:
        input.open_action ??
        input.openAction ??
        input.action,

      option_type:
        optionType,

      strike_price:
        input.strike_price ??
        input.strikePrice,

      expiration_date:
        input.expiration_date ??
        input.expirationDate,

      contracts:
        input.contracts ??
        input.quantity,

      entry_price:
        input.entry_price ??
        input.entryPrice,

      exit_price:
        input.exit_price ??
        input.exitPrice,
    },
    0,
    symbol,
  );
}

/* -------------------------------------------------
   PREMIUM SUMMARY
------------------------------------------------- */
function calculatePremiumSummary(
  legs: NormalizedTradeSummaryLeg[],
) {
  const totalPaid =
    roundMoney(
      legs.reduce(
        (total, leg) =>
          total +
          leg.entryPremiumPaid,
        0,
      ),
    );

  const totalReceived =
    roundMoney(
      legs.reduce(
        (total, leg) =>
          total +
          leg.entryPremiumReceived,
        0,
      ),
    );

  const totalExitPaid =
    roundMoney(
      legs.reduce(
        (total, leg) =>
          total +
          leg.exitPremiumPaid,
        0,
      ),
    );

  const totalExitReceived =
    roundMoney(
      legs.reduce(
        (total, leg) =>
          total +
          leg.exitPremiumReceived,
        0,
      ),
    );

  return {
    totalPaid,
    totalReceived,
    totalExitPaid,
    totalExitReceived,
  };
}

/* -------------------------------------------------
   STRATEGY ENTRY
------------------------------------------------- */
function calculateNetEntry(
  legs: NormalizedTradeSummaryLeg[],
  input: BuildTradeSummaryInput,
): number | null {
  if (legs.length > 0) {
    const values =
      legs
        .map(
          (leg) =>
            leg.signedEntryValue,
        )
        .filter(
          (
            value,
          ): value is number =>
            value !== null,
        );

    if (values.length > 0) {
      return roundMoney(
        values.reduce(
          (total, value) =>
            total + value,
          0,
        ),
      );
    }
  }

  const fallbackEntry =
    normalizeNumber(
      input.entry_price ??
        input.entryPrice,
    );

  if (fallbackEntry === null) {
    return null;
  }

  const fallbackAction =
    normalizeLegAction(
      input.open_action ??
        input.openAction ??
        input.action,
    );

  const contracts =
    normalizePositiveNumber(
      input.contracts ??
        input.quantity,
    ) ?? 1;

  return getSignedEntryValue(
    fallbackAction,
    fallbackEntry,
    contracts,
  );
}

/* -------------------------------------------------
   STRATEGY EXIT
------------------------------------------------- */
function calculateNetExit(
  legs: NormalizedTradeSummaryLeg[],
  input: BuildTradeSummaryInput,
): number | null {
  if (legs.length > 0) {
    const values =
      legs
        .map(
          (leg) =>
            leg.signedExitValue,
        )
        .filter(
          (
            value,
          ): value is number =>
            value !== null,
        );

    if (values.length > 0) {
      return roundMoney(
        values.reduce(
          (total, value) =>
            total + value,
          0,
        ),
      );
    }
  }

  const fallbackExit =
    normalizeNumber(
      input.exit_price ??
        input.exitPrice,
    );

  if (fallbackExit === null) {
    return null;
  }

  const fallbackAction =
    normalizeLegAction(
      input.open_action ??
        input.openAction ??
        input.action,
    );

  const contracts =
    normalizePositiveNumber(
      input.contracts ??
        input.quantity,
    ) ?? 1;

  return getSignedExitValue(
    fallbackAction,
    fallbackExit,
    contracts,
  );
}

/* -------------------------------------------------
   PROFIT / LOSS
------------------------------------------------- */
function calculateNetPnl(
  netEntry: number | null,
  netExit: number | null,
): number | null {
  if (
    netEntry === null ||
    netExit === null
  ) {
    return null;
  }

  /*
   * Both values are signed cash flows.
   *
   * Debit example:
   * entry = -3.55
   * exit  = +0.11
   * pnl   = -3.44
   *
   * Credit example:
   * entry = +1.72
   * exit  = -0.58
   * pnl   = +1.14
   */
  return roundMoney(
    netEntry + netExit,
  );
}

function calculateNetPnlDollars({
  instrumentType,
  netPnl,
  shares,
}: {
  instrumentType:
    | "OPTION"
    | "STOCK"
    | "UNKNOWN";
  netPnl: number | null;
  shares:
    | number
    | string
    | null
    | undefined;
}): number | null {
  if (netPnl === null) {
    return null;
  }

  /*
   * Retained in the public helper contract for backward compatibility.
   * Stock cash-flow calculations already include quantity.
   */
  void shares;

  if (
    instrumentType === "OPTION"
  ) {
    return roundMoney(
      netPnl *
        OPTION_CONTRACT_MULTIPLIER,
    );
  }

  if (
    instrumentType === "STOCK"
  ) {
    /*
     * Stock entry and exit cash flows already include quantity through
     * calculateNetEntry/calculateNetExit. Multiplying by shares again would
     * double-count the position size.
     */
    return roundMoney(netPnl);
  }

  return roundMoney(netPnl);
}

function calculateReturnPct(
  netEntry: number | null,
  netPnl: number | null,
): number | null {
  if (
    netEntry === null ||
    netEntry === 0 ||
    netPnl === null
  ) {
    return null;
  }

  return roundPercent(
    (netPnl /
      Math.abs(netEntry)) *
      100,
  );
}

/* -------------------------------------------------
   SIGNED CASH-FLOW HELPERS
------------------------------------------------- */
function getSignedEntryValue(
  action:
    NormalizedTradeSummaryLeg["action"],
  price: number,
  contracts: number,
): number {
  const value =
    price * contracts;

  if (
    isCreditOpeningAction(action)
  ) {
    return roundMoney(value);
  }

  return roundMoney(-value);
}

function getSignedExitValue(
  openingAction:
    NormalizedTradeSummaryLeg["action"],
  closePrice: number,
  contracts: number,
): number {
  const value =
    closePrice * contracts;

  /*
   * A short/credit leg must be bought back,
   * so closing it is a negative cash flow.
   */
  if (
    isCreditOpeningAction(
      openingAction,
    )
  ) {
    return roundMoney(-value);
  }

  /*
   * A long/debit leg is sold to close,
   * so closing it is a positive cash flow.
   */
  return roundMoney(value);
}

function isDebitOpeningAction(
  action:
    NormalizedTradeSummaryLeg["action"],
) {
  return (
    action === "BTO" ||
    action === "BUY" ||
    action === "LONG"
  );
}

function isCreditOpeningAction(
  action:
    NormalizedTradeSummaryLeg["action"],
) {
  return (
    action === "STO" ||
    action === "SELL" ||
    action === "SHORT"
  );
}

/* -------------------------------------------------
   ENTRY TYPE
------------------------------------------------- */
function getDebitCredit(
  netEntry: number | null,
): TradeSummaryDebitCredit {
  if (netEntry === null) {
    return "UNKNOWN";
  }

  if (netEntry > 0) {
    return "CREDIT";
  }

  if (netEntry < 0) {
    return "DEBIT";
  }

  return "EVEN";
}

/* -------------------------------------------------
   CONTRACT COUNTS
------------------------------------------------- */
function calculateTotalContracts(
  legs: NormalizedTradeSummaryLeg[],
) {
  if (legs.length === 0) {
    return 0;
  }

  return legs.reduce(
    (total, leg) =>
      total + leg.contracts,
    0,
  );
}

function calculateStrategyContracts(
  legs: NormalizedTradeSummaryLeg[],
  input: BuildTradeSummaryInput,
) {
  const savedStrategyContracts =
    normalizePositiveNumber(
      input.contracts ??
        input.quantity,
    );

  if (
    savedStrategyContracts !== null
  ) {
    return savedStrategyContracts;
  }

  if (legs.length === 0) {
    return 0;
  }

  /*
   * A four-leg Iron Condor with one contract on
   * each leg represents one strategy contract,
   * not four strategy contracts.
   */
  return Math.min(
    ...legs.map(
      (leg) => leg.contracts,
    ),
  );
}

/* -------------------------------------------------
   DISPLAY LINES
------------------------------------------------- */
function buildLegDisplayLine({
  action,
  contracts,
  symbol,
  strikePrice,
  optionType,
  expirationDate,
  entryPrice,
}: {
  action:
    NormalizedTradeSummaryLeg["action"];
  contracts: number;
  symbol: string;
  strikePrice: number | null;
  optionType:
    TradeSummaryOptionType;
  expirationDate: string | null;
  entryPrice: number | null;
}) {
  const priceText =
    entryPrice !== null
      ? ` @ ${formatCurrency(
          entryPrice,
        )}`
      : "";

  const expirationText =
    expirationDate
      ? ` ${expirationDate}`
      : "";

  const strikeText =
    strikePrice !== null
      ? formatNumber(
          strikePrice,
        )
      : "—";

  return `${action} ${contracts} ${symbol} ${strikeText} ${optionType}${expirationText}${priceText}`;
}

function buildLegDiscordLine({
  action,
  contracts,
  symbol,
  strikePrice,
  optionType,
  expirationDate,
  entryPrice,
}: {
  action:
    NormalizedTradeSummaryLeg["action"];
  contracts: number;
  symbol: string;
  strikePrice: number | null;
  optionType:
    TradeSummaryOptionType;
  expirationDate: string | null;
  entryPrice: number | null;
}) {
  const priceText =
    entryPrice !== null
      ? ` @ ${formatCurrency(
          entryPrice,
        )}`
      : "";

  const expirationText =
    expirationDate
      ? ` exp ${expirationDate}`
      : "";

  const strikeText =
    strikePrice !== null
      ? formatNumber(
          strikePrice,
        )
      : "—";

  return `• ${action} ${contracts} ${symbol} ${strikeText} ${optionType}${expirationText}${priceText}`;
}

/* -------------------------------------------------
   TITLE / SUBTITLE
------------------------------------------------- */
function buildTitle({
  symbol,
  tradeStyleLabel,
  instrumentType,
}: {
  symbol: string;
  tradeStyleLabel: string;
  instrumentType:
    TradeSummary["instrumentType"];
}) {
  if (
    instrumentType === "STOCK"
  ) {
    return `${symbol} Stock`;
  }

  return `${symbol} ${tradeStyleLabel}`;
}

function buildSubtitle({
  debitCredit,
  netEntry,
  strategyContracts,
  executionStyle,
}: {
  debitCredit:
    TradeSummaryDebitCredit;
  netEntry: number | null;
  strategyContracts: number;
  executionStyle: string | null;
}) {
  const parts: string[] = [];

  if (
    debitCredit !== "UNKNOWN"
  ) {
    parts.push(
      formatDebitCredit(
        debitCredit,
      ),
    );
  }

  if (netEntry !== null) {
    parts.push(
      `Net entry ${formatCurrency(
        Math.abs(netEntry),
      )}`,
    );
  }

  if (
    strategyContracts > 0
  ) {
    parts.push(
      `${strategyContracts} strategy contract${
        strategyContracts === 1
          ? ""
          : "s"
      }`,
    );
  }

  if (executionStyle) {
    parts.push(
      `Execution ${formatDisplayText(
        executionStyle,
      )}`,
    );
  }

  return parts.join(" • ");
}

/* -------------------------------------------------
   EXECUTION STYLE RESOLUTION
------------------------------------------------- */
function resolveExecutionStyle(
  input: BuildTradeSummaryInput,
): string | null {
  const explicitExecutionStyle =
    normalizeNullableText(
      input.execution_style ??
        input.executionStyle,
    );

  if (explicitExecutionStyle) {
    return explicitExecutionStyle;
  }

  const legacyTradeStyle =
    normalizeText(
      input.trade_style ??
        input.tradeStyle,
    );

  if (
    legacyTradeStyle === "SCALP" ||
    legacyTradeStyle === "SWING" ||
    legacyTradeStyle === "LEAP" ||
    legacyTradeStyle === "IMPORT" ||
    legacyTradeStyle === "IMPORTED" ||
    legacyTradeStyle === "BROKER_IMPORT"
  ) {
    return formatDisplayText(
      legacyTradeStyle,
    );
  }

  return null;
}

/* -------------------------------------------------
   INSTRUMENT NORMALIZATION
------------------------------------------------- */
function normalizeInstrumentType(
  value: unknown,
):
  | "OPTION"
  | "STOCK"
  | "UNKNOWN" {
  const normalized =
    normalizeText(value);

  if (
    normalized === "OPTION" ||
    normalized === "OPTIONS"
  ) {
    return "OPTION";
  }

  if (
    normalized === "STOCK" ||
    normalized === "EQUITY" ||
    normalized === "SHARES"
  ) {
    return "STOCK";
  }

  return "UNKNOWN";
}

/* -------------------------------------------------
   OPTION TYPE NORMALIZATION
------------------------------------------------- */
function normalizeOptionType(
  value: unknown,
): TradeSummaryOptionType | null {
  const normalized =
    normalizeText(value);

  if (
    normalized === "CALL" ||
    normalized === "C"
  ) {
    return "CALL";
  }

  if (
    normalized === "PUT" ||
    normalized === "P"
  ) {
    return "PUT";
  }

  return null;
}

/* -------------------------------------------------
   LEG ACTION NORMALIZATION
------------------------------------------------- */
function normalizeLegAction(
  value: unknown,
): NormalizedTradeSummaryLeg["action"] {
  const normalized =
    normalizeText(value);

  if (
    normalized ===
      "BUY_TO_OPEN" ||
    normalized === "BTO"
  ) {
    return "BTO";
  }

  if (
    normalized ===
      "SELL_TO_OPEN" ||
    normalized === "STO"
  ) {
    return "STO";
  }

  if (
    normalized ===
      "BUY_TO_CLOSE" ||
    normalized === "BTC"
  ) {
    return "BTC";
  }

  if (
    normalized ===
      "SELL_TO_CLOSE" ||
    normalized === "STC"
  ) {
    return "STC";
  }

  if (normalized === "BUY") {
    return "BUY";
  }

  if (normalized === "SELL") {
    return "SELL";
  }

  if (normalized === "LONG") {
    return "LONG";
  }

  if (normalized === "SHORT") {
    return "SHORT";
  }

  return "BTO";
}

function normalizeLegDirection(
  action:
    NormalizedTradeSummaryLeg["action"],
): NormalizedTradeSummaryLeg["direction"] {
  if (
    action === "BTO" ||
    action === "BTC" ||
    action === "BUY" ||
    action === "LONG"
  ) {
    return "LONG";
  }

  if (
    action === "STO" ||
    action === "STC" ||
    action === "SELL" ||
    action === "SHORT"
  ) {
    return "SHORT";
  }

  return "UNKNOWN";
}

function getActionLabel(
  action:
    NormalizedTradeSummaryLeg["action"],
) {
  if (action === "BTO") {
    return "Buy to Open";
  }

  if (action === "STO") {
    return "Sell to Open";
  }

  if (action === "BTC") {
    return "Buy to Close";
  }

  if (action === "STC") {
    return "Sell to Close";
  }

  if (action === "BUY") {
    return "Buy";
  }

  if (action === "SELL") {
    return "Sell";
  }

  if (action === "LONG") {
    return "Long";
  }

  if (action === "SHORT") {
    return "Short";
  }

  return action;
}

/* -------------------------------------------------
   GENERIC NORMALIZATION
------------------------------------------------- */
function normalizeSymbol(
  value: unknown,
): string {
  const normalized =
    normalizeText(value);

  return normalized || "UNKNOWN";
}

function normalizeText(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function normalizeNullableText(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return String(value).trim();
}

function normalizeNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    typeof value === "string"
      ? Number(
          value
            .replace(/\$/g, "")
            .replace(/,/g, "")
            .replace(/%/g, "")
            .replace(/\(/g, "-")
            .replace(/\)/g, "")
            .trim(),
        )
      : Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return null;
  }

  return parsed;
}

function normalizePositiveNumber(
  value: unknown,
): number | null {
  const parsed =
    normalizeNumber(value);

  if (
    parsed === null ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

/* -------------------------------------------------
   TRADE STYLE LABEL
------------------------------------------------- */
function getSafeTradeStyleLabel(
  value: string,
): string {
  const knownLabel =
    getTradeStyleLabel(
      value as TradeStyle,
    );

  if (
    knownLabel !== "Unknown" ||
    value === "UNKNOWN"
  ) {
    return knownLabel;
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => {
      return (
        part
          .charAt(0)
          .toUpperCase() +
        part
          .slice(1)
          .toLowerCase()
      );
    })
    .join(" ");
}

/* -------------------------------------------------
   FORMAT HELPERS
------------------------------------------------- */
function formatDebitCredit(
  value:
    TradeSummaryDebitCredit,
): string {
  if (value === "DEBIT") {
    return "Debit";
  }

  if (value === "CREDIT") {
    return "Credit";
  }

  if (value === "EVEN") {
    return "Even";
  }

  return "Unknown";
}

function formatCurrency(
  value: number,
): string {
  const prefix =
    value < 0 ? "-" : "";

  return `${prefix}$${Math.abs(
    value,
  ).toFixed(2)}`;
}

function formatNumber(
  value: number,
): string {
  if (
    Number.isInteger(value)
  ) {
    return String(value);
  }

  return value.toFixed(2);
}

function formatDisplayText(
  value: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    return "—";
  }

  if (
    normalized.toLowerCase() ===
    "leap"
  ) {
    return "LEAP";
  }

  return normalized
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

/* -------------------------------------------------
   ROUNDING
------------------------------------------------- */
function roundMoney(
  value: number,
): number {
  return Number(
    value.toFixed(2),
  );
}

function roundPercent(
  value: number,
): number {
  return Number(
    value.toFixed(2),
  );
}