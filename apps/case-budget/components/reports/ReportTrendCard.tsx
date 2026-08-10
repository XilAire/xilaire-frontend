"use client";

import {
  useMemo,
} from "react";

import {
  LineChart,
} from "lucide-react";

import type {
  ReportDailyPoint,
  ReportMonthlyPoint,
} from "@/lib/reports/reports-service";

export type ReportTrendMode =
  | "income"
  | "expenses"
  | "cash-flow";

export type ReportTrendCardProps = {
  chartMode:
    ReportTrendMode;

  onChartModeChange: (
    mode:
      ReportTrendMode,
  ) => void;

  monthlyTrend:
    ReportMonthlyPoint[];

  dailyTrend:
    ReportDailyPoint[];

  useMonthlyChart:
    boolean;

  hasActivity:
    boolean;
};

type ChartDataPoint = {
  key: string;
  label: string;
  value: number;
};

const CHART_WIDTH =
  1000;

const CHART_HEIGHT =
  280;

const CHART_PADDING_X =
  28;

const CHART_PADDING_Y =
  24;

const moneyFormatter =
  new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    },
  );

const compactMoneyFormatter =
  new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",

      notation:
        "compact",

      maximumFractionDigits:
        1,
    },
  );

export default function ReportTrendCard({
  chartMode,
  onChartModeChange,
  monthlyTrend,
  dailyTrend,
  useMonthlyChart,
  hasActivity,
}: ReportTrendCardProps) {
  const points =
    useMemo(
      () =>
        useMonthlyChart
          ? mapMonthlyTrendToChart(
              monthlyTrend,
              chartMode,
            )
          : mapDailyTrendToChart(
              dailyTrend,
              chartMode,
            ),
      [
        chartMode,
        dailyTrend,
        monthlyTrend,
        useMonthlyChart,
      ],
    );

  const hasChartValues =
    points.some(
      (
        point,
      ) =>
        point.value !==
        0,
    );

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <LineChart className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-bold text-slate-950">
              Financial trend
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {useMonthlyChart
                ? "Monthly performance across the selected period."
                : "Daily performance across the selected period."}
            </p>
          </div>
        </div>

        <ChartModeSelector
          value={
            chartMode
          }
          onChange={
            onChartModeChange
          }
        />
      </div>

      {!hasActivity ||
      !hasChartValues ? (
        <div className="flex min-h-[330px] flex-col items-center justify-center px-5 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <LineChart className="h-6 w-6" />
          </div>

          <h3 className="mt-5 font-bold text-slate-950">
            No trend to display yet
          </h3>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Cleared financial activity
            in this reporting period
            will automatically build
            this chart.
          </p>
        </div>
      ) : (
        <FinancialTrendChart
          points={
            points
          }
          chartMode={
            chartMode
          }
        />
      )}
    </section>
  );
}

function ChartModeSelector({
  value,
  onChange,
}: {
  value:
    ReportTrendMode;

  onChange: (
    value:
      ReportTrendMode,
  ) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl bg-slate-100 p-1">
      <ChartModeButton
        active={
          value ===
          "cash-flow"
        }
        label="Cash flow"
        onClick={() =>
          onChange(
            "cash-flow",
          )
        }
      />

      <ChartModeButton
        active={
          value ===
          "income"
        }
        label="Income"
        onClick={() =>
          onChange(
            "income",
          )
        }
      />

      <ChartModeButton
        active={
          value ===
          "expenses"
        }
        label="Spending"
        onClick={() =>
          onChange(
            "expenses",
          )
        }
      />
    </div>
  );
}

function ChartModeButton({
  active,
  label,
  onClick,
}: {
  active:
    boolean;

  label:
    string;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "rounded-xl px-3 py-2 text-xs font-bold transition sm:px-4",
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-500 hover:text-slate-800",
      ].join(
        " ",
      )}
    >
      {label}
    </button>
  );
}

function FinancialTrendChart({
  points,
  chartMode,
}: {
  points:
    ChartDataPoint[];

  chartMode:
    ReportTrendMode;
}) {
  const values =
    points.map(
      (
        point,
      ) =>
        point.value,
    );

  const minimumValue =
    Math.min(
      0,
      ...values,
    );

  const maximumValue =
    Math.max(
      0,
      ...values,
    );

  const valueRange =
    Math.max(
      1,
      maximumValue -
        minimumValue,
    );

  const availableWidth =
    CHART_WIDTH -
    CHART_PADDING_X *
      2;

  const availableHeight =
    CHART_HEIGHT -
    CHART_PADDING_Y *
      2;

  const chartPoints =
    points.map(
      (
        point,
        index,
      ) => {
        const x =
          points.length ===
          1
            ? CHART_WIDTH /
              2
            : CHART_PADDING_X +
              (
                index /
                (
                  points.length -
                  1
                )
              ) *
                availableWidth;

        const normalizedValue =
          (
            point.value -
            minimumValue
          ) /
          valueRange;

        const y =
          CHART_PADDING_Y +
          (
            1 -
            normalizedValue
          ) *
            availableHeight;

        return {
          ...point,
          x,
          y,
        };
      },
    );

  const path =
    chartPoints
      .map(
        (
          point,
          index,
        ) =>
          `${
            index ===
            0
              ? "M"
              : "L"
          } ${point.x} ${point.y}`,
      )
      .join(
        " ",
      );

  const zeroY =
    CHART_PADDING_Y +
    (
      1 -
      (
        (
          0 -
          minimumValue
        ) /
        valueRange
      )
    ) *
      availableHeight;

  const latestValue =
    points[
      points.length -
        1
    ]?.value ??
    0;

  const highValue =
    Math.max(
      ...values,
    );

  const lowValue =
    Math.min(
      ...values,
    );

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            Latest
          </p>

          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            {formatMoney(
              latestValue,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {getChartModeLabel(
              chartMode,
            )}
          </p>
        </div>

        <div className="flex gap-6">
          <ChartSummaryValue
            label="High"
            value={
              highValue
            }
          />

          <ChartSummaryValue
            label="Low"
            value={
              lowValue
            }
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="h-[280px] w-full overflow-visible"
            role="img"
            aria-label={`${getChartModeLabel(
              chartMode,
            )} financial report trend`}
          >
            <line
              x1="0"
              y1={
                CHART_HEIGHT *
                0.25
              }
              x2={
                CHART_WIDTH
              }
              y2={
                CHART_HEIGHT *
                0.25
              }
              stroke="currentColor"
              className="text-slate-100"
              strokeWidth="2"
            />

            <line
              x1="0"
              y1={
                CHART_HEIGHT *
                0.5
              }
              x2={
                CHART_WIDTH
              }
              y2={
                CHART_HEIGHT *
                0.5
              }
              stroke="currentColor"
              className="text-slate-100"
              strokeWidth="2"
            />

            <line
              x1="0"
              y1={
                CHART_HEIGHT *
                0.75
              }
              x2={
                CHART_WIDTH
              }
              y2={
                CHART_HEIGHT *
                0.75
              }
              stroke="currentColor"
              className="text-slate-100"
              strokeWidth="2"
            />

            {minimumValue <
              0 &&
            maximumValue >
              0 ? (
              <line
                x1="0"
                y1={
                  zeroY
                }
                x2={
                  CHART_WIDTH
                }
                y2={
                  zeroY
                }
                stroke="currentColor"
                className="text-slate-300"
                strokeWidth="2"
                strokeDasharray="8 8"
              />
            ) : null}

            {chartPoints.length >
            1 ? (
              <path
                d={
                  path
                }
                fill="none"
                stroke="currentColor"
                className="text-emerald-500"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {chartPoints.map(
              (
                point,
              ) => (
                <g
                  key={
                    point.key
                  }
                >
                  <circle
                    cx={
                      point.x
                    }
                    cy={
                      point.y
                    }
                    r="9"
                    fill="currentColor"
                    className="text-emerald-600"
                  />

                  <circle
                    cx={
                      point.x
                    }
                    cy={
                      point.y
                    }
                    r="4"
                    fill="white"
                  />
                </g>
              ),
            )}
          </svg>

          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns:
                `repeat(${Math.max(
                  1,
                  points.length,
                )}, minmax(0, 1fr))`,
            }}
          >
            {points.map(
              (
                point,
              ) => (
                <div
                  key={
                    point.key
                  }
                  className="min-w-0 text-center"
                >
                  <p className="truncate text-[11px] font-semibold text-slate-500">
                    {point.label}
                  </p>

                  <p className="mt-1 truncate text-[10px] text-slate-400">
                    {formatCompactMoney(
                      point.value,
                    )}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartSummaryValue({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div className="text-right">
      <p className="text-xs font-semibold text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-700">
        {formatCompactMoney(
          value,
        )}
      </p>
    </div>
  );
}

function mapMonthlyTrendToChart(
  points:
    ReportMonthlyPoint[],

  mode:
    ReportTrendMode,
): ChartDataPoint[] {
  return points.map(
    (
      point,
    ) => ({
      key:
        point.month,

      label:
        point.label,

      value:
        getTrendValue(
          point,
          mode,
        ),
    }),
  );
}

function mapDailyTrendToChart(
  points:
    ReportDailyPoint[],

  mode:
    ReportTrendMode,
): ChartDataPoint[] {
  return thinDailyPoints(
    points,
  ).map(
    (
      point,
    ) => ({
      key:
        point.date,

      label:
        formatShortDate(
          point.date,
        ),

      value:
        getTrendValue(
          point,
          mode,
        ),
    }),
  );
}

function thinDailyPoints(
  points:
    ReportDailyPoint[],
) {
  if (
    points.length <=
    15
  ) {
    return points;
  }

  const desiredPoints =
    15;

  const step =
    Math.max(
      1,
      Math.floor(
        points.length /
          desiredPoints,
      ),
    );

  const selected =
    points.filter(
      (
        _point,
        index,
      ) =>
        index %
          step ===
        0,
    );

  const finalPoint =
    points[
      points.length -
        1
    ];

  if (
    finalPoint &&
    selected[
      selected.length -
        1
    ]?.date !==
      finalPoint.date
  ) {
    selected.push(
      finalPoint,
    );
  }

  return selected;
}

function getTrendValue(
  point: {
    income:
      number;

    expenses:
      number;

    netCashFlow:
      number;
  },

  mode:
    ReportTrendMode,
) {
  switch (
    mode
  ) {
    case "income":
      return point.income;

    case "expenses":
      return point.expenses;

    case "cash-flow":
    default:
      return point.netCashFlow;
  }
}

function getChartModeLabel(
  mode:
    ReportTrendMode,
) {
  switch (
    mode
  ) {
    case "income":
      return "Income";

    case "expenses":
      return "Spending";

    case "cash-flow":
    default:
      return "Net cash flow";
  }
}

function formatMoney(
  value: number,
) {
  return moneyFormatter.format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatCompactMoney(
  value: number,
) {
  return compactMoneyFormatter.format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatShortDate(
  value: string,
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split(
        "-",
      )
      .map(
        Number,
      );

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",
    },
  ).format(
    new Date(
      year,
      month -
        1,
      day,
    ),
  );
}