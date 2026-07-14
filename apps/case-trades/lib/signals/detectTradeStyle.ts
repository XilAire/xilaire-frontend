export type OptionLegAction =
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

export type OptionLegType = "CALL" | "PUT";

export type TradeStyle =
  | "STOCK"
  | "SINGLE_CALL"
  | "SINGLE_PUT"
  | "LONG_CALL"
  | "SHORT_CALL"
  | "LONG_PUT"
  | "SHORT_PUT"
  | "CALL_DEBIT_SPREAD"
  | "CALL_CREDIT_SPREAD"
  | "PUT_DEBIT_SPREAD"
  | "PUT_CREDIT_SPREAD"
  | "BULL_CALL_DEBIT_SPREAD"
  | "BEAR_CALL_CREDIT_SPREAD"
  | "BULL_PUT_CREDIT_SPREAD"
  | "BEAR_PUT_DEBIT_SPREAD"
  | "VERTICAL_SPREAD"
  | "DEBIT_SPREAD"
  | "CREDIT_SPREAD"
  | "IRON_CONDOR"
  | "REVERSE_IRON_CONDOR"
  | "IRON_BUTTERFLY"
  | "REVERSE_IRON_BUTTERFLY"
  | "STRADDLE"
  | "SHORT_STRADDLE"
  | "STRANGLE"
  | "SHORT_STRANGLE"
  | "CALENDAR_SPREAD"
  | "CALL_CALENDAR_SPREAD"
  | "PUT_CALENDAR_SPREAD"
  | "DIAGONAL_SPREAD"
  | "CALL_DIAGONAL_SPREAD"
  | "PUT_DIAGONAL_SPREAD"
  | "BUTTERFLY"
  | "BROKEN_WING_BUTTERFLY"
  | "RATIO_SPREAD"
  | "CALL_RATIO_SPREAD"
  | "PUT_RATIO_SPREAD"
  | "BACK_RATIO_SPREAD"
  | "CALL_BACK_RATIO_SPREAD"
  | "PUT_BACK_RATIO_SPREAD"
  | "COVERED_CALL"
  | "CASH_SECURED_PUT"
  | "PROTECTIVE_PUT"
  | "COVERED_STRANGLE"
  | "COLLAR"
  | "JADE_LIZARD"
  | "SYNTHETIC_LONG"
  | "SYNTHETIC_SHORT"
  | "RISK_REVERSAL"
  | "POOR_MANS_COVERED_CALL"
  | "MULTI_LEG_OPTIONS"
  | "UNKNOWN";

export type TradeStyleDetectionInput = {
  instrumentType?: string | null;
  legs?: TradeStyleOptionLeg[];
  hasStockLeg?: boolean;
  stockSide?: "LONG" | "SHORT" | "BUY" | "SELL" | null;
};

export type TradeStyleOptionLeg = {
  optionType?: OptionLegType | string | null;
  option_type?: OptionLegType | string | null;
  type?: OptionLegType | string | null;
  side?: OptionLegAction | string | null;
  action?: OptionLegAction | string | null;
  strike?: number | string | null;
  strikePrice?: number | string | null;
  strike_price?: number | string | null;
  expirationDate?: string | null;
  expiration_date?: string | null;
  expiration?: string | null;
  quantity?: number | string | null;
  contracts?: number | string | null;
  premium?: number | string | null;
  price?: number | string | null;
  entryPrice?: number | string | null;
  entry_price?: number | string | null;
};

export type DetectedTradeStyle = {
  style: TradeStyle;
  label: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
};

type NormalizedLeg = {
  optionType: OptionLegType;
  direction: "LONG" | "SHORT";
  strike: number | null;
  expiration: string | null;
  quantity: number;
  premium: number | null;
};

const TRADE_STYLE_LABELS: Record<TradeStyle, string> = {
  STOCK: "Stock",
  SINGLE_CALL: "Single Call",
  SINGLE_PUT: "Single Put",
  LONG_CALL: "Long Call",
  SHORT_CALL: "Short Call",
  LONG_PUT: "Long Put",
  SHORT_PUT: "Short Put",
  CALL_DEBIT_SPREAD: "Call Debit Spread",
  CALL_CREDIT_SPREAD: "Call Credit Spread",
  PUT_DEBIT_SPREAD: "Put Debit Spread",
  PUT_CREDIT_SPREAD: "Put Credit Spread",
  BULL_CALL_DEBIT_SPREAD: "Bull Call Debit Spread",
  BEAR_CALL_CREDIT_SPREAD: "Bear Call Credit Spread",
  BULL_PUT_CREDIT_SPREAD: "Bull Put Credit Spread",
  BEAR_PUT_DEBIT_SPREAD: "Bear Put Debit Spread",
  VERTICAL_SPREAD: "Vertical Spread",
  DEBIT_SPREAD: "Debit Spread",
  CREDIT_SPREAD: "Credit Spread",
  IRON_CONDOR: "Iron Condor",
  REVERSE_IRON_CONDOR: "Reverse Iron Condor",
  IRON_BUTTERFLY: "Iron Butterfly",
  REVERSE_IRON_BUTTERFLY: "Reverse Iron Butterfly",
  STRADDLE: "Long Straddle",
  SHORT_STRADDLE: "Short Straddle",
  STRANGLE: "Long Strangle",
  SHORT_STRANGLE: "Short Strangle",
  CALENDAR_SPREAD: "Calendar Spread",
  CALL_CALENDAR_SPREAD: "Call Calendar Spread",
  PUT_CALENDAR_SPREAD: "Put Calendar Spread",
  DIAGONAL_SPREAD: "Diagonal Spread",
  CALL_DIAGONAL_SPREAD: "Call Diagonal Spread",
  PUT_DIAGONAL_SPREAD: "Put Diagonal Spread",
  BUTTERFLY: "Butterfly",
  BROKEN_WING_BUTTERFLY: "Broken Wing Butterfly",
  RATIO_SPREAD: "Ratio Spread",
  CALL_RATIO_SPREAD: "Call Ratio Spread",
  PUT_RATIO_SPREAD: "Put Ratio Spread",
  BACK_RATIO_SPREAD: "Back Ratio Spread",
  CALL_BACK_RATIO_SPREAD: "Call Back Ratio Spread",
  PUT_BACK_RATIO_SPREAD: "Put Back Ratio Spread",
  COVERED_CALL: "Covered Call",
  CASH_SECURED_PUT: "Cash-Secured Put",
  PROTECTIVE_PUT: "Protective Put",
  COVERED_STRANGLE: "Covered Strangle",
  COLLAR: "Collar",
  JADE_LIZARD: "Jade Lizard",
  SYNTHETIC_LONG: "Synthetic Long",
  SYNTHETIC_SHORT: "Synthetic Short",
  RISK_REVERSAL: "Risk Reversal",
  POOR_MANS_COVERED_CALL: "Poor Man's Covered Call",
  MULTI_LEG_OPTIONS: "Multi-Leg Options",
  UNKNOWN: "Unknown",
};

export function getTradeStyleLabel(style: TradeStyle): string {
  return TRADE_STYLE_LABELS[style] ?? TRADE_STYLE_LABELS.UNKNOWN;
}

export function detectTradeStyle(
  input: TradeStyleDetectionInput,
): DetectedTradeStyle {
  const instrumentType = normalizeText(input.instrumentType);
  const legs = normalizeLegs(input.legs ?? []);
  const stockDirection = normalizeStockDirection(input.stockSide);
  const hasStockLeg = Boolean(input.hasStockLeg);

  if (legs.length === 0) {
    if (instrumentType.includes("STOCK") || instrumentType.includes("EQUITY")) {
      return buildDetection(
        "STOCK",
        "HIGH",
        "Instrument type is stock/equity and no option legs were provided.",
      );
    }

    return buildDetection(
      "UNKNOWN",
      "LOW",
      "No option legs were provided, so CASE could not detect a trade style.",
    );
  }

  if (hasStockLeg) {
    const stockBasedStyle = detectStockBasedStyle(legs, stockDirection);

    if (stockBasedStyle.style !== "UNKNOWN") {
      return stockBasedStyle;
    }
  }

  if (legs.length === 1) {
    return detectSingleLegStyle(legs[0]);
  }

  if (legs.length === 2) {
    return detectTwoLegStyle(legs);
  }

  if (legs.length === 3) {
    return detectThreeLegStyle(legs);
  }

  if (legs.length === 4) {
    return detectFourLegStyle(legs);
  }

  return buildDetection(
    "MULTI_LEG_OPTIONS",
    "LOW",
    `${legs.length} option legs were detected, but they do not match a supported CASE strategy pattern yet.`,
  );
}

function detectStockBasedStyle(
  legs: NormalizedLeg[],
  stockDirection: "LONG" | "SHORT" | null,
): DetectedTradeStyle {
  if (legs.length === 1) {
    const onlyLeg = legs[0];

    if (
      stockDirection !== "SHORT" &&
      onlyLeg.optionType === "CALL" &&
      onlyLeg.direction === "SHORT"
    ) {
      return buildDetection(
        "COVERED_CALL",
        "HIGH",
        "A long stock position plus one short call was detected.",
      );
    }

    if (
      stockDirection !== "SHORT" &&
      onlyLeg.optionType === "PUT" &&
      onlyLeg.direction === "SHORT"
    ) {
      return buildDetection(
        "CASH_SECURED_PUT",
        "MEDIUM",
        "A stock/cash-backed position plus one short put was detected.",
      );
    }

    if (
      stockDirection !== "SHORT" &&
      onlyLeg.optionType === "PUT" &&
      onlyLeg.direction === "LONG"
    ) {
      return buildDetection(
        "PROTECTIVE_PUT",
        "HIGH",
        "A long stock position plus one long put was detected.",
      );
    }
  }

  if (legs.length === 2) {
    const call = legs.find((leg) => leg.optionType === "CALL");
    const put = legs.find((leg) => leg.optionType === "PUT");

    if (
      stockDirection !== "SHORT" &&
      call?.direction === "SHORT" &&
      put?.direction === "LONG" &&
      hasKnownStrike(call) &&
      hasKnownStrike(put) &&
      put.strike < call.strike
    ) {
      return buildDetection(
        "COLLAR",
        "HIGH",
        "A long stock position, long protective put, and short covered call were detected.",
      );
    }

    if (
      stockDirection !== "SHORT" &&
      call?.direction === "SHORT" &&
      put?.direction === "SHORT"
    ) {
      return buildDetection(
        "COVERED_STRANGLE",
        "MEDIUM",
        "A stock position plus one short call and one short put were detected.",
      );
    }
  }

  return buildDetection(
    "UNKNOWN",
    "LOW",
    "A stock leg was detected, but the option legs do not match a supported stock-based strategy.",
  );
}

function detectSingleLegStyle(leg: NormalizedLeg): DetectedTradeStyle {
  if (leg.optionType === "CALL" && leg.direction === "LONG") {
    return buildDetection(
      "LONG_CALL",
      "HIGH",
      "One long call leg was detected.",
    );
  }

  if (leg.optionType === "CALL" && leg.direction === "SHORT") {
    return buildDetection(
      "SHORT_CALL",
      "HIGH",
      "One short call leg was detected.",
    );
  }

  if (leg.optionType === "PUT" && leg.direction === "LONG") {
    return buildDetection("LONG_PUT", "HIGH", "One long put leg was detected.");
  }

  if (leg.optionType === "PUT" && leg.direction === "SHORT") {
    return buildDetection(
      "SHORT_PUT",
      "HIGH",
      "One short put leg was detected.",
    );
  }

  if (leg.optionType === "CALL") {
    return buildDetection(
      "SINGLE_CALL",
      "MEDIUM",
      "One call leg was detected.",
    );
  }

  if (leg.optionType === "PUT") {
    return buildDetection("SINGLE_PUT", "MEDIUM", "One put leg was detected.");
  }

  return buildDetection(
    "UNKNOWN",
    "LOW",
    "One option leg was detected, but CASE could not identify the option type.",
  );
}

function detectTwoLegStyle(legs: NormalizedLeg[]): DetectedTradeStyle {
  const [firstLeg, secondLeg] = sortByStrike(legs);

  const sameOptionType = firstLeg.optionType === secondLeg.optionType;
  const sameExpiration = firstLeg.expiration === secondLeg.expiration;
  const oppositeDirections = firstLeg.direction !== secondLeg.direction;
  const sameDirection = firstLeg.direction === secondLeg.direction;
  const sameStrike =
    firstLeg.strike !== null && firstLeg.strike === secondLeg.strike;
  const differentStrikes =
    firstLeg.strike !== null &&
    secondLeg.strike !== null &&
    firstLeg.strike !== secondLeg.strike;
  const differentExpiration = firstLeg.expiration !== secondLeg.expiration;

  if (
    sameOptionType &&
    oppositeDirections &&
    sameExpiration &&
    differentStrikes
  ) {
    const ratioStyle = detectTwoLegRatioStyle(firstLeg, secondLeg);

    if (ratioStyle.style !== "UNKNOWN") {
      return ratioStyle;
    }

    return detectVerticalSpread(firstLeg, secondLeg);
  }

  if (
    sameOptionType &&
    oppositeDirections &&
    sameStrike &&
    differentExpiration
  ) {
    return detectCalendarSpread(firstLeg, secondLeg);
  }

  if (
    sameOptionType &&
    oppositeDirections &&
    differentStrikes &&
    differentExpiration
  ) {
    return detectDiagonalSpread(firstLeg, secondLeg);
  }

  if (
    hasOneCallAndOnePut(legs) &&
    sameExpiration &&
    sameStrike &&
    sameDirection &&
    legs.every((leg) => leg.direction === "LONG")
  ) {
    return buildDetection(
      "STRADDLE",
      "HIGH",
      "One long call and one long put at the same strike and expiration were detected.",
    );
  }

  if (
    hasOneCallAndOnePut(legs) &&
    sameExpiration &&
    sameStrike &&
    sameDirection &&
    legs.every((leg) => leg.direction === "SHORT")
  ) {
    return buildDetection(
      "SHORT_STRADDLE",
      "HIGH",
      "One short call and one short put at the same strike and expiration were detected.",
    );
  }

  if (
    hasOneCallAndOnePut(legs) &&
    sameExpiration &&
    differentStrikes &&
    sameDirection &&
    legs.every((leg) => leg.direction === "LONG")
  ) {
    return buildDetection(
      "STRANGLE",
      "HIGH",
      "One long call and one long put with different strikes and the same expiration were detected.",
    );
  }

  if (
    hasOneCallAndOnePut(legs) &&
    sameExpiration &&
    differentStrikes &&
    sameDirection &&
    legs.every((leg) => leg.direction === "SHORT")
  ) {
    return buildDetection(
      "SHORT_STRANGLE",
      "HIGH",
      "One short call and one short put with different strikes and the same expiration were detected.",
    );
  }

  if (
    hasOneCallAndOnePut(legs) &&
    sameExpiration &&
    sameStrike &&
    oppositeDirections
  ) {
    const synthetic = detectSyntheticStyle(legs);

    if (synthetic.style !== "UNKNOWN") {
      return synthetic;
    }
  }

  if (
    hasOneCallAndOnePut(legs) &&
    sameExpiration &&
    differentStrikes &&
    oppositeDirections
  ) {
    return buildDetection(
      "RISK_REVERSAL",
      "MEDIUM",
      "One call and one put with opposite directions and the same expiration were detected.",
    );
  }

  return buildDetection(
    "MULTI_LEG_OPTIONS",
    "LOW",
    "Two option legs were detected, but they do not match a supported two-leg strategy pattern.",
  );
}

function detectVerticalSpread(
  lowerStrikeLeg: NormalizedLeg,
  higherStrikeLeg: NormalizedLeg,
): DetectedTradeStyle {
  if (lowerStrikeLeg.optionType === "CALL") {
    if (
      lowerStrikeLeg.direction === "LONG" &&
      higherStrikeLeg.direction === "SHORT"
    ) {
      return buildDetection(
        "BULL_CALL_DEBIT_SPREAD",
        "HIGH",
        "A long lower-strike call and short higher-strike call with the same expiration were detected.",
      );
    }

    if (
      lowerStrikeLeg.direction === "SHORT" &&
      higherStrikeLeg.direction === "LONG"
    ) {
      return buildDetection(
        "BEAR_CALL_CREDIT_SPREAD",
        "HIGH",
        "A short lower-strike call and long higher-strike call with the same expiration were detected.",
      );
    }
  }

  if (lowerStrikeLeg.optionType === "PUT") {
    if (
      lowerStrikeLeg.direction === "SHORT" &&
      higherStrikeLeg.direction === "LONG"
    ) {
      return buildDetection(
        "BULL_PUT_CREDIT_SPREAD",
        "HIGH",
        "A short lower-strike put and long higher-strike put with the same expiration were detected.",
      );
    }

    if (
      lowerStrikeLeg.direction === "LONG" &&
      higherStrikeLeg.direction === "SHORT"
    ) {
      return buildDetection(
        "BEAR_PUT_DEBIT_SPREAD",
        "HIGH",
        "A long lower-strike put and short higher-strike put with the same expiration were detected.",
      );
    }
  }

  return buildDetection(
    "VERTICAL_SPREAD",
    "MEDIUM",
    "Two same-type option legs with opposite directions, different strikes, and the same expiration were detected.",
  );
}

function detectCalendarSpread(
  firstLeg: NormalizedLeg,
  secondLeg: NormalizedLeg,
): DetectedTradeStyle {
  if (isPoorMansCoveredCall(firstLeg, secondLeg)) {
    return buildDetection(
      "POOR_MANS_COVERED_CALL",
      "HIGH",
      "A long-dated long call and shorter-dated short call at the same strike were detected.",
    );
  }

  if (firstLeg.optionType === "CALL") {
    return buildDetection(
      "CALL_CALENDAR_SPREAD",
      "HIGH",
      "Two opposite-direction call legs with the same strike and different expirations were detected.",
    );
  }

  if (firstLeg.optionType === "PUT") {
    return buildDetection(
      "PUT_CALENDAR_SPREAD",
      "HIGH",
      "Two opposite-direction put legs with the same strike and different expirations were detected.",
    );
  }

  return buildDetection(
    "CALENDAR_SPREAD",
    "HIGH",
    "Two opposite-direction option legs with the same strike and different expirations were detected.",
  );
}

function detectDiagonalSpread(
  firstLeg: NormalizedLeg,
  secondLeg: NormalizedLeg,
): DetectedTradeStyle {
  if (isPoorMansCoveredCall(firstLeg, secondLeg)) {
    return buildDetection(
      "POOR_MANS_COVERED_CALL",
      "HIGH",
      "A long-dated long call and shorter-dated short call at different strikes and expirations were detected.",
    );
  }

  if (firstLeg.optionType === "CALL") {
    return buildDetection(
      "CALL_DIAGONAL_SPREAD",
      "HIGH",
      "Two opposite-direction call legs with different strikes and different expirations were detected.",
    );
  }

  if (firstLeg.optionType === "PUT") {
    return buildDetection(
      "PUT_DIAGONAL_SPREAD",
      "HIGH",
      "Two opposite-direction put legs with different strikes and different expirations were detected.",
    );
  }

  return buildDetection(
    "DIAGONAL_SPREAD",
    "HIGH",
    "Two opposite-direction option legs with different strikes and different expirations were detected.",
  );
}

function detectSyntheticStyle(legs: NormalizedLeg[]): DetectedTradeStyle {
  const call = legs.find((leg) => leg.optionType === "CALL");
  const put = legs.find((leg) => leg.optionType === "PUT");

  if (!call || !put) {
    return buildDetection(
      "UNKNOWN",
      "LOW",
      "Synthetic detection requires one call and one put.",
    );
  }

  if (call.direction === "LONG" && put.direction === "SHORT") {
    return buildDetection(
      "SYNTHETIC_LONG",
      "HIGH",
      "A long call and short put at the same strike and expiration were detected.",
    );
  }

  if (call.direction === "SHORT" && put.direction === "LONG") {
    return buildDetection(
      "SYNTHETIC_SHORT",
      "HIGH",
      "A short call and long put at the same strike and expiration were detected.",
    );
  }

  return buildDetection(
    "UNKNOWN",
    "LOW",
    "The call and put legs do not match a supported synthetic strategy.",
  );
}

function detectThreeLegStyle(legs: NormalizedLeg[]): DetectedTradeStyle {
  const sorted = sortByStrike(legs);
  const calls = sorted.filter((leg) => leg.optionType === "CALL");
  const puts = sorted.filter((leg) => leg.optionType === "PUT");
  const expirations = uniqueValues(sorted.map((leg) => leg.expiration));
  const allSameExpiration = expirations.length === 1;
  const allSameType = calls.length === 3 || puts.length === 3;

  if (allSameType && allSameExpiration) {
    const butterfly = detectThreeLegButterfly(sorted);

    if (butterfly.style !== "UNKNOWN") {
      return butterfly;
    }

    const ratio = detectThreeLegRatioStyle(sorted);

    if (ratio.style !== "UNKNOWN") {
      return ratio;
    }
  }

  if (calls.length === 1 && puts.length === 2 && allSameExpiration) {
    const shortCall = calls.find((leg) => leg.direction === "SHORT");
    const shortPut = puts.find((leg) => leg.direction === "SHORT");
    const longPut = puts.find((leg) => leg.direction === "LONG");

    if (
      shortCall &&
      shortPut &&
      longPut &&
      hasKnownStrike(shortCall) &&
      hasKnownStrike(shortPut) &&
      hasKnownStrike(longPut) &&
      longPut.strike < shortPut.strike &&
      shortPut.strike < shortCall.strike
    ) {
      return buildDetection(
        "JADE_LIZARD",
        "HIGH",
        "A short call plus a short put spread with the same expiration were detected.",
      );
    }
  }

  return buildDetection(
    "MULTI_LEG_OPTIONS",
    "LOW",
    "Three option legs were detected, but they do not match a supported three-leg strategy pattern.",
  );
}

function detectFourLegStyle(legs: NormalizedLeg[]): DetectedTradeStyle {
  const sorted = sortByStrike(legs);
  const calls = sortByStrike(legs.filter((leg) => leg.optionType === "CALL"));
  const puts = sortByStrike(legs.filter((leg) => leg.optionType === "PUT"));
  const expirations = uniqueValues(legs.map((leg) => leg.expiration));
  const allSameExpiration = expirations.length === 1;

  if (calls.length === 2 && puts.length === 2 && allSameExpiration) {
    const condor = detectCondorOrButterfly(calls, puts);

    if (condor.style !== "UNKNOWN") {
      return condor;
    }
  }

  if (
    (calls.length === 4 || puts.length === 4) &&
    allSameExpiration &&
    sorted.every(hasKnownStrike)
  ) {
    return detectFourLegButterflyOrCondor(sorted);
  }

  return buildDetection(
    "MULTI_LEG_OPTIONS",
    "LOW",
    "Four option legs were detected, but they do not match a supported four-leg strategy pattern.",
  );
}

function detectCondorOrButterfly(
  calls: NormalizedLeg[],
  puts: NormalizedLeg[],
): DetectedTradeStyle {
  const callLong = calls.find((leg) => leg.direction === "LONG");
  const callShort = calls.find((leg) => leg.direction === "SHORT");
  const putLong = puts.find((leg) => leg.direction === "LONG");
  const putShort = puts.find((leg) => leg.direction === "SHORT");

  if (!callLong || !callShort || !putLong || !putShort) {
    return buildDetection(
      "UNKNOWN",
      "LOW",
      "Four-leg detection requires one long call, one short call, one long put, and one short put.",
    );
  }

  if (
    !hasKnownStrike(callLong) ||
    !hasKnownStrike(callShort) ||
    !hasKnownStrike(putLong) ||
    !hasKnownStrike(putShort)
  ) {
    return buildDetection(
      "UNKNOWN",
      "LOW",
      "Four-leg detection requires all strikes to be present.",
    );
  }

  const shortCallStrike = callShort.strike;
  const longCallStrike = callLong.strike;
  const shortPutStrike = putShort.strike;
  const longPutStrike = putLong.strike;

  if (
    longPutStrike < shortPutStrike &&
    shortPutStrike < shortCallStrike &&
    shortCallStrike < longCallStrike
  ) {
    return buildDetection(
      "IRON_CONDOR",
      "HIGH",
      "A long put wing, short put, short call, and long call wing were detected with the same expiration.",
    );
  }

  if (
    shortPutStrike === shortCallStrike &&
    longPutStrike < shortPutStrike &&
    longCallStrike > shortCallStrike
  ) {
    return buildDetection(
      "IRON_BUTTERFLY",
      "HIGH",
      "A short put and short call at the same strike with long wings on both sides were detected.",
    );
  }

  if (
    shortPutStrike < longPutStrike &&
    longPutStrike < longCallStrike &&
    longCallStrike < shortCallStrike
  ) {
    return buildDetection(
      "REVERSE_IRON_CONDOR",
      "HIGH",
      "A long inner put/call pair and short outer wings were detected with the same expiration.",
    );
  }

  if (
    longPutStrike === longCallStrike &&
    shortPutStrike < longPutStrike &&
    shortCallStrike > longCallStrike
  ) {
    return buildDetection(
      "REVERSE_IRON_BUTTERFLY",
      "HIGH",
      "A long put and long call at the same strike with short wings on both sides were detected.",
    );
  }

  return buildDetection(
    "UNKNOWN",
    "LOW",
    "Four call/put legs were detected, but their strikes do not match an iron condor or iron butterfly pattern.",
  );
}

function detectThreeLegButterfly(legs: NormalizedLeg[]): DetectedTradeStyle {
  const [lower, middle, upper] = sortByStrike(legs);

  if (!hasKnownStrike(lower) || !hasKnownStrike(middle) || !hasKnownStrike(upper)) {
    return buildDetection(
      "UNKNOWN",
      "LOW",
      "Butterfly detection requires all strikes to be present.",
    );
  }

  const hasTwoMiddleContracts =
    middle.quantity >= lower.quantity + upper.quantity ||
    middle.quantity === 2;

  const longButterfly =
    lower.direction === "LONG" &&
    middle.direction === "SHORT" &&
    upper.direction === "LONG" &&
    hasTwoMiddleContracts;

  const shortButterfly =
    lower.direction === "SHORT" &&
    middle.direction === "LONG" &&
    upper.direction === "SHORT" &&
    hasTwoMiddleContracts;

  if (!longButterfly && !shortButterfly) {
    return buildDetection(
      "UNKNOWN",
      "LOW",
      "Three same-type option legs were detected, but the long/short structure does not match a butterfly.",
    );
  }

  const lowerWingWidth = middle.strike - lower.strike;
  const upperWingWidth = upper.strike - middle.strike;

  if (lowerWingWidth !== upperWingWidth) {
    return buildDetection(
      "BROKEN_WING_BUTTERFLY",
      "HIGH",
      "Three same-type option legs with uneven wing widths were detected.",
    );
  }

  return buildDetection(
    "BUTTERFLY",
    "HIGH",
    "Three same-type option legs with balanced wings were detected.",
  );
}

function detectFourLegButterflyOrCondor(
  legs: NormalizedLeg[],
): DetectedTradeStyle {
  const [first, second, third, fourth] = sortByStrike(legs);
  const allSameType = legs.every((leg) => leg.optionType === first.optionType);

  if (!allSameType) {
    return buildDetection(
      "UNKNOWN",
      "LOW",
      "Four-leg same-type detection requires all legs to be calls or all legs to be puts.",
    );
  }

  const longOuterShortInner =
    first.direction === "LONG" &&
    second.direction === "SHORT" &&
    third.direction === "SHORT" &&
    fourth.direction === "LONG";

  const shortOuterLongInner =
    first.direction === "SHORT" &&
    second.direction === "LONG" &&
    third.direction === "LONG" &&
    fourth.direction === "SHORT";

  if (longOuterShortInner || shortOuterLongInner) {
    return buildDetection(
      "BUTTERFLY",
      "MEDIUM",
      "Four same-type option legs with outer wings and inner body legs were detected.",
    );
  }

  return buildDetection(
    "UNKNOWN",
    "LOW",
    "Four same-type option legs were detected, but their direction pattern does not match a butterfly or condor.",
  );
}

function detectTwoLegRatioStyle(
  firstLeg: NormalizedLeg,
  secondLeg: NormalizedLeg,
): DetectedTradeStyle {
  if (firstLeg.quantity === secondLeg.quantity) {
    return buildDetection(
      "UNKNOWN",
      "LOW",
      "Equal quantities are not a ratio spread.",
    );
  }

  const longLeg = firstLeg.direction === "LONG" ? firstLeg : secondLeg;
  const shortLeg = firstLeg.direction === "SHORT" ? firstLeg : secondLeg;

  if (!longLeg || !shortLeg) {
    return buildDetection(
      "UNKNOWN",
      "LOW",
      "Ratio spread detection requires one long leg and one short leg.",
    );
  }

  if (shortLeg.quantity > longLeg.quantity) {
    if (shortLeg.optionType === "CALL") {
      return buildDetection(
        "CALL_RATIO_SPREAD",
        "MEDIUM",
        "Uneven call quantities were detected with more short contracts than long contracts.",
      );
    }

    return buildDetection(
      "PUT_RATIO_SPREAD",
      "MEDIUM",
      "Uneven put quantities were detected with more short contracts than long contracts.",
    );
  }

  if (longLeg.quantity > shortLeg.quantity) {
    if (longLeg.optionType === "CALL") {
      return buildDetection(
        "CALL_BACK_RATIO_SPREAD",
        "MEDIUM",
        "Uneven call quantities were detected with more long contracts than short contracts.",
      );
    }

    return buildDetection(
      "PUT_BACK_RATIO_SPREAD",
      "MEDIUM",
      "Uneven put quantities were detected with more long contracts than short contracts.",
    );
  }

  return buildDetection(
    "UNKNOWN",
    "LOW",
    "The two-leg structure does not match a supported ratio strategy.",
  );
}

function detectThreeLegRatioStyle(legs: NormalizedLeg[]): DetectedTradeStyle {
  const longQuantity = legs
    .filter((leg) => leg.direction === "LONG")
    .reduce((total, leg) => total + leg.quantity, 0);
  const shortQuantity = legs
    .filter((leg) => leg.direction === "SHORT")
    .reduce((total, leg) => total + leg.quantity, 0);

  if (longQuantity === shortQuantity) {
    return buildDetection(
      "UNKNOWN",
      "LOW",
      "Equal long and short quantities are not a ratio spread.",
    );
  }

  const firstType = legs[0]?.optionType;

  if (shortQuantity > longQuantity) {
    if (firstType === "CALL") {
      return buildDetection(
        "CALL_RATIO_SPREAD",
        "MEDIUM",
        "Three call legs with more short contracts than long contracts were detected.",
      );
    }

    return buildDetection(
      "PUT_RATIO_SPREAD",
      "MEDIUM",
      "Three put legs with more short contracts than long contracts were detected.",
    );
  }

  if (longQuantity > shortQuantity) {
    if (firstType === "CALL") {
      return buildDetection(
        "CALL_BACK_RATIO_SPREAD",
        "MEDIUM",
        "Three call legs with more long contracts than short contracts were detected.",
      );
    }

    return buildDetection(
      "PUT_BACK_RATIO_SPREAD",
      "MEDIUM",
      "Three put legs with more long contracts than short contracts were detected.",
    );
  }

  return buildDetection(
    "UNKNOWN",
    "LOW",
    "The three-leg structure does not match a supported ratio strategy.",
  );
}

function isPoorMansCoveredCall(
  firstLeg: NormalizedLeg,
  secondLeg: NormalizedLeg,
): boolean {
  if (firstLeg.optionType !== "CALL" || secondLeg.optionType !== "CALL") {
    return false;
  }

  const longCall = firstLeg.direction === "LONG" ? firstLeg : secondLeg;
  const shortCall = firstLeg.direction === "SHORT" ? firstLeg : secondLeg;

  if (!longCall || !shortCall) {
    return false;
  }

  const longExpirationTime = parseExpirationTime(longCall.expiration);
  const shortExpirationTime = parseExpirationTime(shortCall.expiration);

  if (longExpirationTime === null || shortExpirationTime === null) {
    return false;
  }

  return longExpirationTime > shortExpirationTime;
}

function normalizeLegs(legs: TradeStyleOptionLeg[]): NormalizedLeg[] {
  return legs
    .map((leg) => normalizeLeg(leg))
    .filter((leg): leg is NormalizedLeg => leg !== null);
}

function normalizeLeg(leg: TradeStyleOptionLeg): NormalizedLeg | null {
  const optionType = normalizeOptionType(
    leg.optionType ?? leg.option_type ?? leg.type,
  );
  const direction = normalizeDirection(leg.side ?? leg.action);

  if (!optionType || !direction) {
    return null;
  }

  return {
    optionType,
    direction,
    strike: normalizeNumber(leg.strike ?? leg.strikePrice ?? leg.strike_price),
    expiration: normalizeExpiration(
      leg.expirationDate ?? leg.expiration_date ?? leg.expiration,
    ),
    quantity: normalizeQuantity(leg.quantity ?? leg.contracts),
    premium: normalizeNumber(leg.premium ?? leg.price ?? leg.entryPrice ?? leg.entry_price),
  };
}

function normalizeOptionType(value: unknown): OptionLegType | null {
  const normalized = normalizeText(value);

  if (normalized === "CALL" || normalized === "C") {
    return "CALL";
  }

  if (normalized === "PUT" || normalized === "P") {
    return "PUT";
  }

  return null;
}

function normalizeDirection(value: unknown): "LONG" | "SHORT" | null {
  const normalized = normalizeText(value);

  if (
    normalized === "BUY" ||
    normalized === "BUY_TO_OPEN" ||
    normalized === "BUY_TO_CLOSE" ||
    normalized === "BTO" ||
    normalized === "BTC" ||
    normalized === "LONG"
  ) {
    return "LONG";
  }

  if (
    normalized === "SELL" ||
    normalized === "SELL_TO_OPEN" ||
    normalized === "SELL_TO_CLOSE" ||
    normalized === "STO" ||
    normalized === "STC" ||
    normalized === "SHORT"
  ) {
    return "SHORT";
  }

  return null;
}

function normalizeStockDirection(value: unknown): "LONG" | "SHORT" | null {
  const normalized = normalizeText(value);

  if (normalized === "LONG" || normalized === "BUY") {
    return "LONG";
  }

  if (normalized === "SHORT" || normalized === "SELL") {
    return "SHORT";
  }

  return null;
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().toUpperCase().replace(/\s+/g, "_");
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function normalizeQuantity(value: unknown): number {
  const parsed = normalizeNumber(value);

  if (parsed === null || parsed === 0) {
    return 1;
  }

  return Math.abs(parsed);
}

function normalizeExpiration(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value).trim();
}

function parseExpirationTime(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return timestamp;
}

function sortByStrike(legs: NormalizedLeg[]): NormalizedLeg[] {
  return [...legs].sort((a, b) => {
    if (a.strike === null && b.strike === null) {
      return 0;
    }

    if (a.strike === null) {
      return 1;
    }

    if (b.strike === null) {
      return -1;
    }

    return a.strike - b.strike;
  });
}

function hasKnownStrike(
  leg: NormalizedLeg,
): leg is NormalizedLeg & { strike: number } {
  return leg.strike !== null;
}

function hasOneCallAndOnePut(legs: NormalizedLeg[]): boolean {
  return (
    legs.length === 2 &&
    legs.some((leg) => leg.optionType === "CALL") &&
    legs.some((leg) => leg.optionType === "PUT")
  );
}

function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function buildDetection(
  style: TradeStyle,
  confidence: DetectedTradeStyle["confidence"],
  reason: string,
): DetectedTradeStyle {
  return {
    style,
    label: getTradeStyleLabel(style),
    confidence,
    reason,
  };
}