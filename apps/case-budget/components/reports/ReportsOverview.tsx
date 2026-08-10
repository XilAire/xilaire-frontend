"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  CircleDollarSign,
  FileBarChart,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";

import {
  useApp,
} from "@/components/providers/AppProvider";

import {
  type NetWorthHistoryPoint,
  useNetWorth,
} from "@/components/providers/NetWorthProvider";

import {
  useTransactions,
} from "@/components/providers/TransactionsProvider";

import CustomReportDateRangeModal from "@/components/reports/CustomReportDateRangeModal";

import FinancialOverviewCard from "@/components/reports/FinancialOverviewCard";

import FinancialPositionCard from "@/components/reports/FinancialPositionCard";

import PendingClearedActivityCard from "@/components/reports/PendingClearedActivityCard";

import ReportCatalog from "@/components/reports/ReportCatalog";

import {
  IncomeBreakdownCard,
  SpendingBreakdownCard,
} from "@/components/reports/ReportBreakdownCard";

import ReportMetricCard from "@/components/reports/ReportMetricCard";

import ReportsEmptyState from "@/components/reports/ReportsEmptyState";

import ReportsHeader from "@/components/reports/ReportsHeader";

import ReportTrendCard, {
  type ReportTrendMode,
} from "@/components/reports/ReportTrendCard";

import ReportingPeriodCard from "@/components/reports/ReportingPeriodCard";

import SpendingByAccountCard from "@/components/reports/SpendingByAccountCard";

import {
  buildReportCsv,
  downloadReportCsv,
  printReportPage,
} from "@/lib/reports/reports-export";

import {
  buildReportSummary,
  calculateExpenseRatio,
  calculatePeriodChange,
  calculateSavingsRate,
  formatReportDateRange,
  getPreviousDateRange,
  resolveReportDateRange,
  type ReportDateRange,
  type ReportPeriodPreset,
} from "@/lib/reports/reports-service";

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

export default function ReportsOverview() {
  const {
    activeWorkspace,
  } =
    useApp();

  const {
    accounts,
  } =
    useAccounts();

  const {
    transactions,
  } =
    useTransactions();

  const {
    history:
      netWorthHistory,
  } =
    useNetWorth();

  const [
    periodPreset,
    setPeriodPreset,
  ] =
    useState<ReportPeriodPreset>(
      "this-month",
    );

  const [
    chartMode,
    setChartMode,
  ] =
    useState<ReportTrendMode>(
      "cash-flow",
    );

  const [
    customDateRange,
    setCustomDateRange,
  ] =
    useState<ReportDateRange>(
      () =>
        resolveReportDateRange({
          preset:
            "this-month",
        }),
    );

  const [
    isCustomRangeModalOpen,
    setIsCustomRangeModalOpen,
  ] =
    useState(
      false,
    );

  const dateRange =
    useMemo(
      () =>
        periodPreset ===
        "custom"
          ? customDateRange
          : resolveReportDateRange({
              preset:
                periodPreset,
            }),
      [
        customDateRange,
        periodPreset,
      ],
    );

  const previousDateRange =
    useMemo(
      () =>
        getPreviousDateRange(
          dateRange,
        ),
      [
        dateRange,
      ],
    );

  const report =
    useMemo(
      () =>
        buildReportSummary({
          transactions,
          accounts,
          dateRange,
        }),
      [
        accounts,
        dateRange,
        transactions,
      ],
    );

  const previousReport =
    useMemo(
      () =>
        buildReportSummary({
          transactions,
          accounts,
          dateRange:
            previousDateRange,
        }),
      [
        accounts,
        previousDateRange,
        transactions,
      ],
    );

  const sortedNetWorthHistory =
    useMemo(
      () =>
        [
          ...netWorthHistory,
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
        netWorthHistory,
      ],
    );

  const currentPeriodNetWorthSnapshot =
    useMemo(
      () =>
        getLatestSnapshotInRange(
          sortedNetWorthHistory,
          dateRange,
        ),
      [
        dateRange,
        sortedNetWorthHistory,
      ],
    );

  const previousPeriodNetWorthSnapshot =
    useMemo(
      () =>
        getLatestSnapshotInRange(
          sortedNetWorthHistory,
          previousDateRange,
        ),
      [
        previousDateRange,
        sortedNetWorthHistory,
      ],
    );

  const clearedIncome =
    report.transactionTotals
      .clearedIncome;

  const clearedExpenses =
    report.transactionTotals
      .clearedExpenses;

  const netCashFlow =
    clearedIncome -
    clearedExpenses;

  const previousIncome =
    previousReport
      .transactionTotals
      .clearedIncome;

  const previousExpenses =
    previousReport
      .transactionTotals
      .clearedExpenses;

  const previousNetCashFlow =
    previousIncome -
    previousExpenses;

  const incomeChange =
    calculatePeriodChange(
      clearedIncome,
      previousIncome,
    );

  const spendingChange =
    calculatePeriodChange(
      clearedExpenses,
      previousExpenses,
    );

  const cashFlowChange =
    calculatePeriodChange(
      netCashFlow,
      previousNetCashFlow,
    );

  const netWorthChange =
    currentPeriodNetWorthSnapshot &&
    previousPeriodNetWorthSnapshot
      ? calculatePeriodChange(
          currentPeriodNetWorthSnapshot
            .netWorth,
          previousPeriodNetWorthSnapshot
            .netWorth,
        )
      : null;

  const displayedNetWorth =
    currentPeriodNetWorthSnapshot
      ?.netWorth ??
    report.accountTotals
      .netWorth;

  const netWorthDescription =
    currentPeriodNetWorthSnapshot
      ? `Snapshot from ${formatSnapshotDate(
          currentPeriodNetWorthSnapshot
            .date,
        )}`
      : report.accountTotals
            .includedAccountCount >
          0
        ? "Current net worth; no snapshot in selected period"
        : "No accounts included yet";

  const savingsRate =
    calculateSavingsRate(
      clearedIncome,
      clearedExpenses,
    );

  const expenseRatio =
    calculateExpenseRatio(
      clearedIncome,
      clearedExpenses,
    );

  const hasTransactions =
    report.transactionTotals
      .transactionCount >
    0;

  const hasClearedActivity =
    clearedIncome >
      0 ||
    clearedExpenses >
      0;

  const useMonthlyChart =
    periodPreset ===
      "year-to-date" ||
    periodPreset ===
      "last-90-days" ||
    (
      periodPreset ===
        "custom" &&
      getDateRangeDayCount(
        dateRange,
      ) >
        45
    );

  function handlePeriodChange(
    preset:
      ReportPeriodPreset,
  ) {
    if (
      preset ===
      "custom"
    ) {
      setIsCustomRangeModalOpen(
        true,
      );

      return;
    }

    setPeriodPreset(
      preset,
    );
  }

  function handleOpenCustomRange() {
    setIsCustomRangeModalOpen(
      true,
    );
  }

  function handleApplyCustomRange(
    nextDateRange:
      ReportDateRange,
  ) {
    setCustomDateRange(
      nextDateRange,
    );

    setPeriodPreset(
      "custom",
    );

    setIsCustomRangeModalOpen(
      false,
    );
  }

  function handleExportCsv() {
    const file =
      buildReportCsv({
        report,

        workspaceName:
          activeWorkspace?.name ??
          null,

        sections: [
          "summary",
          "spending",
          "income",
          "accounts",
          "monthly-trend",
          "daily-trend",
        ],
      });

    downloadReportCsv(
      file,
    );
  }

  function handlePrintReport() {
    printReportPage();
  }

  return (
    <div className="min-h-full bg-slate-50/70 print:bg-white">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 print:max-w-none print:gap-4 print:px-0 print:py-0">
        <ReportsHeader
          dateRangeLabel={
            formatReportDateRange(
              dateRange,
            )
          }
          onExportCsv={
            handleExportCsv
          }
          onPrint={
            handlePrintReport
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ReportMetricCard
            label="Income"
            value={
              formatMoney(
                clearedIncome,
              )
            }
            description="Cleared income during this reporting period"
            icon={
              TrendingUp
            }
            comparison={{
              amount:
                incomeChange.amount,

              percentage:
                incomeChange.percentage,

              positiveIsGood:
                true,
            }}
          />

          <ReportMetricCard
            label="Spending"
            value={
              formatMoney(
                clearedExpenses,
              )
            }
            description="Cleared expenses during this reporting period"
            icon={
              TrendingDown
            }
            comparison={{
              amount:
                spendingChange.amount,

              percentage:
                spendingChange.percentage,

              positiveIsGood:
                false,
            }}
          />

          <ReportMetricCard
            label="Net cash flow"
            value={
              formatMoney(
                netCashFlow,
              )
            }
            description="Cleared income minus cleared spending"
            icon={
              CircleDollarSign
            }
            accent
            comparison={{
              amount:
                cashFlowChange.amount,

              percentage:
                cashFlowChange.percentage,

              positiveIsGood:
                true,
            }}
          />

          <ReportMetricCard
            label="Net worth"
            value={
              formatMoney(
                displayedNetWorth,
              )
            }
            description={
              netWorthDescription
            }
            icon={
              Scale
            }
            comparison={
              netWorthChange
                ? {
                    amount:
                      netWorthChange.amount,

                    percentage:
                      netWorthChange.percentage,

                    positiveIsGood:
                      true,

                    comparisonLabel:
                      "vs previous snapshot period",
                  }
                : undefined
            }
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
          <FinancialOverviewCard
            hasActivity={
              hasClearedActivity
            }
            income={
              clearedIncome
            }
            expenses={
              clearedExpenses
            }
            netCashFlow={
              netCashFlow
            }
            savingsRate={
              savingsRate
            }
            expenseRatio={
              expenseRatio
            }
          />

          <ReportingPeriodCard
            periodPreset={
              periodPreset
            }
            dateRangeLabel={
              formatReportDateRange(
                dateRange,
              )
            }
            previousDateRangeLabel={
              formatReportDateRange(
                previousDateRange,
              )
            }
            onPeriodChange={
              handlePeriodChange
            }
            onCustomRangeClick={
              handleOpenCustomRange
            }
          />
        </section>

        <PendingClearedActivityCard
          clearedIncome={
            report.transactionTotals
              .clearedIncome
          }
          pendingIncome={
            report.transactionTotals
              .pendingIncome
          }
          clearedExpenses={
            report.transactionTotals
              .clearedExpenses
          }
          pendingExpenses={
            report.transactionTotals
              .pendingExpenses
          }
          clearedTransactionCount={
            report.transactionTotals
              .clearedTransactionCount
          }
          pendingTransactionCount={
            report.transactionTotals
              .pendingTransactionCount
          }
        />

        <ReportTrendCard
          chartMode={
            chartMode
          }
          onChartModeChange={
            setChartMode
          }
          monthlyTrend={
            report.monthlyTrend
          }
          dailyTrend={
            report.dailyTrend
          }
          useMonthlyChart={
            useMonthlyChart
          }
          hasActivity={
            hasClearedActivity
          }
        />

        <section className="grid gap-6 xl:grid-cols-2">
          <SpendingBreakdownCard
            items={
              report.spendingByCategory
            }
          />

          <IncomeBreakdownCard
            items={
              report.incomeByCategory
            }
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <SpendingByAccountCard
            items={
              report.spendingByAccount
            }
          />

          <FinancialPositionCard
            totalAssets={
              report.accountTotals
                .totalAssets
            }
            totalLiabilities={
              report.accountTotals
                .totalLiabilities
            }
            netWorth={
              report.accountTotals
                .netWorth
            }
            accountCount={
              report.accountTotals
                .includedAccountCount
            }
          />
        </section>

        <ReportCatalog />

        {!hasTransactions ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <ReportsEmptyState
              icon={
                FileBarChart
              }
              title="Your report history will appear here"
              description="Record income and expenses to begin building real financial reports for this workspace."
              href="/dashboard/transactions"
              actionLabel="Add financial activity"
            />

            <ReportsEmptyState
              icon={
                Sparkles
              }
              title="Insights grow with your history"
              description="As CASE Budget collects real financial history, this area can surface meaningful changes and patterns without relying on demonstration data."
              href="/dashboard"
              actionLabel="Return to dashboard"
            />
          </section>
        ) : null}
      </div>

      <CustomReportDateRangeModal
        open={
          isCustomRangeModalOpen
        }
        initialRange={
          customDateRange
        }
        onClose={() =>
          setIsCustomRangeModalOpen(
            false,
          )
        }
        onApply={
          handleApplyCustomRange
        }
      />
    </div>
  );
}

function getLatestSnapshotInRange(
  history:
    NetWorthHistoryPoint[],
  dateRange:
    ReportDateRange,
) {
  const matchingSnapshots =
    history.filter(
      (
        point,
      ) =>
        point.date >=
          dateRange.startDate &&
        point.date <=
          dateRange.endDate,
    );

  return (
    matchingSnapshots[
      matchingSnapshots.length -
        1
    ] ??
    null
  );
}

function getDateRangeDayCount(
  dateRange:
    ReportDateRange,
) {
  const start =
    parseReportDate(
      dateRange.startDate,
    );

  const end =
    parseReportDate(
      dateRange.endDate,
    );

  if (
    !start ||
    !end
  ) {
    return 0;
  }

  const millisecondsPerDay =
    24 *
    60 *
    60 *
    1000;

  const startUtc =
    Date.UTC(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );

  const endUtc =
    Date.UTC(
      end.getFullYear(),
      end.getMonth(),
      end.getDate(),
    );

  return (
    Math.floor(
      (
        endUtc -
        startUtc
      ) /
        millisecondsPerDay,
    ) +
    1
  );
}

function parseReportDate(
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
    return null;
  }

  const date =
    new Date(
      year,
      month -
        1,
      day,
    );

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month -
        1 ||
    date.getDate() !==
      day
  ) {
    return null;
  }

  return date;
}

function formatSnapshotDate(
  value: string,
) {
  const date =
    parseReportDate(
      value,
    );

  if (
    !date
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

      year:
        "numeric",
    },
  ).format(
    date,
  );
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
