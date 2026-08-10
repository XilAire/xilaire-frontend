"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  Landmark,
  Loader2,
  MoreHorizontal,
  Plus,
  Scale,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";

import DeleteNetWorthSnapshotModal from "@/components/net-worth/DeleteNetWorthSnapshotModal";

import {
  type NetWorthHistoryPoint,
  useNetWorth,
} from "@/components/providers/NetWorthProvider";

type TrendDirection =
  | "up"
  | "down"
  | "flat";

type NetWorthTrendSummary = {
  amount: number;
  percentage: number | null;
  direction: TrendDirection;
};

type ChartPoint = {
  x: number;
  y: number;
  point: NetWorthHistoryPoint;
};

type SnapshotFeedback = {
  type:
    | "success"
    | "error";
  message: string;
} | null;

const CHART_WIDTH =
  1000;

const CHART_HEIGHT =
  280;

const CHART_PADDING_X =
  24;

const CHART_PADDING_Y =
  24;

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(
    value,
  );
}

function formatCompactCurrency(
  value: number,
) {
  const absoluteValue =
    Math.abs(
      value,
    );

  if (
    absoluteValue >=
    1_000_000
  ) {
    return `$${(
      value /
      1_000_000
    ).toFixed(
      1,
    )}M`;
  }

  if (
    absoluteValue >=
    1_000
  ) {
    return `$${(
      value /
      1_000
    ).toFixed(
      1,
    )}K`;
  }

  return formatCurrency(
    value,
  );
}

function formatDate(
  value: string,
) {
  const date =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(
    date,
  );
}

function formatMonth(
  value: string,
) {
  const date =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      year: "2-digit",
    },
  ).format(
    date,
  );
}

function getTrendSummary(
  history:
    NetWorthHistoryPoint[],
): NetWorthTrendSummary {
  if (
    history.length <
    2
  ) {
    return {
      amount: 0,
      percentage: null,
      direction: "flat",
    };
  }

  const current =
    history[
      history.length -
        1
    ];

  const previous =
    history[
      history.length -
        2
    ];

  const amount =
    current.netWorth -
    previous.netWorth;

  let percentage:
    number | null =
    null;

  if (
    previous.netWorth !==
    0
  ) {
    percentage =
      (
        amount /
        Math.abs(
          previous.netWorth,
        )
      ) *
      100;
  }

  return {
    amount,

    percentage,

    direction:
      amount > 0
        ? "up"
        : amount < 0
        ? "down"
        : "flat",
  };
}

function getNetWorthRatio(
  totalAssets: number,
  totalLiabilities: number,
) {
  if (
    totalAssets <=
    0
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      (
        (
          totalAssets -
          totalLiabilities
        ) /
        totalAssets
      ) *
        100,
    ),
  );
}

function buildChartPoints(
  history:
    NetWorthHistoryPoint[],
): ChartPoint[] {
  if (
    history.length ===
    0
  ) {
    return [];
  }

  const values =
    history.map(
      (
        point,
      ) =>
        point.netWorth,
    );

  const minimumValue =
    Math.min(
      ...values,
    );

  const maximumValue =
    Math.max(
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

  return history.map(
    (
      point,
      index,
    ) => {
      const x =
        history.length ===
        1
          ? CHART_WIDTH /
            2
          : CHART_PADDING_X +
            (
              index /
              (
                history.length -
                1
              )
            ) *
              availableWidth;

      const normalizedValue =
        (
          point.netWorth -
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
        x,
        y,
        point,
      };
    },
  );
}

function buildChartPath(
  points:
    ChartPoint[],
) {
  if (
    points.length ===
    0
  ) {
    return "";
  }

  return points
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
}

export default function NetWorthOverview() {
  const {
    totalAssets,
    totalLiabilities,
    netWorth,
    history,
    isLoadingHistory,
    isRecordingSnapshot,
    historyError,
    recordSnapshot,
    clearHistoryError,
  } =
    useNetWorth();

  const [
    snapshotFeedback,
    setSnapshotFeedback,
  ] =
    useState<SnapshotFeedback>(
      null,
    );

  const [
    snapshotToDelete,
    setSnapshotToDelete,
  ] =
    useState<
      NetWorthHistoryPoint | null
    >(
      null,
    );

  const sortedHistory =
    useMemo(
      () =>
        [
          ...history,
        ].sort(
          (
            firstPoint,
            secondPoint,
          ) =>
            firstPoint.date.localeCompare(
              secondPoint.date,
            ),
        ),
      [
        history,
      ],
    );

  const trend =
    useMemo(
      () =>
        getTrendSummary(
          sortedHistory,
        ),
      [
        sortedHistory,
      ],
    );

  const chartPoints =
    useMemo(
      () =>
        buildChartPoints(
          sortedHistory,
        ),
      [
        sortedHistory,
      ],
    );

  const chartPath =
    useMemo(
      () =>
        buildChartPath(
          chartPoints,
        ),
      [
        chartPoints,
      ],
    );

  const netWorthRatio =
    getNetWorthRatio(
      totalAssets,
      totalLiabilities,
    );

  const latestSnapshot =
    sortedHistory[
      sortedHistory.length -
        1
    ] ??
    null;

  const hasFinancialData =
    totalAssets !==
      0 ||
    totalLiabilities !==
      0;

  const hasHistory =
    sortedHistory.length >
    0;

  async function handleRecordSnapshot() {
    if (
      isRecordingSnapshot
    ) {
      return;
    }

    clearHistoryError();

    setSnapshotFeedback(
      null,
    );

    const result =
      await recordSnapshot();

    if (
      !result
    ) {
      setSnapshotFeedback({
        type:
          "error",

        message:
          "The net worth snapshot could not be recorded.",
      });

      return;
    }

    setSnapshotFeedback({
      type:
        "success",

      message:
        `Net worth snapshot recorded for ${formatDate(
          result.date,
        )}.`,
    });
  }

  function dismissFeedback() {
    setSnapshotFeedback(
      null,
    );

    clearHistoryError();
  }

  const visibleError =
    historyError ??
    (
      snapshotFeedback?.type ===
      "error"
        ? snapshotFeedback.message
        : null
    );

  const visibleSuccess =
    snapshotFeedback?.type ===
    "success"
      ? snapshotFeedback.message
      : null;

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                  Wealth
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Net Worth
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                  See what you own,
                  what you owe, and
                  how your overall
                  financial position
                  changes over time.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={
                  handleRecordSnapshot
                }
                disabled={
                  isRecordingSnapshot
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRecordingSnapshot ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />

                    Recording...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4.5 w-4.5" />

                    Record snapshot
                  </>
                )}
              </button>

              <Link
                href="/dashboard/accounts"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                <Plus className="h-4.5 w-4.5" />

                Manage accounts
              </Link>
            </div>
          </div>
        </section>

        {visibleError ? (
          <InlineFeedback
            type="error"
            message={
              visibleError
            }
            onDismiss={
              dismissFeedback
            }
          />
        ) : visibleSuccess ? (
          <InlineFeedback
            type="success"
            message={
              visibleSuccess
            }
            onDismiss={
              dismissFeedback
            }
          />
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Net worth"
            value={formatCurrency(
              netWorth,
            )}
            description={
              netWorth >=
              0
                ? "Assets minus liabilities"
                : "Liabilities currently exceed assets"
            }
            icon={
              Scale
            }
            emphasis
          />

          <SummaryCard
            label="Total assets"
            value={formatCurrency(
              totalAssets,
            )}
            description="Accounts included in net worth"
            icon={
              WalletCards
            }
          />

          <SummaryCard
            label="Total liabilities"
            value={formatCurrency(
              totalLiabilities,
            )}
            description="Debt balances included in net worth"
            icon={
              Landmark
            }
          />

          <TrendSummaryCard
            trend={
              trend
            }
            hasHistory={
              sortedHistory.length >=
              2
            }
          />
        </section>

        {!hasFinancialData ? (
          <EmptyNetWorthState />
        ) : (
          <>
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      Net worth trend
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Your recorded
                      financial position
                      over time.
                    </p>
                  </div>

                  {latestSnapshot ? (
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Latest snapshot
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {formatDate(
                          latestSnapshot.date,
                        )}
                      </p>
                    </div>
                  ) : null}
                </div>

                {isLoadingHistory ? (
                  <HistoryLoadingState />
                ) : hasHistory ? (
                  <div className="p-5 sm:p-6">
                    <NetWorthChart
                      history={
                        sortedHistory
                      }
                      points={
                        chartPoints
                      }
                      path={
                        chartPath
                      }
                    />
                  </div>
                ) : (
                  <HistoryEmptyState
                    isRecording={
                      isRecordingSnapshot
                    }
                    onRecordSnapshot={
                      handleRecordSnapshot
                    }
                  />
                )}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Scale className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-950">
                      Financial position
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      How much of your
                      assets remain after
                      liabilities.
                    </p>
                  </div>
                </div>

                <div className="mt-7">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        Asset coverage
                      </p>

                      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                        {netWorthRatio.toFixed(
                          1,
                        )}
                        %
                      </p>
                    </div>

                    <p className="text-sm font-bold text-emerald-700">
                      {formatCurrency(
                        netWorth,
                      )}
                    </p>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-[width]"
                      style={{
                        width:
                          `${netWorthRatio}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-7 space-y-3">
                  <PositionRow
                    label="Assets"
                    value={
                      totalAssets
                    }
                    icon={
                      WalletCards
                    }
                  />

                  <PositionRow
                    label="Liabilities"
                    value={
                      totalLiabilities
                    }
                    icon={
                      Landmark
                    }
                  />

                  <div className="border-t border-slate-100 pt-3">
                    <PositionRow
                      label="Net worth"
                      value={
                        netWorth
                      }
                      icon={
                        Scale
                      }
                      strong
                    />
                  </div>
                </div>

                <Link
                  href="/dashboard/accounts"
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                >
                  Review accounts

                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <InsightCard
                title="Grow your assets"
                description="Checking, savings, cash, and investment accounts included in net worth increase your asset total."
                icon={
                  WalletCards
                }
                href="/dashboard/accounts"
                linkLabel="Manage accounts"
              />

              <InsightCard
                title="Reduce liabilities"
                description="As debt balances fall, the liability side of your net worth falls with them."
                icon={
                  Landmark
                }
                href="/dashboard/debt"
                linkLabel="Open debt payoff"
              />

              <InsightCard
                title="Track the trend"
                description="Snapshots help you see whether your overall financial position is improving."
                icon={
                  TrendingUp
                }
                onClick={
                  handleRecordSnapshot
                }
                disabled={
                  isRecordingSnapshot
                }
                linkLabel={
                  isRecordingSnapshot
                    ? "Recording..."
                    : "Record snapshot"
                }
              />
            </section>
          </>
        )}

        {isLoadingHistory ? (
          null
        ) : hasHistory ? (
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-950">
                Net worth history
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Recorded snapshots of
                assets, liabilities,
                and net worth.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {[
                ...sortedHistory,
              ]
                .reverse()
                .map(
                  (
                    point,
                  ) => (
                    <HistoryRow
                      key={
                        point.id
                      }
                      point={
                        point
                      }
                      onDelete={() =>
                        setSnapshotToDelete(
                          point,
                        )
                      }
                    />
                  ),
                )}
            </div>
          </section>
        ) : null}
      </div>

      <DeleteNetWorthSnapshotModal
        open={
          snapshotToDelete !==
          null
        }
        snapshot={
          snapshotToDelete
        }
        onClose={() =>
          setSnapshotToDelete(
            null,
          )
        }
      />
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  icon:
    typeof Scale;
  emphasis?: boolean;
};

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
  emphasis = false,
}: SummaryCardProps) {
  return (
    <div
      className={[
        "rounded-[24px] border bg-white p-5 shadow-sm",
        emphasis
          ? "border-emerald-200"
          : "border-slate-200",
      ].join(
        " ",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">
            {label}
          </p>

          <p
            className={[
              "mt-2 truncate text-2xl font-bold tracking-tight",
              emphasis
                ? "text-emerald-700"
                : "text-slate-950",
            ].join(
              " ",
            )}
          >
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {
              description
            }
          </p>
        </div>

        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            emphasis
              ? "bg-emerald-100 text-emerald-700"
              : "bg-emerald-50 text-emerald-600",
          ].join(
            " ",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function TrendSummaryCard({
  trend,
  hasHistory,
}: {
  trend:
    NetWorthTrendSummary;
  hasHistory:
    boolean;
}) {
  const isPositive =
    trend.direction ===
    "up";

  const isNegative =
    trend.direction ===
    "down";

  const Icon =
    isPositive
      ? ArrowUpRight
      : isNegative
      ? ArrowDownRight
      : TrendingUp;

  const value =
    hasHistory
      ? `${trend.amount >= 0 ? "+" : ""}${formatCurrency(
          trend.amount,
        )}`
      : "No trend yet";

  const description =
    !hasHistory
      ? "Record at least two snapshots"
      : trend.percentage !==
        null
      ? `${trend.percentage >= 0 ? "+" : ""}${trend.percentage.toFixed(
          1,
        )}% from previous snapshot`
      : "Change from previous snapshot";

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">
            Latest change
          </p>

          <p
            className={[
              "mt-2 truncate text-2xl font-bold tracking-tight",
              isPositive
                ? "text-emerald-700"
                : isNegative
                ? "text-rose-600"
                : "text-slate-950",
            ].join(
              " ",
            )}
          >
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {
              description
            }
          </p>
        </div>

        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            isPositive
              ? "bg-emerald-50 text-emerald-600"
              : isNegative
              ? "bg-rose-50 text-rose-600"
              : "bg-slate-100 text-slate-500",
          ].join(
            " ",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function InlineFeedback({
  type,
  message,
  onDismiss,
}: {
  type:
    "success" | "error";
  message:
    string;
  onDismiss:
    () => void;
}) {
  const isSuccess =
    type ===
    "success";

  return (
    <div
      role={
        isSuccess
          ? "status"
          : "alert"
      }
      className={[
        "flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 shadow-sm",
        isSuccess
          ? "border-emerald-200 bg-emerald-50"
          : "border-rose-200 bg-rose-50",
      ].join(
        " ",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            isSuccess
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700",
          ].join(
            " ",
          )}
        >
          {isSuccess ? (
            <Check className="h-4.5 w-4.5" />
          ) : (
            <AlertCircle className="h-4.5 w-4.5" />
          )}
        </span>

        <div>
          <p
            className={[
              "text-sm font-bold",
              isSuccess
                ? "text-emerald-900"
                : "text-rose-900",
            ].join(
              " ",
            )}
          >
            {isSuccess
              ? "Snapshot saved"
              : "Snapshot error"}
          </p>

          <p
            className={[
              "mt-1 text-sm leading-6",
              isSuccess
                ? "text-emerald-700"
                : "text-rose-700",
            ].join(
              " ",
            )}
          >
            {message}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={
          onDismiss
        }
        aria-label="Dismiss message"
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
          isSuccess
            ? "text-emerald-700 hover:bg-emerald-100"
            : "text-rose-700 hover:bg-rose-100",
        ].join(
          " ",
        )}
      >
        <X className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}

function EmptyNetWorthState() {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-14 text-center sm:px-8 sm:py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-50 text-emerald-600">
          <Scale className="h-8 w-8" />
        </div>

        <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
          Build your complete
          financial picture
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
          Add the accounts you
          own and the balances
          you owe. CASE Budget
          will use them to
          calculate your net
          worth automatically.
        </p>

        <Link
          href="/dashboard/accounts"
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          <Plus className="h-5 w-5" />

          Add your first account

          <ArrowRight className="h-4 w-4" />
        </Link>

        <div className="mt-10 grid w-full gap-3 text-left sm:grid-cols-3">
          <EmptyBenefit
            title="Track assets"
            description="Include cash, savings, property, and investments."
          />

          <EmptyBenefit
            title="Track liabilities"
            description="Include credit cards, loans, and other balances owed."
          />

          <EmptyBenefit
            title="See progress"
            description="Watch your net worth change as balances move."
          />
        </div>
      </div>
    </section>
  );
}

type EmptyBenefitProps = {
  title: string;
  description: string;
};

function EmptyBenefit({
  title,
  description,
}: EmptyBenefitProps) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-950">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {
          description
        }
      </p>
    </div>
  );
}

function HistoryLoadingState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>

      <h3 className="mt-5 font-bold text-slate-950">
        Loading net worth history
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Retrieving your recorded
        snapshots for this
        workspace.
      </p>
    </div>
  );
}

function HistoryEmptyState({
  isRecording,
  onRecordSnapshot,
}: {
  isRecording:
    boolean;
  onRecordSnapshot:
    () => void;
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <BarChart3 className="h-6 w-6" />
      </div>

      <h3 className="mt-5 font-bold text-slate-950">
        No net worth history yet
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Record your current
        financial position to
        start building a trend.
      </p>

      <button
        type="button"
        onClick={
          onRecordSnapshot
        }
        disabled={
          isRecording
        }
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRecording ? (
          <>
            <Loader2 className="h-4.5 w-4.5 animate-spin" />

            Recording...
          </>
        ) : (
          <>
            <BarChart3 className="h-4.5 w-4.5" />

            Record first snapshot
          </>
        )}
      </button>
    </div>
  );
}

function NetWorthChart({
  history,
  points,
  path,
}: {
  history:
    NetWorthHistoryPoint[];
  points:
    ChartPoint[];
  path:
    string;
}) {
  if (
    history.length ===
    0 ||
    points.length ===
    0
  ) {
    return null;
  }

  const values =
    history.map(
      (
        point,
      ) =>
        point.netWorth,
    );

  const minimumValue =
    Math.min(
      ...values,
    );

  const maximumValue =
    Math.max(
      ...values,
    );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Current
          </p>

          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            {formatCurrency(
              history[
                history.length -
                  1
              ].netWorth,
            )}
          </p>
        </div>

        <div className="flex gap-6 text-right">
          <div>
            <p className="text-xs text-slate-400">
              High
            </p>

            <p className="mt-1 text-sm font-bold text-slate-700">
              {formatCompactCurrency(
                maximumValue,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">
              Low
            </p>

            <p className="mt-1 text-sm font-bold text-slate-700">
              {formatCompactCurrency(
                minimumValue,
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[620px]">
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="h-[280px] w-full overflow-visible"
            role="img"
            aria-label="Net worth history chart"
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

            {points.length >
            1 ? (
              <path
                d={
                  path
                }
                fill="none"
                stroke="currentColor"
                className="text-emerald-500"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {points.map(
              (
                chartPoint,
              ) => (
                <g
                  key={
                    chartPoint.point.id
                  }
                >
                  <circle
                    cx={
                      chartPoint.x
                    }
                    cy={
                      chartPoint.y
                    }
                    r="9"
                    fill="currentColor"
                    className="text-emerald-600"
                  />

                  <circle
                    cx={
                      chartPoint.x
                    }
                    cy={
                      chartPoint.y
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
                  history.length,
                )}, minmax(0, 1fr))`,
            }}
          >
            {history.map(
              (
                point,
              ) => (
                <div
                  key={
                    point.id
                  }
                  className="text-center"
                >
                  <p className="text-xs font-semibold text-slate-500">
                    {formatMonth(
                      point.date,
                    )}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-400">
                    {formatCompactCurrency(
                      point.netWorth,
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

function PositionRow({
  label,
  value,
  icon: Icon,
  strong = false,
}: {
  label:
    string;
  value:
    number;
  icon:
    typeof Scale;
  strong?:
    boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl px-1 py-2">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Icon className="h-4.5 w-4.5" />
        </div>

        <span
          className={[
            "text-sm",
            strong
              ? "font-bold text-slate-950"
              : "font-semibold text-slate-600",
          ].join(
            " ",
          )}
        >
          {label}
        </span>
      </div>

      <span
        className={[
          "text-sm font-bold",
          strong
            ? value >=
              0
              ? "text-emerald-700"
              : "text-rose-600"
            : "text-slate-950",
        ].join(
          " ",
        )}
      >
        {formatCurrency(
          value,
        )}
      </span>
    </div>
  );
}

function InsightCard({
  title,
  description,
  icon: Icon,
  href,
  linkLabel,
  onClick,
  disabled = false,
}: {
  title:
    string;
  description:
    string;
  icon:
    typeof Scale;
  href?:
    string;
  linkLabel:
    string;
  onClick?:
    () => void;
  disabled?:
    boolean;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-5 font-bold text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {
          description
        }
      </p>

      {href ? (
        <Link
          href={
            href
          }
          className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
        >
          {
            linkLabel
          }

          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={
            onClick
          }
          disabled={
            disabled
          }
          className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}

          {
            linkLabel
          }

          {!disabled ? (
            <ArrowRight className="h-4 w-4" />
          ) : null}
        </button>
      )}
    </div>
  );
}

function HistoryRow({
  point,
  onDelete,
}: {
  point:
    NetWorthHistoryPoint;
  onDelete:
    () => void;
}) {
  return (
    <div className="grid gap-4 p-5 sm:grid-cols-[minmax(160px,1fr)_repeat(3,minmax(130px,0.8fr))_44px] sm:items-center sm:px-6">
      <div>
        <p className="font-bold text-slate-950">
          {formatDate(
            point.date,
          )}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Recorded snapshot
        </p>
      </div>

      <HistoryValue
        label="Assets"
        value={
          point.totalAssets
        }
      />

      <HistoryValue
        label="Liabilities"
        value={
          point.totalLiabilities
        }
      />

      <HistoryValue
        label="Net worth"
        value={
          point.netWorth
        }
        highlight
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={
            onDelete
          }
          aria-label={`Delete net worth snapshot from ${formatDate(
            point.date,
          )}`}
          title="Delete snapshot"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function HistoryValue({
  label,
  value,
  highlight = false,
}: {
  label:
    string;
  value:
    number;
  highlight?:
    boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 sm:hidden">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-sm font-bold sm:mt-0",
          highlight
            ? value >=
              0
              ? "text-emerald-700"
              : "text-rose-600"
            : "text-slate-700",
        ].join(
          " ",
        )}
      >
        {formatCurrency(
          value,
        )}
      </p>

      <p className="mt-1 hidden text-xs text-slate-400 sm:block">
        {label}
      </p>
    </div>
  );
}