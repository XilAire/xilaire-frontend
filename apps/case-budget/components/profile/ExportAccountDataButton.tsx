"use client";

import {
  useState,
} from "react";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";

import {
  useApp,
} from "@/components/providers/AppProvider";

import {
  useBills,
} from "@/components/providers/BillsProvider";

import {
  useBudget,
} from "@/components/providers/BudgetProvider";

import {
  useDebts,
} from "@/components/providers/DebtsProvider";

import {
  useGoals,
} from "@/components/providers/GoalsProvider";

import {
  useInvestments,
} from "@/components/providers/InvestmentsProvider";

import {
  useNetWorth,
} from "@/components/providers/NetWorthProvider";

import {
  usePayCycles,
} from "@/components/providers/PayCyclesProvider";

import {
  useTransactions,
} from "@/components/providers/TransactionsProvider";

import {
  createCaseBudgetAccountExport,
  downloadCaseBudgetAccountExport,
} from "@/lib/profile/account-export";

type ExportState =
  | "idle"
  | "exporting"
  | "success"
  | "error";

type ExportAccountDataButtonProps = {
  className?:
    string;

  variant?:
    "primary"
    | "secondary"
    | "card";
};

export default function ExportAccountDataButton({
  className,
  variant =
    "secondary",
}: ExportAccountDataButtonProps) {
  const {
    currentUser,
    activeWorkspace,
  } =
    useApp();

  const {
    budgetMonths,
    selectedMonthKey,
  } =
    useBudget();

  const {
    accounts,
  } =
    useAccounts();

  const {
    transactions,
  } =
    useTransactions();

  const {
    bills,
  } =
    useBills();

  const {
    goals,
  } =
    useGoals();

  const {
    debts,
  } =
    useDebts();

  const {
    investmentAccounts,
    holdings,
    activities,
    investmentPerformanceHistory,
  } =
    useInvestments();

  const {
    payCycles,
  } =
    usePayCycles();

  const {
    history:
      netWorthHistory,
  } =
    useNetWorth();

  const [
    exportState,
    setExportState,
  ] =
    useState<ExportState>(
      "idle",
    );

  const [
    exportMessage,
    setExportMessage,
  ] =
    useState<string | null>(
      null,
    );

  const isExporting =
    exportState ===
    "exporting";

  function handleExport() {
    if (
      isExporting
    ) {
      return;
    }

    setExportState(
      "exporting",
    );

    setExportMessage(
      null,
    );

    try {
      const accountExport =
        createCaseBudgetAccountExport({
          profile:
            currentUser
              ? {
                  id:
                    currentUser.id,

                  email:
                    currentUser.email,

                  firstName:
                    currentUser.firstName ??
                    null,

                  lastName:
                    currentUser.lastName ??
                    null,

                  displayName:
                    currentUser.displayName,
                }
              : null,

          workspace:
            activeWorkspace
              ? {
                  id:
                    activeWorkspace.id,

                  name:
                    activeWorkspace.name,

                  type:
                    activeWorkspace.type,

                  memberCount:
                    activeWorkspace.memberCount ??
                    null,

                  isOwner:
                    activeWorkspace.isOwner ??
                    null,
                }
              : null,

          selectedBudgetMonth:
            selectedMonthKey ||
            null,

          budgetMonths,

          accounts,

          transactions,

          bills,

          goals,

          debts,

          /*
           * Investment data consists of several related collections.
           *
           * Keep them grouped in the investments section so the export
           * contains the complete current investment state.
           */
          investments: [
            {
              accounts:
                investmentAccounts,

              holdings,

              activities,

              performanceHistory:
                investmentPerformanceHistory,
            },
          ],

          payCycles,

          /*
           * Net worth history is currently persisted through the
           * NetWorthProvider/server snapshot flow.
           */
          netWorth:
            netWorthHistory,
        });

      downloadCaseBudgetAccountExport(
        accountExport,
      );

      setExportState(
        "success",
      );

      setExportMessage(
        "Your CASE Budget data export was created successfully.",
      );
    } catch (
      error
    ) {
      console.error(
        "CASE Budget account export failed.",
        error,
      );

      setExportState(
        "error",
      );

      setExportMessage(
        getExportErrorMessage(
          error,
        ),
      );
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={
          handleExport
        }
        disabled={
          isExporting
        }
        className={
          getButtonClassName(
            variant,
          )
        }
      >
        {isExporting ? (
          <>
            <SpinnerIcon />

            Creating export...
          </>
        ) : (
          <>
            <DownloadIcon />

            Export account data
          </>
        )}
      </button>

      {exportMessage ? (
        <ExportMessage
          state={
            exportState
          }
          message={
            exportMessage
          }
        />
      ) : null}
    </div>
  );
}

function ExportMessage({
  state,
  message,
}: {
  state:
    ExportState;

  message:
    string;
}) {
  const isSuccess =
    state ===
    "success";

  return (
    <div
      role={
        isSuccess
          ? "status"
          : "alert"
      }
      className={[
        "mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-5",
        isSuccess
          ? "border-[color-mix(in_srgb,var(--success)_24%,transparent)] bg-[color-mix(in_srgb,var(--success)_7%,transparent)] text-[var(--success)]"
          : "border-[color-mix(in_srgb,var(--danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--danger)_7%,transparent)] text-[var(--danger)]",
      ].join(
        " ",
      )}
    >
      <span className="mt-0.5 shrink-0">
        {isSuccess ? (
          <CheckIcon />
        ) : (
          <AlertIcon />
        )}
      </span>

      <span>
        {message}
      </span>
    </div>
  );
}

function getButtonClassName(
  variant:
    ExportAccountDataButtonProps["variant"],
) {
  const baseClassName =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60";

  if (
    variant ===
    "primary"
  ) {
    return [
      baseClassName,
      "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
    ].join(
      " ",
    );
  }

  if (
    variant ===
    "card"
  ) {
    return [
      baseClassName,
      "w-full border border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
    ].join(
      " ",
    );
  }

  return [
    baseClassName,
    "border border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
  ].join(
    " ",
  );
}

function getExportErrorMessage(
  error:
    unknown,
) {
  if (
    error instanceof
    Error
  ) {
    const message =
      error.message.trim();

    if (
      message
    ) {
      return message;
    }
  }

  return "CASE Budget could not create your data export. Please try again.";
}

function DownloadIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />

      <path d="m7 10 5 5 5-5" />

      <path d="M5 21h14" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 12 4 4 8-8" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M12 8v5" />

      <path d="M12 16h.01" />
    </svg>
  );
}