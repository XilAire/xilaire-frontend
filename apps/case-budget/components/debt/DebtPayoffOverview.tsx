"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Landmark,
  MoreHorizontal,
  Plus,
  ReceiptText,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";

import AddDebtModal from "@/components/debt/AddDebtModal";
import DebtDetailsModal from "@/components/debt/DebtDetailsModal";

import {
  type DebtData,
  useDebts,
} from "@/components/providers/DebtsProvider";

type DebtFilter =
  | "active"
  | "paid-off"
  | "all";

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

function formatInterestRate(
  value: number,
) {
  return `${value.toFixed(2)}%`;
}

function getDebtProgress(
  debt: DebtData,
) {
  if (
    debt.originalBalance <=
    0
  ) {
    return debt.currentBalance <=
      0
      ? 100
      : 0;
  }

  const paidAmount =
    Math.max(
      0,
      debt.originalBalance -
        debt.currentBalance,
    );

  return Math.min(
    100,
    Math.max(
      0,
      (
        paidAmount /
        debt.originalBalance
      ) * 100,
    ),
  );
}

function getPaidAmount(
  debt: DebtData,
) {
  return Math.max(
    0,
    debt.originalBalance -
      debt.currentBalance,
  );
}

function getDebtTypeLabel(
  debt: DebtData,
) {
  switch (
    debt.type
  ) {
    case "credit-card":
      return "Credit card";

    case "personal-loan":
      return "Personal loan";

    case "student-loan":
      return "Student loan";

    case "auto-loan":
      return "Auto loan";

    case "mortgage":
      return "Mortgage";

    case "medical":
      return "Medical";

    case "other":
    default:
      return "Other";
  }
}

function getDebtIcon(
  debt: DebtData,
) {
  switch (
    debt.type
  ) {
    case "credit-card":
      return CreditCard;

    case "personal-loan":
      return Banknote;

    case "student-loan":
      return Landmark;

    case "auto-loan":
      return ReceiptText;

    case "mortgage":
      return Landmark;

    case "medical":
      return ShieldCheck;

    case "other":
    default:
      return CircleDollarSign;
  }
}

export default function DebtPayoffOverview() {
  const {
    debts,
    activeDebts,
    paidOffDebts,
    totalDebt,
    totalMinimumPayments,
  } =
    useDebts();

  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<DebtFilter>(
      "active",
    );

  const [
    isAddDebtOpen,
    setIsAddDebtOpen,
  ] =
    useState(
      false,
    );

  const [
    selectedDebtId,
    setSelectedDebtId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const selectedDebt =
    useMemo(
      () =>
        selectedDebtId
          ? debts.find(
              (
                debt,
              ) =>
                debt.id ===
                selectedDebtId,
            ) ??
            null
          : null,
      [
        debts,
        selectedDebtId,
      ],
    );

  const filteredDebts =
    useMemo(
      () => {
        switch (
          selectedFilter
        ) {
          case "active":
            return activeDebts;

          case "paid-off":
            return paidOffDebts;

          case "all":
          default:
            return debts;
        }
      },
      [
        activeDebts,
        debts,
        paidOffDebts,
        selectedFilter,
      ],
    );

  const totalOriginalDebt =
    useMemo(
      () =>
        activeDebts.reduce(
          (
            total,
            debt,
          ) =>
            total +
            debt.originalBalance,
          0,
        ),
      [
        activeDebts,
      ],
    );

  const totalPrincipalPaid =
    useMemo(
      () =>
        activeDebts.reduce(
          (
            total,
            debt,
          ) =>
            total +
            getPaidAmount(
              debt,
            ),
          0,
        ),
      [
        activeDebts,
      ],
    );

  const overallPayoffProgress =
    totalOriginalDebt >
    0
      ? Math.min(
          100,
          Math.max(
            0,
            (
              totalPrincipalPaid /
              totalOriginalDebt
            ) * 100,
          ),
        )
      : paidOffDebts.length >
          0 &&
        activeDebts.length ===
          0
      ? 100
      : 0;

  const highestInterestRate =
    activeDebts.length >
    0
      ? Math.max(
          ...activeDebts.map(
            (
              debt,
            ) =>
              debt.interestRate,
          ),
        )
      : 0;

  const hasDebts =
    debts.length > 0;

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <TrendingDown className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    Debt Payoff
                  </h1>

                  {hasDebts ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      {
                        activeDebts.length
                      }{" "}
                      active
                    </span>
                  ) : null}
                </div>

                <p className="max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                  Track every
                  balance,
                  understand your
                  minimums, and
                  build a clear
                  path toward
                  becoming
                  debt-free.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsAddDebtOpen(
                  true,
                )
              }
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus className="h-5 w-5" />

              Add debt
            </button>
          </div>
        </section>

        {hasDebts ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total debt"
                value={formatCurrency(
                  totalDebt,
                )}
                description="Current active balances"
                icon={
                  CircleDollarSign
                }
              />

              <SummaryCard
                label="Monthly minimums"
                value={formatCurrency(
                  totalMinimumPayments,
                )}
                description="Required monthly debt payments"
                icon={
                  BadgeDollarSign
                }
              />

              <SummaryCard
                label="Principal paid"
                value={formatCurrency(
                  totalPrincipalPaid,
                )}
                description="Paid down across active debts"
                icon={
                  TrendingDown
                }
              />

              <SummaryCard
                label="Payoff progress"
                value={`${overallPayoffProgress.toFixed(
                  1,
                )}%`}
                description={`${paidOffDebts.length} debt${
                  paidOffDebts.length ===
                  1
                    ? ""
                    : "s"
                } paid off`}
                icon={
                  CheckCircle2
                }
              />
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Your debts
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Review balances,
                    minimum payments,
                    and payoff progress.
                  </p>
                </div>

                <div className="flex w-full rounded-2xl bg-slate-100 p-1 sm:w-auto">
                  <FilterButton
                    label="Active"
                    count={
                      activeDebts.length
                    }
                    active={
                      selectedFilter ===
                      "active"
                    }
                    onClick={() =>
                      setSelectedFilter(
                        "active",
                      )
                    }
                  />

                  <FilterButton
                    label="Paid off"
                    count={
                      paidOffDebts.length
                    }
                    active={
                      selectedFilter ===
                      "paid-off"
                    }
                    onClick={() =>
                      setSelectedFilter(
                        "paid-off",
                      )
                    }
                  />

                  <FilterButton
                    label="All"
                    count={
                      debts.length
                    }
                    active={
                      selectedFilter ===
                      "all"
                    }
                    onClick={() =>
                      setSelectedFilter(
                        "all",
                      )
                    }
                  />
                </div>
              </div>

              {filteredDebts.length >
              0 ? (
                <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-2">
                  {filteredDebts.map(
                    (
                      debt,
                    ) => (
                      <DebtCard
                        key={
                          debt.id
                        }
                        debt={
                          debt
                        }
                        onOpen={() =>
                          setSelectedDebtId(
                            debt.id,
                          )
                        }
                      />
                    ),
                  )}
                </div>
              ) : (
                <FilteredEmptyState
                  filter={
                    selectedFilter
                  }
                />
              )}
            </section>
          </>
        ) : (
          <EmptyDebtState
            onAddDebt={() =>
              setIsAddDebtOpen(
                true,
              )
            }
          />
        )}

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <TrendingDown className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-950">
                  Debt payoff
                  strategy
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  CASE Budget can
                  help you compare
                  snowball and
                  avalanche payoff
                  approaches while
                  keeping every
                  minimum payment
                  visible.
                </p>

                <Link
                  href="/dashboard/budget"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
                >
                  Review monthly budget

                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold text-slate-500">
              Highest APR
            </p>

            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              {formatInterestRate(
                highestInterestRate,
              )}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Highest interest
              rate among your
              active debts.
            </p>
          </div>
        </section>
      </div>

      <AddDebtModal
        open={
          isAddDebtOpen
        }
        onClose={() =>
          setIsAddDebtOpen(
            false,
          )
        }
      />

      <DebtDetailsModal
        open={
          selectedDebt !==
          null
        }
        debt={
          selectedDebt
        }
        onClose={() =>
          setSelectedDebtId(
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
    typeof CircleDollarSign;
};

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: SummaryCardProps) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {
              description
            }
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

type FilterButtonProps = {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
};

function FilterButton({
  label,
  count,
  active,
  onClick,
}: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition sm:flex-none",
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-500 hover:text-slate-900",
      ].join(
        " ",
      )}
    >
      {label}

      <span
        className={[
          "rounded-full px-2 py-0.5 text-xs",
          active
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-200 text-slate-600",
        ].join(
          " ",
        )}
      >
        {count}
      </span>
    </button>
  );
}

type DebtCardProps = {
  debt: DebtData;
  onOpen: () => void;
};

function DebtCard({
  debt,
  onOpen,
}: DebtCardProps) {
  const progress =
    getDebtProgress(
      debt,
    );

  const paidAmount =
    getPaidAmount(
      debt,
    );

  const DebtIcon =
    getDebtIcon(
      debt,
    );

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              debt.status ===
              "paid-off"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-600",
            ].join(
              " ",
            )}
          >
            {debt.status ===
            "paid-off" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <DebtIcon className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-bold text-slate-950">
              {
                debt.name
              }
            </h3>

            <p className="mt-1 truncate text-xs text-slate-500">
              {debt.lender
                ? `${debt.lender} · `
                : ""}
              {getDebtTypeLabel(
                debt,
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={
            onOpen
          }
          aria-label={`Open ${debt.name}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xl font-bold text-slate-950">
              {formatCurrency(
                debt.currentBalance,
              )}
            </p>

            <p className="mt-0.5 text-xs text-slate-500">
              current balance
            </p>
          </div>

          <p className="text-sm font-bold text-emerald-700">
            {progress.toFixed(
              0,
            )}
            % paid
          </p>
        </div>

        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width]"
            style={{
              width:
                `${progress}%`,
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <DebtStat
            label="Minimum"
            value={formatCurrency(
              debt.minimumPayment,
            )}
          />

          <DebtStat
            label="APR"
            value={formatInterestRate(
              debt.interestRate,
            )}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 text-xs">
          <span className="text-slate-500">
            {debt.status ===
            "paid-off"
              ? "Debt fully paid"
              : `${formatCurrency(
                  paidAmount,
                )} paid down`}
          </span>

          <span
            className={[
              "rounded-full px-2.5 py-1 font-semibold",
              debt.status ===
              "paid-off"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600",
            ].join(
              " ",
            )}
          >
            {debt.status ===
            "paid-off"
              ? "Paid off"
              : "Active"}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={
          onOpen
        }
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-slate-50"
      >
        {debt.status ===
        "paid-off"
          ? "View debt"
          : "Record payment"}

        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

type DebtStatProps = {
  label: string;
  value: string;
};

function DebtStat({
  label,
  value,
}: DebtStatProps) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

type EmptyDebtStateProps = {
  onAddDebt:
    () => void;
};

function EmptyDebtState({
  onAddDebt,
}: EmptyDebtStateProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-14 text-center sm:px-8 sm:py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-50 text-emerald-600">
          <TrendingDown className="h-8 w-8" />
        </div>

        <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
          Build your debt
          payoff plan
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
          Add each debt so
          CASE Budget can
          track balances,
          interest rates,
          minimum payments,
          and your progress
          toward becoming
          debt-free.
        </p>

        <button
          type="button"
          onClick={
            onAddDebt
          }
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          <Plus className="h-5 w-5" />

          Add your first debt

          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="mt-10 grid w-full gap-3 text-left sm:grid-cols-3">
          <EmptyBenefit
            title="See every balance"
            description="Keep credit cards, loans, and other debts in one place."
          />

          <EmptyBenefit
            title="Track interest"
            description="Compare APRs so expensive debt stays visible."
          />

          <EmptyBenefit
            title="Watch progress"
            description="See each payment move you closer to debt-free."
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

function FilteredEmptyState({
  filter,
}: {
  filter:
    DebtFilter;
}) {
  const title =
    filter ===
    "paid-off"
      ? "No debts paid off yet"
      : filter ===
        "active"
      ? "No active debts"
      : "No debts to show";

  const description =
    filter ===
    "paid-off"
      ? "Debts you completely pay off will appear here."
      : filter ===
        "active"
      ? "Add a debt to begin building your payoff plan."
      : "Add your debts to begin tracking balances and payments.";

  return (
    <div className="flex flex-col items-center px-5 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <TrendingDown className="h-6 w-6" />
      </div>

      <h3 className="mt-4 font-bold text-slate-950">
        {title}
      </h3>

      <p className="mt-1 max-w-md text-sm text-slate-500">
        {
          description
        }
      </p>
    </div>
  );
}
