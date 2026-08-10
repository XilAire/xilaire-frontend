"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type InvestmentPerformanceRange =
  | "1D"
  | "1W"
  | "1M"
  | "3M"
  | "6M"
  | "YTD"
  | "1Y"
  | "5Y"
  | "MAX";

export type InvestmentPerformancePoint = {
  id?: string;
  date: string;

  portfolioValue: number;
  costBasis: number;
  cashValue?: number;

  dailyGain?: number;
  dailyGainPercentage?: number;
};

export type InvestmentPerformanceChartProps = {
  data: InvestmentPerformancePoint[];

  defaultRange?: InvestmentPerformanceRange;
  availableRanges?: InvestmentPerformanceRange[];

  height?: number;

  title?: string;
  description?: string;

  showCostBasis?: boolean;
  showCashBreakdown?: boolean;
  showSummaryMetrics?: boolean;
  showRangeSelector?: boolean;

  isLoading?: boolean;

  emptyTitle?: string;
  emptyDescription?: string;

  currency?: string;
  locale?: string;

  onRangeChange?: (
    range: InvestmentPerformanceRange,
  ) => void;

  className?: string;
};

type NormalizedPerformancePoint = {
  id: string;
  timestamp: number;
  date: string;

  portfolioValue: number;
  costBasis: number;
  cashValue: number;

  dailyGain: number;
  dailyGainPercentage: number;
};

type ChartPoint = NormalizedPerformancePoint & {
  x: number;
  portfolioY: number;
  costBasisY: number;
};

type ChartMetrics = {
  currentValue: number;

  totalGain: number;
  totalGainPercentage: number;

  dailyGain: number;
  dailyGainPercentage: number;

  highestValue: number;
  lowestValue: number;

  bestDay: NormalizedPerformancePoint | null;
  worstDay: NormalizedPerformancePoint | null;

  currentCashValue: number;
  currentInvestedValue: number;
  currentCashPercentage: number;
  currentInvestedPercentage: number;
};

const DEFAULT_RANGES:
  InvestmentPerformanceRange[] = [
    "1D",
    "1W",
    "1M",
    "3M",
    "6M",
    "YTD",
    "1Y",
    "5Y",
    "MAX",
  ];

const CHART_PADDING = {
  top: 22,
  right: 18,
  bottom: 34,
  left: 66,
};

const SVG_WIDTH =
  1000;

const MINIMUM_CHART_HEIGHT =
  240;

const DEFAULT_CHART_HEIGHT =
  360;

export default function InvestmentPerformanceChart({
  data,
  defaultRange = "1Y",
  availableRanges = DEFAULT_RANGES,
  height = DEFAULT_CHART_HEIGHT,
  title = "Portfolio Performance",
  description = "Track portfolio value, cost basis, gains, and cash allocation over time.",
  showCostBasis = true,
  showCashBreakdown = true,
  showSummaryMetrics = true,
  showRangeSelector = true,
  isLoading = false,
  emptyTitle = "No investment history yet",
  emptyDescription = "Portfolio history will appear after investment values or snapshots are recorded.",
  currency = "USD",
  locale = "en-US",
  onRangeChange,
  className = "",
}: InvestmentPerformanceChartProps) {
  const [
    selectedRange,
    setSelectedRange,
  ] =
    useState<InvestmentPerformanceRange>(
      defaultRange,
    );

  const [
    activePointIndex,
    setActivePointIndex,
  ] = useState<
    number | null
  >(
    null,
  );

  const svgRef =
    useRef<SVGSVGElement | null>(
      null,
    );

  useEffect(
    () => {
      if (
        availableRanges.includes(
          defaultRange,
        )
      ) {
        setSelectedRange(
          defaultRange,
        );
      }
    },
    [
      availableRanges,
      defaultRange,
    ],
  );

  const normalizedData =
    useMemo(
      () =>
        normalizePerformanceData(
          data,
        ),
      [
        data,
      ],
    );

  const filteredData =
    useMemo(
      () =>
        filterDataByRange(
          normalizedData,
          selectedRange,
        ),
      [
        normalizedData,
        selectedRange,
      ],
    );

  const metrics =
    useMemo(
      () =>
        calculateMetrics(
          filteredData,
        ),
      [
        filteredData,
      ],
    );

  const chartHeight =
    Math.max(
      MINIMUM_CHART_HEIGHT,
      height,
    );

  const plotWidth =
    SVG_WIDTH -
    CHART_PADDING.left -
    CHART_PADDING.right;

  const plotHeight =
    chartHeight -
    CHART_PADDING.top -
    CHART_PADDING.bottom;

  const yDomain =
    useMemo(
      () =>
        calculateYDomain(
          filteredData,
          showCostBasis,
        ),
      [
        filteredData,
        showCostBasis,
      ],
    );

  const chartPoints =
    useMemo(
      () =>
        createChartPoints({
          data:
            filteredData,
          plotWidth,
          plotHeight,
          yDomain,
        }),
      [
        filteredData,
        plotHeight,
        plotWidth,
        yDomain,
      ],
    );

  const portfolioPath =
    useMemo(
      () =>
        createSmoothPath(
          chartPoints.map(
            (
              point,
            ) => ({
              x:
                point.x,
              y:
                point.portfolioY,
            }),
          ),
        ),
      [
        chartPoints,
      ],
    );

  const costBasisPath =
    useMemo(
      () =>
        createSmoothPath(
          chartPoints.map(
            (
              point,
            ) => ({
              x:
                point.x,
              y:
                point.costBasisY,
            }),
          ),
        ),
      [
        chartPoints,
      ],
    );

  const areaPath =
    useMemo(
      () =>
        createAreaPath({
          points:
            chartPoints,
          plotHeight,
        }),
      [
        chartPoints,
        plotHeight,
      ],
    );

  const yTicks =
    useMemo(
      () =>
        createYTicks(
          yDomain.min,
          yDomain.max,
          5,
        ),
      [
        yDomain.max,
        yDomain.min,
      ],
    );

  const xTicks =
    useMemo(
      () =>
        createXTicks(
          filteredData,
          5,
        ),
      [
        filteredData,
      ],
    );

  const activePoint =
    activePointIndex ===
      null
      ? null
      : chartPoints[
          activePointIndex
        ] ??
        null;

  const hasChartData =
    chartPoints.length >
    0;

  const handleRangeChange =
    useCallback(
      (
        range:
          InvestmentPerformanceRange,
      ) => {
        setSelectedRange(
          range,
        );

        setActivePointIndex(
          null,
        );

        onRangeChange?.(
          range,
        );
      },
      [
        onRangeChange,
      ],
    );

  const updateActivePointFromClientX =
    useCallback(
      (
        clientX:
          number,
      ) => {
        if (
          !svgRef.current ||
          chartPoints.length ===
            0
        ) {
          return;
        }

        const bounds =
          svgRef.current.getBoundingClientRect();

        const relativeX =
          (
            clientX -
            bounds.left
          ) /
          bounds.width *
          SVG_WIDTH;

        const plotRelativeX =
          clamp(
            relativeX -
              CHART_PADDING.left,
            0,
            plotWidth,
          );

        const nearestIndex =
          findNearestPointIndex(
            chartPoints,
            plotRelativeX,
          );

        setActivePointIndex(
          nearestIndex,
        );
      },
      [
        chartPoints,
        plotWidth,
      ],
    );

  function handlePointerMove(
    event:
      PointerEvent<SVGSVGElement>,
  ) {
    updateActivePointFromClientX(
      event.clientX,
    );
  }

  function handleMouseMove(
    event:
      MouseEvent<SVGSVGElement>,
  ) {
    updateActivePointFromClientX(
      event.clientX,
    );
  }

  function handleKeyDown(
    event:
      KeyboardEvent<SVGSVGElement>,
  ) {
    if (
      chartPoints.length ===
      0
    ) {
      return;
    }

    if (
      event.key ===
      "ArrowLeft"
    ) {
      event.preventDefault();

      setActivePointIndex(
        (
          currentIndex,
        ) =>
          Math.max(
            0,
            (
              currentIndex ??
              chartPoints.length -
                1
            ) -
              1,
          ),
      );

      return;
    }

    if (
      event.key ===
      "ArrowRight"
    ) {
      event.preventDefault();

      setActivePointIndex(
        (
          currentIndex,
        ) =>
          Math.min(
            chartPoints.length -
              1,
            (
              currentIndex ??
              -1
            ) +
              1,
          ),
      );

      return;
    }

    if (
      event.key ===
      "Home"
    ) {
      event.preventDefault();

      setActivePointIndex(
        0,
      );

      return;
    }

    if (
      event.key ===
      "End"
    ) {
      event.preventDefault();

      setActivePointIndex(
        chartPoints.length -
          1,
      );

      return;
    }

    if (
      event.key ===
      "Escape"
    ) {
      setActivePointIndex(
        null,
      );
    }
  }

  return (
    <section
      className={[
        "overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm",
        className,
      ].join(
        " ",
      )}
    >
      <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {title}
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            {description}
          </p>
        </div>

        {showRangeSelector ? (
          <RangeSelector
            ranges={
              availableRanges
            }
            selectedRange={
              selectedRange
            }
            onRangeChange={
              handleRangeChange
            }
          />
        ) : null}
      </header>

      {isLoading ? (
        <PerformanceChartLoading
          height={
            chartHeight
          }
        />
      ) : !hasChartData ? (
        <PerformanceChartEmptyState
          title={
            emptyTitle
          }
          description={
            emptyDescription
          }
        />
      ) : (
        <>
          {showSummaryMetrics ? (
            <PerformanceMetricsGrid
              metrics={
                metrics
              }
              currency={
                currency
              }
              locale={
                locale
              }
            />
          ) : null}

          <div className="px-3 pb-4 pt-2 sm:px-5 sm:pb-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <ChartLegend
                showCostBasis={
                  showCostBasis
                }
              />

              <p className="text-xs text-[var(--text-muted)]">
                Use the pointer or
                arrow keys to inspect
                values.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
              <svg
                ref={
                  svgRef
                }
                viewBox={`0 0 ${SVG_WIDTH} ${chartHeight}`}
                role="img"
                aria-label={`${title}. ${formatCurrency(
                  metrics.currentValue,
                  currency,
                  locale,
                )} current portfolio value.`}
                tabIndex={
                  0
                }
                onPointerMove={
                  handlePointerMove
                }
                onMouseMove={
                  handleMouseMove
                }
                onPointerLeave={() =>
                  setActivePointIndex(
                    null,
                  )
                }
                onMouseLeave={() =>
                  setActivePointIndex(
                    null,
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                className="block h-auto w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
              >
                <defs>
                  <linearGradient
                    id="investment-performance-area"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity="0.24"
                    />

                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity="0.02"
                    />
                  </linearGradient>

                  <filter
                    id="investment-performance-shadow"
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="2"
                      stdDeviation="3"
                      floodColor="var(--primary)"
                      floodOpacity="0.2"
                    />
                  </filter>
                </defs>

                <g
                  transform={`translate(${CHART_PADDING.left}, ${CHART_PADDING.top})`}
                >
                  <ChartGrid
                    yTicks={
                      yTicks
                    }
                    xTicks={
                      xTicks
                    }
                    data={
                      filteredData
                    }
                    plotWidth={
                      plotWidth
                    }
                    plotHeight={
                      plotHeight
                    }
                    yDomain={
                      yDomain
                    }
                    currency={
                      currency
                    }
                    locale={
                      locale
                    }
                  />

                  <path
                    d={
                      areaPath
                    }
                    fill="url(#investment-performance-area)"
                  />

                  {showCostBasis ? (
                    <path
                      d={
                        costBasisPath
                      }
                      fill="none"
                      stroke="var(--text-muted)"
                      strokeWidth="2"
                      strokeDasharray="8 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.85"
                    />
                  ) : null}

                  <path
                    d={
                      portfolioPath
                    }
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#investment-performance-shadow)"
                  />

                  {activePoint ? (
                    <ActivePointMarker
                      point={
                        activePoint
                      }
                      plotHeight={
                        plotHeight
                      }
                      showCostBasis={
                        showCostBasis
                      }
                    />
                  ) : null}
                </g>
              </svg>

              {activePoint ? (
                <ChartTooltip
                  point={
                    activePoint
                  }
                  chartWidth={
                    SVG_WIDTH
                  }
                  currency={
                    currency
                  }
                  locale={
                    locale
                  }
                  showCostBasis={
                    showCostBasis
                  }
                />
              ) : null}
            </div>

            {showCashBreakdown ? (
              <CashBreakdown
                metrics={
                  metrics
                }
                currency={
                  currency
                }
                locale={
                  locale
                }
              />
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

function RangeSelector({
  ranges,
  selectedRange,
  onRangeChange,
}: {
  ranges:
    InvestmentPerformanceRange[];

  selectedRange:
    InvestmentPerformanceRange;

  onRangeChange: (
    range:
      InvestmentPerformanceRange,
  ) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Performance time range"
      className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1"
    >
      {ranges.map(
        (
          range,
        ) => {
          const isSelected =
            range ===
            selectedRange;

          return (
            <button
              key={
                range
              }
              type="button"
              aria-pressed={
                isSelected
              }
              onClick={() =>
                onRangeChange(
                  range,
                )
              }
              className={[
                "inline-flex min-h-8 shrink-0 items-center justify-center rounded-lg px-2.5 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                isSelected
                  ? "bg-[var(--surface-default)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              ].join(
                " ",
              )}
            >
              {range ===
              "MAX"
                ? "Max"
                : range}
            </button>
          );
        },
      )}
    </div>
  );
}

function PerformanceMetricsGrid({
  metrics,
  currency,
  locale,
}: {
  metrics:
    ChartMetrics;

  currency:
    string;

  locale:
    string;
}) {
  return (
    <div className="grid grid-cols-2 gap-px border-b border-[var(--border-subtle)] bg-[var(--border-subtle)] md:grid-cols-4 xl:grid-cols-8">
      <MetricCell
        label="Current Value"
        value={
          formatCurrency(
            metrics.currentValue,
            currency,
            locale,
          )
        }
      />

      <MetricCell
        label="Daily Gain"
        value={
          formatSignedCurrency(
            metrics.dailyGain,
            currency,
            locale,
          )
        }
        detail={
          formatSignedPercentage(
            metrics.dailyGainPercentage,
          )
        }
        tone={
          getNumberTone(
            metrics.dailyGain,
          )
        }
      />

      <MetricCell
        label="Total Gain"
        value={
          formatSignedCurrency(
            metrics.totalGain,
            currency,
            locale,
          )
        }
        detail={
          formatSignedPercentage(
            metrics.totalGainPercentage,
          )
        }
        tone={
          getNumberTone(
            metrics.totalGain,
          )
        }
      />

      <MetricCell
        label="Highest Value"
        value={
          formatCurrency(
            metrics.highestValue,
            currency,
            locale,
          )
        }
      />

      <MetricCell
        label="Lowest Value"
        value={
          formatCurrency(
            metrics.lowestValue,
            currency,
            locale,
          )
        }
      />

      <MetricCell
        label="Best Day"
        value={
          metrics.bestDay
            ? formatSignedCurrency(
                metrics.bestDay.dailyGain,
                currency,
                locale,
              )
            : "—"
        }
        detail={
          metrics.bestDay
            ? formatShortDate(
                metrics.bestDay.date,
                locale,
              )
            : undefined
        }
        tone="positive"
      />

      <MetricCell
        label="Worst Day"
        value={
          metrics.worstDay
            ? formatSignedCurrency(
                metrics.worstDay.dailyGain,
                currency,
                locale,
              )
            : "—"
        }
        detail={
          metrics.worstDay
            ? formatShortDate(
                metrics.worstDay.date,
                locale,
              )
            : undefined
        }
        tone="negative"
      />

      <MetricCell
        label="Invested"
        value={
          formatCurrency(
            metrics.currentInvestedValue,
            currency,
            locale,
          )
        }
        detail={
          formatPercentage(
            metrics.currentInvestedPercentage,
          )
        }
      />
    </div>
  );
}

function MetricCell({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label:
    string;

  value:
    string;

  detail?:
    string;

  tone?:
    | "positive"
    | "negative"
    | "neutral";
}) {
  const valueClassName =
    tone ===
    "positive"
      ? "text-[var(--success)]"
      : tone ===
          "negative"
        ? "text-[var(--danger)]"
        : "text-[var(--text-primary)]";

  return (
    <div className="min-w-0 bg-[var(--surface-default)] px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>

      <p
        className={[
          "mt-1 truncate text-sm font-bold",
          valueClassName,
        ].join(
          " ",
        )}
      >
        {value}
      </p>

      {detail ? (
        <p
          className={[
            "mt-0.5 truncate text-xs font-semibold",
            valueClassName,
          ].join(
            " ",
          )}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function ChartLegend({
  showCostBasis,
}: {
  showCostBasis:
    boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[var(--text-muted)]">
      <span className="inline-flex items-center gap-2">
        <span className="h-0.5 w-5 rounded-full bg-[var(--primary)]" />

        Portfolio value
      </span>

      {showCostBasis ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-5 border-t-2 border-dashed border-[var(--text-muted)]" />

          Cost basis
        </span>
      ) : null}
    </div>
  );
}

function ChartGrid({
  yTicks,
  xTicks,
  data,
  plotWidth,
  plotHeight,
  yDomain,
  currency,
  locale,
}: {
  yTicks:
    number[];

  xTicks:
    NormalizedPerformancePoint[];

  data:
    NormalizedPerformancePoint[];

  plotWidth:
    number;

  plotHeight:
    number;

  yDomain: {
    min: number;
    max: number;
  };

  currency:
    string;

  locale:
    string;
}) {
  return (
    <>
      {yTicks.map(
        (
          tick,
        ) => {
          const y =
            scaleY(
              tick,
              yDomain.min,
              yDomain.max,
              plotHeight,
            );

          return (
            <g
              key={
                `y-${tick}`
              }
            >
              <line
                x1={
                  0
                }
                x2={
                  plotWidth
                }
                y1={
                  y
                }
                y2={
                  y
                }
                stroke="var(--border-subtle)"
                strokeWidth="1"
              />

              <text
                x={
                  -12
                }
                y={
                  y +
                  4
                }
                textAnchor="end"
                fill="var(--text-muted)"
                fontSize="12"
              >
                {formatCompactCurrency(
                  tick,
                  currency,
                  locale,
                )}
              </text>
            </g>
          );
        },
      )}

      {xTicks.map(
        (
          tick,
        ) => {
          const index =
            data.findIndex(
              (
                point,
              ) =>
                point.id ===
                tick.id,
            );

          const x =
            scaleX(
              index,
              data.length,
              plotWidth,
            );

          return (
            <g
              key={
                `x-${tick.id}`
              }
            >
              <line
                x1={
                  x
                }
                x2={
                  x
                }
                y1={
                  0
                }
                y2={
                  plotHeight
                }
                stroke="var(--border-subtle)"
                strokeWidth="1"
                opacity="0.35"
              />

              <text
                x={
                  x
                }
                y={
                  plotHeight +
                  24
                }
                textAnchor="middle"
                fill="var(--text-muted)"
                fontSize="12"
              >
                {formatAxisDate(
                  tick.date,
                  locale,
                )}
              </text>
            </g>
          );
        },
      )}
    </>
  );
}

function ActivePointMarker({
  point,
  plotHeight,
  showCostBasis,
}: {
  point:
    ChartPoint;

  plotHeight:
    number;

  showCostBasis:
    boolean;
}) {
  return (
    <g>
      <line
        x1={
          point.x
        }
        x2={
          point.x
        }
        y1={
          0
        }
        y2={
          plotHeight
        }
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        opacity="0.7"
      />

      {showCostBasis ? (
        <circle
          cx={
            point.x
          }
          cy={
            point.costBasisY
          }
          r={
            5
          }
          fill="var(--surface-default)"
          stroke="var(--text-muted)"
          strokeWidth="3"
        />
      ) : null}

      <circle
        cx={
          point.x
        }
        cy={
          point.portfolioY
        }
        r={
          7
        }
        fill="var(--surface-default)"
        stroke="var(--primary)"
        strokeWidth="4"
      />
    </g>
  );
}

function ChartTooltip({
  point,
  chartWidth,
  currency,
  locale,
  showCostBasis,
}: {
  point:
    ChartPoint;

  chartWidth:
    number;

  currency:
    string;

  locale:
    string;

  showCostBasis:
    boolean;
}) {
  const leftPercentage =
    (
      point.x +
      CHART_PADDING.left
    ) /
    chartWidth *
    100;

  const alignRight =
    leftPercentage >
    68;

  const gain =
    point.portfolioValue -
    point.costBasis;

  const gainPercentage =
    point.costBasis >
    0
      ? gain /
        point.costBasis *
        100
      : 0;

  return (
    <div
      className={[
        "pointer-events-none absolute top-3 z-10 min-w-48 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] p-3 shadow-xl",
        alignRight
          ? "-translate-x-full"
          : "",
      ].join(
        " ",
      )}
      style={{
        left:
          `${leftPercentage}%`,
      }}
    >
      <p className="text-xs font-bold text-[var(--text-primary)]">
        {formatLongDate(
          point.date,
          locale,
        )}
      </p>

      <dl className="mt-2 space-y-1.5">
        <TooltipRow
          label="Portfolio"
          value={
            formatCurrency(
              point.portfolioValue,
              currency,
              locale,
            )
          }
        />

        {showCostBasis ? (
          <TooltipRow
            label="Cost basis"
            value={
              formatCurrency(
                point.costBasis,
                currency,
                locale,
              )
            }
          />
        ) : null}

        <TooltipRow
          label="Gain / loss"
          value={`${formatSignedCurrency(
            gain,
            currency,
            locale,
          )} (${formatSignedPercentage(
            gainPercentage,
          )})`}
          tone={
            getNumberTone(
              gain,
            )
          }
        />

        <TooltipRow
          label="Cash"
          value={
            formatCurrency(
              point.cashValue,
              currency,
              locale,
            )
          }
        />
      </dl>
    </div>
  );
}

function TooltipRow({
  label,
  value,
  tone = "neutral",
}: {
  label:
    string;

  value:
    string;

  tone?:
    | "positive"
    | "negative"
    | "neutral";
}) {
  const valueClassName =
    tone ===
    "positive"
      ? "text-[var(--success)]"
      : tone ===
          "negative"
        ? "text-[var(--danger)]"
        : "text-[var(--text-primary)]";

  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <dt className="text-[var(--text-muted)]">
        {label}
      </dt>

      <dd
        className={[
          "font-bold",
          valueClassName,
        ].join(
          " ",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function CashBreakdown({
  metrics,
  currency,
  locale,
}: {
  metrics:
    ChartMetrics;

  currency:
    string;

  locale:
    string;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Current Allocation
          </h3>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Cash compared with invested
            assets.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-xs font-semibold">
          <span className="inline-flex items-center gap-2 text-[var(--text-primary)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />

            Invested{" "}
            {formatCurrency(
              metrics.currentInvestedValue,
              currency,
              locale,
            )}
          </span>

          <span className="inline-flex items-center gap-2 text-[var(--text-primary)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-muted)]" />

            Cash{" "}
            {formatCurrency(
              metrics.currentCashValue,
              currency,
              locale,
            )}
          </span>
        </div>
      </div>

      <div
        role="img"
        aria-label={`${formatPercentage(
          metrics.currentInvestedPercentage,
        )} invested and ${formatPercentage(
          metrics.currentCashPercentage,
        )} cash`}
        className="mt-4 flex h-3 overflow-hidden rounded-full bg-[var(--surface-default)]"
      >
        <div
          className="h-full bg-[var(--primary)]"
          style={{
            width:
              `${metrics.currentInvestedPercentage}%`,
          }}
        />

        <div
          className="h-full bg-[var(--text-muted)]"
          style={{
            width:
              `${metrics.currentCashPercentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function PerformanceChartLoading({
  height,
}: {
  height:
    number;
}) {
  return (
    <div className="animate-pulse p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from(
          {
            length:
              4,
          },
          (
            _,
            index,
          ) => (
            <div
              key={
                index
              }
              className="rounded-xl bg-[var(--surface-muted)] p-4"
            >
              <div className="h-3 w-20 rounded bg-[var(--border-subtle)]" />

              <div className="mt-3 h-6 w-28 rounded bg-[var(--border-subtle)]" />
            </div>
          ),
        )}
      </div>

      <div
        className="mt-4 rounded-2xl bg-[var(--surface-muted)]"
        style={{
          height:
            `${height}px`,
        }}
      />
    </div>
  );
}

function PerformanceChartEmptyState({
  title,
  description,
}: {
  title:
    string;

  description:
    string;
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <ChartIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function normalizePerformanceData(
  data:
    InvestmentPerformancePoint[],
) {
  const sortedData =
    data
      .map(
        (
          point,
          index,
        ) => {
          const timestamp =
            parseDateTimestamp(
              point.date,
            );

          const portfolioValue =
            normalizeFiniteNumber(
              point.portfolioValue,
            );

          const costBasis =
            normalizeFiniteNumber(
              point.costBasis,
            );

          const cashValue =
            Math.max(
              0,
              normalizeFiniteNumber(
                point.cashValue ??
                0,
              ),
            );

          return {
            id:
              point.id ??
              `${point.date}-${index}`,

            timestamp,

            date:
              point.date,

            portfolioValue,

            costBasis,

            cashValue,

            dailyGain:
              normalizeFiniteNumber(
                point.dailyGain ??
                0,
              ),

            dailyGainPercentage:
              normalizeFiniteNumber(
                point.dailyGainPercentage ??
                0,
              ),
          };
        },
      )
      .filter(
        (
          point,
        ) =>
          Number.isFinite(
            point.timestamp,
          ),
      )
      .sort(
        (
          firstPoint,
          secondPoint,
        ) =>
          firstPoint.timestamp -
          secondPoint.timestamp,
      );

  return sortedData.map(
    (
      point,
      index,
    ) => {
      if (
        index ===
        0
      ) {
        return point;
      }

      const previousPoint =
        sortedData[
          index -
          1
        ];

      const calculatedDailyGain =
        point.portfolioValue -
        previousPoint.portfolioValue;

      const calculatedDailyGainPercentage =
        previousPoint.portfolioValue >
        0
          ? calculatedDailyGain /
            previousPoint.portfolioValue *
            100
          : 0;

      return {
        ...point,

        dailyGain:
          point.dailyGain !==
          0
            ? point.dailyGain
            : calculatedDailyGain,

        dailyGainPercentage:
          point.dailyGainPercentage !==
          0
            ? point.dailyGainPercentage
            : calculatedDailyGainPercentage,
      };
    },
  );
}

function filterDataByRange(
  data:
    NormalizedPerformancePoint[],
  range:
    InvestmentPerformanceRange,
) {
  if (
    data.length ===
    0 ||
    range ===
    "MAX"
  ) {
    return data;
  }

  const latestTimestamp =
    data[
      data.length -
      1
    ].timestamp;

  const latestDate =
    new Date(
      latestTimestamp,
    );

  let startTimestamp =
    latestTimestamp;

  switch (
    range
  ) {
    case "1D":
      startTimestamp =
        latestTimestamp -
        24 *
        60 *
        60 *
        1000;
      break;

    case "1W":
      startTimestamp =
        latestTimestamp -
        7 *
        24 *
        60 *
        60 *
        1000;
      break;

    case "1M":
      startTimestamp =
        subtractMonths(
          latestDate,
          1,
        ).getTime();
      break;

    case "3M":
      startTimestamp =
        subtractMonths(
          latestDate,
          3,
        ).getTime();
      break;

    case "6M":
      startTimestamp =
        subtractMonths(
          latestDate,
          6,
        ).getTime();
      break;

    case "YTD":
      startTimestamp =
        new Date(
          latestDate.getFullYear(),
          0,
          1,
        ).getTime();
      break;

    case "1Y":
      startTimestamp =
        subtractYears(
          latestDate,
          1,
        ).getTime();
      break;

    case "5Y":
      startTimestamp =
        subtractYears(
          latestDate,
          5,
        ).getTime();
      break;

    default:
      return data;
  }

  const filteredData =
    data.filter(
      (
        point,
      ) =>
        point.timestamp >=
        startTimestamp,
    );

  return filteredData.length >
    0
      ? filteredData
      : data.slice(
          -1,
        );
}

function calculateMetrics(
  data:
    NormalizedPerformancePoint[],
): ChartMetrics {
  if (
    data.length ===
    0
  ) {
    return {
      currentValue:
        0,

      totalGain:
        0,

      totalGainPercentage:
        0,

      dailyGain:
        0,

      dailyGainPercentage:
        0,

      highestValue:
        0,

      lowestValue:
        0,

      bestDay:
        null,

      worstDay:
        null,

      currentCashValue:
        0,

      currentInvestedValue:
        0,

      currentCashPercentage:
        0,

      currentInvestedPercentage:
        0,
    };
  }

  const currentPoint =
    data[
      data.length -
      1
    ];

  const totalGain =
    currentPoint.portfolioValue -
    currentPoint.costBasis;

  const totalGainPercentage =
    currentPoint.costBasis >
    0
      ? totalGain /
        currentPoint.costBasis *
        100
      : 0;

  const highestValue =
    Math.max(
      ...data.map(
        (
          point,
        ) =>
          point.portfolioValue,
      ),
    );

  const lowestValue =
    Math.min(
      ...data.map(
        (
          point,
        ) =>
          point.portfolioValue,
      ),
    );

  const pointsWithDailyChanges =
    data.filter(
      (
        _point,
        index,
      ) =>
        index >
        0,
    );

  const bestDay =
    pointsWithDailyChanges.length >
    0
      ? pointsWithDailyChanges.reduce(
          (
            currentBest,
            point,
          ) =>
            point.dailyGain >
            currentBest.dailyGain
              ? point
              : currentBest,
        )
      : null;

  const worstDay =
    pointsWithDailyChanges.length >
    0
      ? pointsWithDailyChanges.reduce(
          (
            currentWorst,
            point,
          ) =>
            point.dailyGain <
            currentWorst.dailyGain
              ? point
              : currentWorst,
        )
      : null;

  const currentCashValue =
    Math.min(
      currentPoint.portfolioValue,
      Math.max(
        0,
        currentPoint.cashValue,
      ),
    );

  const currentInvestedValue =
    Math.max(
      0,
      currentPoint.portfolioValue -
      currentCashValue,
    );

  const currentCashPercentage =
    currentPoint.portfolioValue >
    0
      ? currentCashValue /
        currentPoint.portfolioValue *
        100
      : 0;

  const currentInvestedPercentage =
    currentPoint.portfolioValue >
    0
      ? currentInvestedValue /
        currentPoint.portfolioValue *
        100
      : 0;

  return {
    currentValue:
      currentPoint.portfolioValue,

    totalGain,

    totalGainPercentage,

    dailyGain:
      currentPoint.dailyGain,

    dailyGainPercentage:
      currentPoint.dailyGainPercentage,

    highestValue,

    lowestValue,

    bestDay,

    worstDay,

    currentCashValue,

    currentInvestedValue,

    currentCashPercentage,

    currentInvestedPercentage,
  };
}

function calculateYDomain(
  data:
    NormalizedPerformancePoint[],
  includeCostBasis:
    boolean,
) {
  const values =
    data.flatMap(
      (
        point,
      ) =>
        includeCostBasis
          ? [
              point.portfolioValue,
              point.costBasis,
            ]
          : [
              point.portfolioValue,
            ],
    );

  if (
    values.length ===
    0
  ) {
    return {
      min:
        0,
      max:
        1,
    };
  }

  const rawMinimum =
    Math.min(
      ...values,
    );

  const rawMaximum =
    Math.max(
      ...values,
    );

  if (
    rawMinimum ===
    rawMaximum
  ) {
    const padding =
      Math.max(
        1,
        Math.abs(
          rawMaximum,
        ) *
          0.1,
      );

    return {
      min:
        rawMinimum -
        padding,

      max:
        rawMaximum +
        padding,
    };
  }

  const padding =
    (
      rawMaximum -
      rawMinimum
    ) *
    0.12;

  return {
    min:
      Math.max(
        0,
        rawMinimum -
        padding,
      ),

    max:
      rawMaximum +
      padding,
  };
}

function createChartPoints({
  data,
  plotWidth,
  plotHeight,
  yDomain,
}: {
  data:
    NormalizedPerformancePoint[];

  plotWidth:
    number;

  plotHeight:
    number;

  yDomain: {
    min: number;
    max: number;
  };
}) {
  return data.map(
    (
      point,
      index,
    ) => ({
      ...point,

      x:
        scaleX(
          index,
          data.length,
          plotWidth,
        ),

      portfolioY:
        scaleY(
          point.portfolioValue,
          yDomain.min,
          yDomain.max,
          plotHeight,
        ),

      costBasisY:
        scaleY(
          point.costBasis,
          yDomain.min,
          yDomain.max,
          plotHeight,
        ),
    }),
  );
}

function createSmoothPath(
  points:
    {
      x: number;
      y: number;
    }[],
) {
  if (
    points.length ===
    0
  ) {
    return "";
  }

  if (
    points.length ===
    1
  ) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path =
    `M ${points[0].x} ${points[0].y}`;

  for (
    let index =
      1;
    index <
    points.length;
    index +=
      1
  ) {
    const previousPoint =
      points[
        index -
        1
      ];

    const currentPoint =
      points[
        index
      ];

    const midpointX =
      (
        previousPoint.x +
        currentPoint.x
      ) /
      2;

    path +=
      ` C ${midpointX} ${previousPoint.y}, ${midpointX} ${currentPoint.y}, ${currentPoint.x} ${currentPoint.y}`;
  }

  return path;
}

function createAreaPath({
  points,
  plotHeight,
}: {
  points:
    ChartPoint[];

  plotHeight:
    number;
}) {
  if (
    points.length ===
    0
  ) {
    return "";
  }

  const linePath =
    createSmoothPath(
      points.map(
        (
          point,
        ) => ({
          x:
            point.x,
          y:
            point.portfolioY,
        }),
      ),
    );

  const firstPoint =
    points[
      0
    ];

  const lastPoint =
    points[
      points.length -
      1
    ];

  return `${linePath} L ${lastPoint.x} ${plotHeight} L ${firstPoint.x} ${plotHeight} Z`;
}

function createYTicks(
  minimum:
    number,
  maximum:
    number,
  tickCount:
    number,
) {
  if (
    tickCount <=
    1
  ) {
    return [
      minimum,
    ];
  }

  const interval =
    (
      maximum -
      minimum
    ) /
    (
      tickCount -
      1
    );

  return Array.from(
    {
      length:
        tickCount,
    },
    (
      _,
      index,
    ) =>
      minimum +
      interval *
      index,
  );
}

function createXTicks(
  data:
    NormalizedPerformancePoint[],
  maximumTickCount:
    number,
) {
  if (
    data.length <=
    maximumTickCount
  ) {
    return data;
  }

  const tickIndexes =
    new Set<number>();

  for (
    let index =
      0;
    index <
    maximumTickCount;
    index +=
      1
  ) {
    tickIndexes.add(
      Math.round(
        index /
        (
          maximumTickCount -
          1
        ) *
        (
          data.length -
          1
        ),
      ),
    );
  }

  return Array.from(
    tickIndexes,
  )
    .sort(
      (
        firstIndex,
        secondIndex,
      ) =>
        firstIndex -
        secondIndex,
    )
    .map(
      (
        index,
      ) =>
        data[
          index
        ],
    );
}

function scaleX(
  index:
    number,
  pointCount:
    number,
  plotWidth:
    number,
) {
  if (
    pointCount <=
    1
  ) {
    return plotWidth /
      2;
  }

  return index /
    (
      pointCount -
      1
    ) *
    plotWidth;
}

function scaleY(
  value:
    number,
  minimum:
    number,
  maximum:
    number,
  plotHeight:
    number,
) {
  if (
    maximum ===
    minimum
  ) {
    return plotHeight /
      2;
  }

  const normalizedValue =
    (
      value -
      minimum
    ) /
    (
      maximum -
      minimum
    );

  return plotHeight -
    normalizedValue *
    plotHeight;
}

function findNearestPointIndex(
  points:
    ChartPoint[],
  x:
    number,
) {
  let nearestIndex =
    0;

  let nearestDistance =
    Number.POSITIVE_INFINITY;

  points.forEach(
    (
      point,
      index,
    ) => {
      const distance =
        Math.abs(
          point.x -
          x,
        );

      if (
        distance <
        nearestDistance
      ) {
        nearestDistance =
          distance;

        nearestIndex =
          index;
      }
    },
  );

  return nearestIndex;
}

function parseDateTimestamp(
  value:
    string,
) {
  const date =
    value.length <=
    10
      ? new Date(
          `${value}T00:00:00`,
        )
      : new Date(
          value,
        );

  return date.getTime();
}

function subtractMonths(
  date:
    Date,
  monthCount:
    number,
) {
  const result =
    new Date(
      date,
    );

  result.setMonth(
    result.getMonth() -
    monthCount,
  );

  return result;
}

function subtractYears(
  date:
    Date,
  yearCount:
    number,
) {
  const result =
    new Date(
      date,
    );

  result.setFullYear(
    result.getFullYear() -
    yearCount,
  );

  return result;
}

function normalizeFiniteNumber(
  value:
    number,
) {
  return Number.isFinite(
    value,
  )
    ? value
    : 0;
}

function clamp(
  value:
    number,
  minimum:
    number,
  maximum:
    number,
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}

function getNumberTone(
  value:
    number,
) {
  if (
    value >
    0
  ) {
    return "positive" as const;
  }

  if (
    value <
    0
  ) {
    return "negative" as const;
  }

  return "neutral" as const;
}

function formatCurrency(
  value:
    number,
  currency:
    string,
  locale:
    string,
) {
  return new Intl.NumberFormat(
    locale,
    {
      style:
        "currency",
      currency,
      minimumFractionDigits:
        2,
      maximumFractionDigits:
        2,
    },
  ).format(
    normalizeFiniteNumber(
      value,
    ),
  );
}

function formatSignedCurrency(
  value:
    number,
  currency:
    string,
  locale:
    string,
) {
  const normalizedValue =
    normalizeFiniteNumber(
      value,
    );

  if (
    normalizedValue >
    0
  ) {
    return `+${formatCurrency(
      normalizedValue,
      currency,
      locale,
    )}`;
  }

  return formatCurrency(
    normalizedValue,
    currency,
    locale,
  );
}

function formatCompactCurrency(
  value:
    number,
  currency:
    string,
  locale:
    string,
) {
  return new Intl.NumberFormat(
    locale,
    {
      style:
        "currency",
      currency,
      notation:
        "compact",
      maximumFractionDigits:
        1,
    },
  ).format(
    normalizeFiniteNumber(
      value,
    ),
  );
}

function formatPercentage(
  value:
    number,
) {
  return `${normalizeFiniteNumber(
    value,
  ).toFixed(
    1,
  )}%`;
}

function formatSignedPercentage(
  value:
    number,
) {
  const normalizedValue =
    normalizeFiniteNumber(
      value,
    );

  const prefix =
    normalizedValue >
    0
      ? "+"
      : "";

  return `${prefix}${normalizedValue.toFixed(
    2,
  )}%`;
}

function formatAxisDate(
  value:
    string,
  locale:
    string,
) {
  const date =
    new Date(
      value.length <=
      10
        ? `${value}T00:00:00`
        : value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    locale,
    {
      month:
        "short",
      day:
        "numeric",
    },
  );
}

function formatShortDate(
  value:
    string,
  locale:
    string,
) {
  const date =
    new Date(
      value.length <=
      10
        ? `${value}T00:00:00`
        : value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    locale,
    {
      month:
        "short",
      day:
        "numeric",
    },
  );
}

function formatLongDate(
  value:
    string,
  locale:
    string,
) {
  const date =
    new Date(
      value.length <=
      10
        ? `${value}T00:00:00`
        : value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    locale,
    {
      weekday:
        "short",
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
    },
  );
}

function ChartIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-7" />
    </svg>
  );
}
