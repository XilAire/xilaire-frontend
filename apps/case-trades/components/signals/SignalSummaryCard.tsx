type StrategyEntryType =
  | "DEBIT"
  | "CREDIT"
  | "EVEN"
  | "UNKNOWN";

type SignalSummaryCardProps = {
  signal: any;

  /**
   * Legacy or derived strategy label fallback.
   */
  tradeStyleLabel?: string;

  legCount?: number;

  strategyEntryType?: StrategyEntryType;

  strategyNetEntry?: number | null;

  totalPaid?: number;

  totalReceived?: number;
};

function formatMoney(
  value?: number | null,
) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return `$${Number(value).toFixed(2)}`;
}

function formatStyleLabel(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const normalized =
    String(value).trim();

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

function getEntryLabel(
  type?: StrategyEntryType,
) {
  switch (type) {
    case "DEBIT":
      return "Net Debit";

    case "CREDIT":
      return "Net Credit";

    case "EVEN":
      return "Net Entry";

    default:
      return "Entry";
  }
}

function getEntryColor(
  type?: StrategyEntryType,
) {
  switch (type) {
    case "DEBIT":
      return "text-red-400";

    case "CREDIT":
      return "text-emerald-400";

    default:
      return "text-slate-200";
  }
}

function getStrategyLabel({
  signal,
  tradeStyleLabel,
}: {
  signal: any;
  tradeStyleLabel?: string;
}) {
  const storedStrategy =
    formatStyleLabel(
      signal.strategy_type,
    );

  if (
    storedStrategy !== "—"
  ) {
    return storedStrategy;
  }

  const derivedStrategy =
    formatStyleLabel(
      tradeStyleLabel,
    );

  if (
    derivedStrategy !== "—"
  ) {
    return derivedStrategy;
  }

  /*
   * Legacy fallback for older records where trade_style
   * may still contain the strategy structure.
   */
  const legacyStrategy =
    formatStyleLabel(
      signal.trade_style,
    );

  if (
    legacyStrategy !== "—"
  ) {
    return legacyStrategy;
  }

  return "Unknown Strategy";
}

function getExecutionStyleLabel(
  signal: any,
) {
  const executionStyle =
    signal.execution_style ??
    signal.trade_style;

  return formatStyleLabel(
    executionStyle,
  );
}

function SummaryMetric({
  label,
  value,
  valueClassName = "text-slate-100",
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
      <div className="break-words text-xs uppercase leading-5 tracking-wide text-slate-500">
        {label}
      </div>

      <div
        className={`mt-2 break-words text-base font-semibold leading-6 ${valueClassName}`}
      >
        {value}
      </div>
    </div>
  );
}

export default function SignalSummaryCard({
  signal,

  tradeStyleLabel,

  legCount,

  strategyEntryType,

  strategyNetEntry,

  totalPaid,

  totalReceived,
}: SignalSummaryCardProps) {
  const isOption =
    signal.instrument_type ===
    "OPTION";

  const strategyLabel =
    getStrategyLabel({
      signal,
      tradeStyleLabel,
    });

  const executionStyleLabel =
    getExecutionStyleLabel(
      signal,
    );

  const ticker =
    signal.underlying ??
    signal.asset ??
    "—";

  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-slate-900 p-4 sm:p-6">
      <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-semibold text-slate-100">
            {signal.action}{" "}
            {ticker}
          </h2>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="max-w-full break-words rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
              {strategyLabel}
            </span>

            <span className="max-w-full break-words rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
              {executionStyleLabel}
            </span>

            <span className="max-w-full break-words rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">
              {signal.instrument_type ??
                "—"}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Confidence
          </div>

          <div className="text-2xl font-bold text-emerald-400">
            {signal.confidence ??
              0}
            %
          </div>
        </div>
      </div>

      <div className="mt-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryMetric
          label="Strategy"
          value={strategyLabel}
        />

        <SummaryMetric
          label="Execution Style"
          value={executionStyleLabel}
          valueClassName="text-cyan-300"
        />

        <SummaryMetric
          label="Instrument"
          value={
            signal.instrument_type ??
            "—"
          }
        />
      </div>

      {isOption && (
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryMetric
            label={getEntryLabel(
              strategyEntryType,
            )}
            value={formatMoney(
              strategyNetEntry,
            )}
            valueClassName={`text-xl font-bold ${getEntryColor(
              strategyEntryType,
            )}`}
          />

          <SummaryMetric
            label="Premium Paid"
            value={formatMoney(
              totalPaid,
            )}
            valueClassName="text-lg font-semibold text-red-400"
          />

          <SummaryMetric
            label="Premium Received"
            value={formatMoney(
              totalReceived,
            )}
            valueClassName="text-lg font-semibold text-emerald-400"
          />

          <SummaryMetric
            label="Option Legs"
            value={legCount ?? 1}
            valueClassName="text-xl font-bold text-slate-100"
          />
        </div>
      )}
    </div>
  );
}