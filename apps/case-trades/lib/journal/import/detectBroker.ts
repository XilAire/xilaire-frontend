export type SupportedBroker =
  | "CHARLES_SCHWAB"
  | "ROBINHOOD"
  | "FIDELITY"
  | "WEBULL"
  | "INTERACTIVE_BROKERS"
  | "TASTYTRADE"
  | "ETRADE"
  | "TRADESTATION"
  | "THINKORSWIM"
  | "GENERIC"
  | "UNKNOWN";

export type BrokerDetectionInput = {
  headers: string[];
  rows?: Record<string, string>[];
};

export type BrokerDetectionResult = {
  broker: SupportedBroker;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
};

export function normalizeHeader(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeHeaders(
  headers: string[],
) {
  return Array.from(
    new Set(
      headers
        .map(
          normalizeHeader,
        )
        .filter(Boolean),
    ),
  );
}

function hasHeader(
  headers: string[],
  header: string,
) {
  return headers.includes(
    normalizeHeader(
      header,
    ),
  );
}

function hasAnyHeader(
  headers: string[],
  candidates: string[],
) {
  return candidates.some(
    (candidate) =>
      hasHeader(
        headers,
        candidate,
      ),
  );
}

function hasAllHeaders(
  headers: string[],
  candidates: string[],
) {
  return candidates.every(
    (candidate) =>
      hasHeader(
        headers,
        candidate,
      ),
  );
}

function normalizeCell(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function rowContains(
  rows:
    | Record<string, string>[]
    | undefined,
  value: string,
) {
  if (
    !rows?.length
  ) {
    return false;
  }

  const needle =
    value
      .trim()
      .toLowerCase();

  if (!needle) {
    return false;
  }

  return rows.some(
    (row) =>
      Object.values(
        row,
      ).some(
        (cell) =>
          normalizeCell(
            cell,
          ).includes(
            needle,
          ),
      ),
  );
}

function rowContainsAny(
  rows:
    | Record<string, string>[]
    | undefined,
  values: string[],
) {
  return values.some(
    (value) =>
      rowContains(
        rows,
        value,
      ),
  );
}

function buildDetection({
  broker,
  confidence,
  reason,
}: {
  broker: SupportedBroker;
  confidence:
    BrokerDetectionResult["confidence"];
  reason: string;
}): BrokerDetectionResult {
  return {
    broker,
    confidence,
    reason,
  };
}

export function detectBrokerDetailed({
  headers,
  rows,
}: BrokerDetectionInput): BrokerDetectionResult {
  const normalizedHeaders =
    normalizeHeaders(
      headers,
    );

  if (
    normalizedHeaders.length ===
    0
  ) {
    return buildDetection({
      broker:
        "UNKNOWN",

      confidence:
        "LOW",

      reason:
        "No usable CSV headers were provided.",
    });
  }

  /*
   * Fidelity must be evaluated before Schwab because Fidelity
   * exports frequently include generic columns such as Action,
   * Symbol, Quantity, Price, and Amount.
   */
  if (
    hasAnyHeader(
      normalizedHeaders,
      [
        "run_date",
        "trade_date",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "action",
        "trans_code",
        "transaction_type",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "symbol",
        "instrument",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "quantity",
        "qty",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "price",
        "amount",
      ],
    )
  ) {
    return buildDetection({
      broker:
        "FIDELITY",

      confidence:
        "HIGH",

      reason:
        "Fidelity-style date, transaction, instrument, quantity, and price fields were detected.",
    });
  }

  if (
    hasAllHeaders(
      normalizedHeaders,
      [
        "instrument",
        "trans_code",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "quantity",
        "price",
        "amount",
      ],
    )
  ) {
    return buildDetection({
      broker:
        "FIDELITY",

      confidence:
        "HIGH",

      reason:
        "Fidelity Instrument and Trans Code headers were detected.",
    });
  }

  if (
    rowContainsAny(
      rows,
      [
        "fidelity",
        "fidelity brokerage services",
      ],
    )
  ) {
    return buildDetection({
      broker:
        "FIDELITY",

      confidence:
        "HIGH",

      reason:
        "Fidelity branding was detected in the CSV rows.",
    });
  }

  if (
    hasAllHeaders(
      normalizedHeaders,
      [
        "activity_date",
        "process_date",
        "instrument",
        "description",
      ],
    )
  ) {
    return buildDetection({
      broker:
        "ROBINHOOD",

      confidence:
        "HIGH",

      reason:
        "Robinhood activity, process-date, instrument, and description headers were detected.",
    });
  }

  if (
    hasAnyHeader(
      normalizedHeaders,
      [
        "symbol",
        "ticker",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "filled_time",
        "time",
        "order_time",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "side",
        "action",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "filled_qty",
        "quantity",
        "qty",
      ],
    )
  ) {
    return buildDetection({
      broker:
        "WEBULL",

      confidence:
        rowContainsAny(
          rows,
          [
            "webull",
          ],
        )
          ? "HIGH"
          : "MEDIUM",

      reason:
        "Webull-style filled-time, side, symbol, and filled-quantity fields were detected.",
    });
  }

  if (
    hasAnyHeader(
      normalizedHeaders,
      [
        "symbol",
        "underlying",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "date_time",
        "trade_date",
        "date",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "buy_sell",
        "side",
        "action",
      ],
    ) &&
    (
      rowContainsAny(
        rows,
        [
          "interactive brokers",
          "ibkr",
        ],
      ) ||
      hasAnyHeader(
        normalizedHeaders,
        [
          "ib_order_id",
          "ib_exec_id",
        ],
      )
    )
  ) {
    return buildDetection({
      broker:
        "INTERACTIVE_BROKERS",

      confidence:
        "HIGH",

      reason:
        "Interactive Brokers branding or IB-specific order/execution fields were detected.",
    });
  }

  if (
    hasAnyHeader(
      normalizedHeaders,
      [
        "symbol",
        "underlying",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "action",
        "transaction_type",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "quantity",
        "qty",
      ],
    ) &&
    (
      rowContainsAny(
        rows,
        [
          "tastytrade",
          "tastyworks",
        ],
      ) ||
      hasAnyHeader(
        normalizedHeaders,
        [
          "tasty_order_id",
          "order_id",
        ],
      )
    )
  ) {
    return buildDetection({
      broker:
        "TASTYTRADE",

      confidence:
        "HIGH",

      reason:
        "Tastytrade branding or order identifiers were detected.",
    });
  }

  if (
    hasAnyHeader(
      normalizedHeaders,
      [
        "symbol",
        "security",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "transaction_type",
        "action",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "quantity",
        "qty",
      ],
    ) &&
    (
      rowContainsAny(
        rows,
        [
          "etrade",
          "e*trade",
          "morgan stanley e*trade",
        ],
      ) ||
      hasAnyHeader(
        normalizedHeaders,
        [
          "account_number",
          "settlement_date",
        ],
      )
    )
  ) {
    return buildDetection({
      broker:
        "ETRADE",

      confidence:
        "HIGH",

      reason:
        "E*TRADE branding or settlement/account fields were detected.",
    });
  }

  if (
    hasAnyHeader(
      normalizedHeaders,
      [
        "symbol",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "action",
        "side",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "quantity",
        "qty",
        "shares",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "price",
        "fill_price",
      ],
    ) &&
    (
      rowContainsAny(
        rows,
        [
          "tradestation",
          "trade station",
        ],
      ) ||
      hasAnyHeader(
        normalizedHeaders,
        [
          "trade_station_order_id",
          "tradestation_order_id",
        ],
      )
    )
  ) {
    return buildDetection({
      broker:
        "TRADESTATION",

      confidence:
        "HIGH",

      reason:
        "TradeStation branding or TradeStation-specific order identifiers were detected.",
    });
  }

  if (
    hasAnyHeader(
      normalizedHeaders,
      [
        "symbol",
        "underlying",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "exec_time",
        "execution_time",
        "time",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "side",
        "action",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "qty",
        "quantity",
      ],
    ) &&
    (
      rowContainsAny(
        rows,
        [
          "thinkorswim",
          "think or swim",
          "tos",
        ],
      ) ||
      hasAnyHeader(
        normalizedHeaders,
        [
          "tos_order_id",
        ],
      )
    )
  ) {
    return buildDetection({
      broker:
        "THINKORSWIM",

      confidence:
        "HIGH",

      reason:
        "ThinkOrSwim branding or TOS-specific order identifiers were detected.",
    });
  }

  /*
   * Schwab is intentionally below Fidelity and requires a stricter
   * combination of action, symbol, quantity, price, and cash-flow fields.
   */
  if (
    hasAllHeaders(
      normalizedHeaders,
      [
        "action",
        "symbol",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "quantity",
        "qty",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "price",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "amount",
        "net_amount",
        "fees",
        "commission",
      ],
    )
  ) {
    return buildDetection({
      broker:
        "CHARLES_SCHWAB",

      confidence:
        rowContainsAny(
          rows,
          [
            "charles schwab",
            "schwab",
            "schwab & co",
          ],
        )
          ? "HIGH"
          : "MEDIUM",

      reason:
        "Schwab-style action, symbol, quantity, price, and amount/fee fields were detected.",
    });
  }

  if (
    rowContainsAny(
      rows,
      [
        "charles schwab",
        "schwab",
        "schwab & co",
      ],
    )
  ) {
    return buildDetection({
      broker:
        "CHARLES_SCHWAB",

      confidence:
        "HIGH",

      reason:
        "Charles Schwab branding was detected in the CSV rows.",
    });
  }

  if (
    hasAnyHeader(
      normalizedHeaders,
      [
        "symbol",
        "ticker",
        "instrument",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "side",
        "action",
        "transaction_type",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "quantity",
        "qty",
        "shares",
        "contracts",
      ],
    ) &&
    hasAnyHeader(
      normalizedHeaders,
      [
        "price",
        "entry_price",
        "average_price",
        "fill_price",
      ],
    )
  ) {
    return buildDetection({
      broker:
        "GENERIC",

      confidence:
        "MEDIUM",

      reason:
        "The CSV contains the minimum symbol, action, quantity, and price fields required by the generic parser.",
    });
  }

  return buildDetection({
    broker:
      "UNKNOWN",

    confidence:
      "LOW",

    reason:
      "The CSV headers and row contents did not match a supported broker format.",
  });
}

export function detectBroker(
  input: BrokerDetectionInput,
): SupportedBroker {
  return detectBrokerDetailed(
    input,
  ).broker;
}
