"use client";

import Link from "next/link";

import {
  ArrowRight,
  CalendarDays,
  HeartPulse,
  Landmark,
  PiggyBank,
  ReceiptText,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  useMemo,
} from "react";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";

import {
  useBills,
} from "@/components/providers/BillsProvider";

import {
  useDebts,
} from "@/components/providers/DebtsProvider";

import {
  useGoals,
} from "@/components/providers/GoalsProvider";

import {
  useTransactions,
} from "@/components/providers/TransactionsProvider";

import FinancialHealthFactorCard from "@/components/financial-health/FinancialHealthFactorCard";

import FinancialHealthScoreCard from "@/components/financial-health/FinancialHealthScoreCard";

import {
  buildFinancialHealthSummary,
  getFinancialHealthStatusLabel,
  type FinancialHealthAccount,
  type FinancialHealthBill,
  type FinancialHealthDebt,
  type FinancialHealthGoal,
  type FinancialHealthTransaction,
} from "@/lib/financial-health/financial-health-service";

type UnknownRecord =
  Record<
    string,
    unknown
  >;

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

const percentFormatter =
  new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits:
        1,

      maximumFractionDigits:
        1,
    },
  );

export default function FinancialHealthOverview() {
  const {
    transactions,
  } =
    useTransactions();

  const {
    accounts,
  } =
    useAccounts();

  const {
    bills,
  } =
    useBills();

  const {
    debts,
  } =
    useDebts();

  const {
    goals,
  } =
    useGoals();

  const normalizedTransactions =
    useMemo(
      () =>
        normalizeTransactions(
          transactions,
        ),
      [
        transactions,
      ],
    );

  const normalizedAccounts =
    useMemo(
      () =>
        normalizeAccounts(
          accounts,
        ),
      [
        accounts,
      ],
    );

  const normalizedBills =
    useMemo(
      () =>
        normalizeBills(
          bills,
        ),
      [
        bills,
      ],
    );

  const normalizedDebts =
    useMemo(
      () =>
        normalizeDebts(
          debts,
        ),
      [
        debts,
      ],
    );

  const normalizedGoals =
    useMemo(
      () =>
        normalizeGoals(
          goals,
        ),
      [
        goals,
      ],
    );

  const financialHealth =
    useMemo(
      () =>
        buildFinancialHealthSummary({
          transactions:
            normalizedTransactions,

          accounts:
            normalizedAccounts,

          bills:
            normalizedBills,

          debts:
            normalizedDebts,

          goals:
            normalizedGoals,
        }),
      [
        normalizedAccounts,
        normalizedBills,
        normalizedDebts,
        normalizedGoals,
        normalizedTransactions,
      ],
    );

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <FinancialHealthHeader
          startDate={
            financialHealth
              .period
              .startDate
          }
          endDate={
            financialHealth
              .period
              .endDate
          }
        />

        <FinancialHealthScoreCard
          score={
            financialHealth
              .score
          }
          status={
            financialHealth
              .status
          }
          strongestFactor={
            financialHealth
              .strongestFactor
          }
          weakestFactor={
            financialHealth
              .weakestFactor
          }
          hasEnoughData={
            financialHealth
              .hasEnoughData
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <HealthMetricCard
            label="Monthly cash flow"
            value={
              formatMoney(
                financialHealth
                  .monthlyCashFlow,
              )
            }
            description={
              financialHealth
                .monthlyCashFlow >=
              0
                ? "Income remaining after cleared expenses"
                : "Cleared expenses currently exceed income"
            }
            icon={
              financialHealth
                  .monthlyCashFlow >=
                0
                ? TrendingUp
                : TrendingDown
            }
            tone={
              financialHealth
                  .monthlyCashFlow >=
                0
                ? "positive"
                : "warning"
            }
          />

          <HealthMetricCard
            label="Savings rate"
            value={
              financialHealth
                .savingsRate ===
              null
                ? "—"
                : formatPercentage(
                    financialHealth
                      .savingsRate,
                  )
            }
            description="Share of cleared income remaining after expenses"
            icon={
              PiggyBank
            }
            tone={
              getSavingsTone(
                financialHealth
                  .savingsRate,
              )
            }
          />

          <HealthMetricCard
            label="Net worth"
            value={
              formatMoney(
                financialHealth
                  .netWorth,
              )
            }
            description="Tracked assets minus tracked liabilities"
            icon={
              Scale
            }
            tone={
              financialHealth
                  .netWorth >=
                0
                ? "positive"
                : "warning"
            }
          />

          <HealthMetricCard
            label="Emergency reserve"
            value={
              financialHealth
                .emergencyFundMonths ===
              null
                ? "—"
                : `${financialHealth.emergencyFundMonths} mo`
            }
            description={
              financialHealth
                .emergencyFundBalance >
              0
                ? `${formatMoney(
                    financialHealth
                      .emergencyFundBalance,
                  )} currently tracked`
                : "No emergency reserve identified yet"
            }
            icon={
              ShieldCheck
            }
            tone={
              getEmergencyFundTone(
                financialHealth
                  .emergencyFundMonths,
              )
            }
          />
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Health factors
            </p>

            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              What is shaping your score
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Each factor evaluates a
              different part of your
              finances. Factors without
              enough real data remain
              unscored until the
              required information is
              available.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {financialHealth
              .factors
              .map(
                (
                  factor,
                ) => (
                  <FinancialHealthFactorCard
                    key={
                      factor.id
                    }
                    factor={
                      factor
                    }
                  />
                ),
              )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <FinancialPositionSummary
            totalAssets={
              financialHealth
                .totalAssets
            }
            totalLiabilities={
              financialHealth
                .totalLiabilities
            }
            netWorth={
              financialHealth
                .netWorth
            }
            debtToAssetsRatio={
              financialHealth
                .debtToAssetsRatio
            }
          />

          <BillsHealthSummary
            overdueBillCount={
              financialHealth
                .overdueBillCount
            }
            upcomingBillCount={
              financialHealth
                .upcomingBillCount
            }
            trackedBillCount={
              normalizedBills
                .length
            }
          />
        </section>

        <HealthActionSection />
      </div>
    </div>
  );
}

function FinancialHealthHeader({
  startDate,
  endDate,
}: {
  startDate:
    string;

  endDate:
    string;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <HeartPulse className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Financial wellness
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Financial Health
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              See how cash flow,
              savings, debt, emergency
              reserves, and bill
              management are working
              together across your
              financial plan.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <CalendarDays className="h-4 w-4" />

              {formatHealthDateRange({
                startDate,
                endDate,
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard/reports"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
          >
            View reports

            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/dashboard/budget"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Review budget

            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function HealthMetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label:
    string;

  value:
    string;

  description:
    string;

  icon:
    typeof HeartPulse;

  tone:
    | "positive"
    | "neutral"
    | "warning";
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">
            {label}
          </p>

          <p
            className={[
              "mt-2 truncate text-2xl font-bold tracking-tight",
              getMetricValueClassName(
                tone,
              ),
            ].join(
              " ",
            )}
          >
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            getMetricIconClassName(
              tone,
            ),
          ].join(
            " ",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </section>
  );
}

function FinancialPositionSummary({
  totalAssets,
  totalLiabilities,
  netWorth,
  debtToAssetsRatio,
}: {
  totalAssets:
    number;

  totalLiabilities:
    number;

  netWorth:
    number;

  debtToAssetsRatio:
    number | null;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Scale className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-bold text-slate-950">
              Financial position
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              The balance between
              tracked assets and
              liabilities.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <PositionStat
          label="Total assets"
          value={
            formatMoney(
              totalAssets,
            )
          }
          icon={
            WalletCards
          }
        />

        <PositionStat
          label="Total liabilities"
          value={
            formatMoney(
              totalLiabilities,
            )
          }
          icon={
            Landmark
          }
        />

        <PositionStat
          label="Net worth"
          value={
            formatMoney(
              netWorth,
            )
          }
          icon={
            Scale
          }
        />

        <PositionStat
          label="Debt to assets"
          value={
            debtToAssetsRatio ===
            null
              ? "—"
              : formatPercentage(
                  debtToAssetsRatio,
                )
          }
          icon={
            Landmark
          }
        />

        <Link
          href="/dashboard/accounts"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 sm:col-span-2"
        >
          Manage accounts

          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function PositionStat({
  label,
  value,
  icon: Icon,
}: {
  label:
    string;

  value:
    string;

  icon:
    typeof Scale;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function BillsHealthSummary({
  overdueBillCount,
  upcomingBillCount,
  trackedBillCount,
}: {
  overdueBillCount:
    number;

  upcomingBillCount:
    number;

  trackedBillCount:
    number;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <ReceiptText className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-bold text-slate-950">
              Bill health
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Upcoming and overdue
              obligations.
            </p>
          </div>
        </div>
      </div>

      {trackedBillCount >
      0 ? (
        <div className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <BillHealthStat
              label="Overdue"
              value={
                overdueBillCount
              }
              warning={
                overdueBillCount >
                0
              }
            />

            <BillHealthStat
              label="Due within 7 days"
              value={
                upcomingBillCount
              }
              warning={
                false
              }
            />
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-950">
              {trackedBillCount} bill
              {trackedBillCount ===
              1
                ? ""
                : "s"}{" "}
              currently tracked
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Staying ahead of due
              dates helps protect cash
              flow and avoid unnecessary
              late fees.
            </p>
          </div>

          <Link
            href="/dashboard/bills"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800"
          >
            Review bills

            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="flex min-h-[250px] flex-col items-center justify-center p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <ReceiptText className="h-5 w-5" />
          </div>

          <p className="mt-4 font-bold text-slate-950">
            No bills are being tracked
          </p>

          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
            Add recurring and upcoming
            bills so payment timing can
            become part of your
            financial health score.
          </p>

          <Link
            href="/dashboard/bills"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800"
          >
            Manage bills

            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

function BillHealthStat({
  label,
  value,
  warning,
}: {
  label:
    string;

  value:
    number;

  warning:
    boolean;
}) {
  return (
    <div
      className={[
        "rounded-[20px] border p-4",
        warning
          ? "border-rose-200 bg-rose-50"
          : "border-slate-200 bg-white",
      ].join(
        " ",
      )}
    >
      <p
        className={[
          "text-xs font-bold uppercase tracking-[0.1em]",
          warning
            ? "text-rose-500"
            : "text-slate-400",
        ].join(
          " ",
        )}
      >
        {label}
      </p>

      <p
        className={[
          "mt-2 text-2xl font-black tracking-tight",
          warning
            ? "text-rose-700"
            : "text-slate-950",
        ].join(
          " ",
        )}
      >
        {Math.max(
          0,
          Math.trunc(
            value,
          ),
        )}
      </p>
    </div>
  );
}

function HealthActionSection() {
  return (
    <section>
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          Improve your position
        </p>

        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
          Keep building financial strength
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Use the core CASE Budget
          tools to improve the areas
          that matter most.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HealthActionCard
          title="Strengthen your budget"
          description="Give every dollar a purpose and increase the amount available for your priorities."
          href="/dashboard/budget"
          icon={
            WalletCards
          }
        />

        <HealthActionCard
          title="Build emergency savings"
          description="Create and fund a reserve that can absorb unexpected expenses without relying on debt."
          href="/dashboard/goals"
          icon={
            ShieldCheck
          }
        />

        <HealthActionCard
          title="Reduce debt"
          description="Track balances and direct extra cash toward the debts that are limiting your progress."
          href="/dashboard/debt"
          icon={
            Landmark
          }
        />

        <HealthActionCard
          title="Stay ahead of bills"
          description="Track due dates and upcoming obligations so they do not become expensive surprises."
          href="/dashboard/bills"
          icon={
            ReceiptText
          }
        />
      </div>
    </section>
  );
}

function HealthActionCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title:
    string;

  description:
    string;

  href:
    string;

  icon:
    typeof HeartPulse;
}) {
  return (
    <Link
      href={
        href
      }
      className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-4 font-bold text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
        Open

        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function normalizeTransactions(
  values:
    unknown[],
): FinancialHealthTransaction[] {
  return values
    .map(
      (
        value,
      ) =>
        normalizeTransaction(
          value,
        ),
    )
    .filter(
      (
        value,
      ): value is FinancialHealthTransaction =>
        value !==
        null,
    );
}

function normalizeTransaction(
  value:
    unknown,
): FinancialHealthTransaction | null {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const id =
    getString(
      record.id,
    );

  const date =
    getString(
      record.date,
    ) ??
    getString(
      record.transactionDate,
    ) ??
    getString(
      record.transaction_date,
    );

  const amount =
    getNumber(
      record.amount,
    );

  const type =
    normalizeTransactionType(
      getString(
        record.type,
      ),
    );

  const status =
    normalizeTransactionStatus(
      getString(
        record.status,
      ),
    );

  if (
    !id ||
    !date ||
    amount ===
      null ||
    !type ||
    !status
  ) {
    return null;
  }

  return {
    id,
    date,
    amount,
    type,
    status,
  };
}

function normalizeAccounts(
  values:
    unknown[],
): FinancialHealthAccount[] {
  return values
    .map(
      (
        value,
      ) =>
        normalizeAccount(
          value,
        ),
    )
    .filter(
      (
        value,
      ): value is FinancialHealthAccount =>
        value !==
        null,
    );
}

function normalizeAccount(
  value:
    unknown,
): FinancialHealthAccount | null {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const id =
    getString(
      record.id,
    );

  const type =
    getString(
      record.type,
    ) ??
    getString(
      record.accountType,
    ) ??
    getString(
      record.account_type,
    );

  const balance =
    getFirstNumber(
      record.balance,
      record.currentBalance,
      record.current_balance,
      record.availableBalance,
      record.available_balance,
    );

  if (
    !id ||
    !type ||
    balance ===
      null
  ) {
    return null;
  }

  const includeInNetWorth =
    getFirstBoolean(
      record.includeInNetWorth,
      record.include_in_net_worth,
    );

  return {
    id,
    type,
    balance,

    includeInNetWorth:
      includeInNetWorth ??
      true,
  };
}

function normalizeDebts(
  values:
    unknown[],
): FinancialHealthDebt[] {
  return values
    .map(
      (
        value,
      ) =>
        normalizeDebt(
          value,
        ),
    )
    .filter(
      (
        value,
      ): value is FinancialHealthDebt =>
        value !==
        null,
    );
}

function normalizeDebt(
  value:
    unknown,
): FinancialHealthDebt | null {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const id =
    getString(
      record.id,
    );

  const currentBalance =
    getFirstNumber(
      record.currentBalance,
      record.current_balance,
      record.balance,
      record.remainingBalance,
      record.remaining_balance,
    );

  if (
    !id ||
    currentBalance ===
      null
  ) {
    return null;
  }

  return {
    id,

    currentBalance,

    minimumPayment:
      getFirstNumber(
        record.minimumPayment,
        record.minimum_payment,
      ),

    isActive:
      getFirstBoolean(
        record.isActive,
        record.is_active,
      ) ??
      true,
  };
}

function normalizeGoals(
  values:
    unknown[],
): FinancialHealthGoal[] {
  return values
    .map(
      (
        value,
      ) =>
        normalizeGoal(
          value,
        ),
    )
    .filter(
      (
        value,
      ): value is FinancialHealthGoal =>
        value !==
        null,
    );
}

function normalizeGoal(
  value:
    unknown,
): FinancialHealthGoal | null {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const id =
    getString(
      record.id,
    );

  const name =
    getString(
      record.name,
    ) ??
    getString(
      record.title,
    );

  const currentAmount =
    getFirstNumber(
      record.currentAmount,
      record.current_amount,
      record.savedAmount,
      record.saved_amount,
      record.balance,
    ) ??
    0;

  const targetAmount =
    getFirstNumber(
      record.targetAmount,
      record.target_amount,
      record.goalAmount,
      record.goal_amount,
    ) ??
    0;

  if (
    !id ||
    !name
  ) {
    return null;
  }

  return {
    id,
    name,
    currentAmount,
    targetAmount,

    status:
      getString(
        record.status,
      ),

    isEmergencyFund:
        getFirstBoolean(
            record.isEmergencyFund,
            record.is_emergency_fund,
        ) ??
        undefined,
  };
}

function normalizeBills(
  values:
    unknown[],
): FinancialHealthBill[] {
  return values
    .map(
      (
        value,
      ) =>
        normalizeBill(
          value,
        ),
    )
    .filter(
      (
        value,
      ): value is FinancialHealthBill =>
        value !==
        null,
    );
}

function normalizeBill(
  value:
    unknown,
): FinancialHealthBill | null {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const id =
    getString(
      record.id,
    );

  const amount =
    getNumber(
      record.amount,
    ) ??
    0;

  if (
    !id
  ) {
    return null;
  }

  return {
    id,
    amount,

    status:
      getString(
        record.status,
      ),

    dueDate:
      getString(
        record.dueDate,
      ) ??
      getString(
        record.due_date,
      ),
  };
}

function normalizeTransactionType(
  value:
    string | null,
):
  | FinancialHealthTransaction["type"]
  | null {
  switch (
    value
      ?.trim()
      .toLowerCase()
  ) {
    case "income":
      return "income";

    case "expense":
      return "expense";

    case "transfer":
      return "transfer";

    default:
      return null;
  }
}

function normalizeTransactionStatus(
  value:
    string | null,
):
  | FinancialHealthTransaction["status"]
  | null {
  switch (
    value
      ?.trim()
      .toLowerCase()
  ) {
    case "cleared":
      return "cleared";

    case "pending":
      return "pending";

    default:
      return null;
  }
}

function asRecord(
  value:
    unknown,
): UnknownRecord | null {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    return null;
  }

  return value as
    UnknownRecord;
}

function getString(
  value:
    unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return (
    normalizedValue ||
    null
  );
}

function getNumber(
  value:
    unknown,
) {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsedValue =
      Number(
        value,
      );

    if (
      Number.isFinite(
        parsedValue,
      )
    ) {
      return parsedValue;
    }
  }

  return null;
}

function getFirstNumber(
  ...values:
    unknown[]
) {
  for (
    const value
    of values
  ) {
    const number =
      getNumber(
        value,
      );

    if (
      number !==
      null
    ) {
      return number;
    }
  }

  return null;
}

function getBoolean(
  value:
    unknown,
) {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  return null;
}

function getFirstBoolean(
  ...values:
    unknown[]
) {
  for (
    const value
    of values
  ) {
    const booleanValue =
      getBoolean(
        value,
      );

    if (
      booleanValue !==
      null
    ) {
      return booleanValue;
    }
  }

  return null;
}

function getSavingsTone(
  savingsRate:
    number | null,
):
  | "positive"
  | "neutral"
  | "warning" {
  if (
    savingsRate ===
    null
  ) {
    return "neutral";
  }

  if (
    savingsRate >=
    10
  ) {
    return "positive";
  }

  if (
    savingsRate >=
    0
  ) {
    return "neutral";
  }

  return "warning";
}

function getEmergencyFundTone(
  months:
    number | null,
):
  | "positive"
  | "neutral"
  | "warning" {
  if (
    months ===
    null
  ) {
    return "neutral";
  }

  if (
    months >=
    3
  ) {
    return "positive";
  }

  if (
    months >=
    1
  ) {
    return "neutral";
  }

  return "warning";
}

function getMetricValueClassName(
  tone:
    | "positive"
    | "neutral"
    | "warning",
) {
  switch (
    tone
  ) {
    case "positive":
      return "text-emerald-700";

    case "warning":
      return "text-rose-700";

    case "neutral":
    default:
      return "text-slate-950";
  }
}

function getMetricIconClassName(
  tone:
    | "positive"
    | "neutral"
    | "warning",
) {
  switch (
    tone
  ) {
    case "positive":
      return "bg-emerald-50 text-emerald-600";

    case "warning":
      return "bg-rose-50 text-rose-600";

    case "neutral":
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function formatMoney(
  value:
    number,
) {
  return moneyFormatter.format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatPercentage(
  value:
    number,
) {
  return `${percentFormatter.format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  )}%`;
}

function formatHealthDateRange({
  startDate,
  endDate,
}: {
  startDate:
    string;

  endDate:
    string;
}) {
  const start =
    parseDateKey(
      startDate,
    );

  const end =
    parseDateKey(
      endDate,
    );

  if (
    !start ||
    !end
  ) {
    return `${startDate} – ${endDate}`;
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",
      },
    );

  return `${formatter.format(
    start,
  )} – ${formatter.format(
    end,
  )}`;
}

function parseDateKey(
  value:
    string,
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