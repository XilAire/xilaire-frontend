"use client";

import {
  type ComponentType,
  useCallback,
  useMemo,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import AddInvestmentAccountModal from "@/components/investments/AddInvestmentAccountModal";
import AddInvestmentHoldingModal from "@/components/investments/AddInvestmentHoldingModal";
import InvestmentActivityModal from "@/components/investments/InvestmentActivityModal";
import InvestmentsOverview from "@/components/investments/InvestmentsOverview";

import {
  useInvestments,
  type InvestmentAccountData,
  type InvestmentActivityData,
  type InvestmentHoldingData,
} from "@/components/providers/InvestmentsProvider";

type InvestmentAccountModalContract = {
  isOpen: boolean;
  account?: InvestmentAccountData | null;
  onClose: () => void;
  onSaved?: (
    account: InvestmentAccountData,
  ) => void;
};

type InvestmentHoldingModalContract = {
  isOpen: boolean;
  holding?: InvestmentHoldingData | null;
  defaultInvestmentAccountId?: string;
  onClose: () => void;
  onSaved?: (
    holding: InvestmentHoldingData,
  ) => void;
};

type InvestmentActivityModalContract = {
  isOpen: boolean;
  activity?: InvestmentActivityData | null;
  defaultInvestmentAccountId?: string;
  defaultHoldingId?: string;
  onClose: () => void;
  onSaved?: (
    activity: InvestmentActivityData,
  ) => void;
};

const InvestmentAccountModal =
  AddInvestmentAccountModal as ComponentType<
    InvestmentAccountModalContract
  >;

const InvestmentHoldingModal =
  AddInvestmentHoldingModal as unknown as ComponentType<
    InvestmentHoldingModalContract
  >;

const ActivityModal =
  InvestmentActivityModal as ComponentType<
    InvestmentActivityModalContract
  >;

type InvestmentPageAction =
  | "add-account"
  | "edit-account"
  | "add-holding"
  | "edit-holding"
  | "add-activity"
  | "edit-activity"
  | null;

export default function InvestmentsPage() {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const {
    investmentAccounts,
    holdings,
    activities,
  } = useInvestments();

  const action =
    normalizeAction(
      searchParams.get(
        "action",
      ),
    );

  const accountId =
    searchParams.get(
      "accountId",
    );

  const holdingId =
    searchParams.get(
      "holdingId",
    );

  const activityId =
    searchParams.get(
      "activityId",
    );

  const selectedAccount =
    useMemo(
      () =>
        accountId
          ? investmentAccounts.find(
              (
                account,
              ) =>
                account.id ===
                accountId,
            ) ??
            null
          : null,
      [
        accountId,
        investmentAccounts,
      ],
    );

  const selectedHolding =
    useMemo(
      () =>
        holdingId
          ? holdings.find(
              (
                holding,
              ) =>
                holding.id ===
                holdingId,
            ) ??
            null
          : null,
      [
        holdingId,
        holdings,
      ],
    );

  const selectedActivity =
    useMemo(
      () =>
        activityId
          ? activities.find(
              (
                activity,
              ) =>
                activity.id ===
                activityId,
            ) ??
            null
          : null,
      [
        activities,
        activityId,
      ],
    );

  const defaultInvestmentAccountId =
    useMemo(
      () => {
        if (
          selectedHolding
        ) {
          return selectedHolding.investmentAccountId;
        }

        if (
          selectedActivity
        ) {
          return selectedActivity.investmentAccountId;
        }

        return selectedAccount?.id ??
          accountId ??
          undefined;
      },
      [
        accountId,
        selectedAccount,
        selectedActivity,
        selectedHolding,
      ],
    );

  const defaultHoldingId =
    useMemo(
      () => {
        if (
          selectedActivity?.holdingId
        ) {
          return selectedActivity.holdingId;
        }

        return selectedHolding?.id ??
          holdingId ??
          undefined;
      },
      [
        holdingId,
        selectedActivity,
        selectedHolding,
      ],
    );

  const closeModal =
    useCallback(
      () => {
        const nextSearchParams =
          new URLSearchParams(
            searchParams.toString(),
          );

        nextSearchParams.delete(
          "action",
        );

        const nextQuery =
          nextSearchParams.toString();

        router.replace(
          nextQuery
            ? `${pathname}?${nextQuery}`
            : pathname,
          {
            scroll:
              false,
          },
        );
      },
      [
        pathname,
        router,
        searchParams,
      ],
    );

  const handleAccountSaved =
    useCallback(
      (
        _account:
          InvestmentAccountData,
      ) => {
        closeModal();
      },
      [
        closeModal,
      ],
    );

  const handleHoldingSaved =
    useCallback(
      (
        _holding:
          InvestmentHoldingData,
      ) => {
        closeModal();
      },
      [
        closeModal,
      ],
    );

  const handleActivitySaved =
    useCallback(
      (
        _activity:
          InvestmentActivityData,
      ) => {
        closeModal();
      },
      [
        closeModal,
      ],
    );

  const isAddAccountOpen =
    action ===
    "add-account";

  const isEditAccountOpen =
    action ===
      "edit-account" &&
    Boolean(
      selectedAccount,
    );

  const isAddHoldingOpen =
    action ===
    "add-holding";

  const isEditHoldingOpen =
    action ===
      "edit-holding" &&
    Boolean(
      selectedHolding,
    );

  const isAddActivityOpen =
    action ===
    "add-activity";

  const isEditActivityOpen =
    action ===
      "edit-activity" &&
    Boolean(
      selectedActivity,
    );

  return (
    <>
      <InvestmentsOverview />

      <InvestmentAccountModal
        isOpen={
          isAddAccountOpen ||
          isEditAccountOpen
        }
        account={
          isEditAccountOpen
            ? selectedAccount
            : null
        }
        onClose={
          closeModal
        }
        onSaved={
          handleAccountSaved
        }
      />

      <InvestmentHoldingModal
        isOpen={
          isAddHoldingOpen ||
          isEditHoldingOpen
        }
        holding={
          isEditHoldingOpen
            ? selectedHolding
            : null
        }
        defaultInvestmentAccountId={
          defaultInvestmentAccountId
        }
        onClose={
          closeModal
        }
        onSaved={
          handleHoldingSaved
        }
      />

      <ActivityModal
        isOpen={
          isAddActivityOpen ||
          isEditActivityOpen
        }
        activity={
          isEditActivityOpen
            ? selectedActivity
            : null
        }
        defaultInvestmentAccountId={
          defaultInvestmentAccountId
        }
        defaultHoldingId={
          defaultHoldingId
        }
        onClose={
          closeModal
        }
        onSaved={
          handleActivitySaved
        }
      />

      <InvalidInvestmentActionGuard
        action={
          action
        }
        accountId={
          accountId
        }
        holdingId={
          holdingId
        }
        activityId={
          activityId
        }
        hasSelectedAccount={
          Boolean(
            selectedAccount,
          )
        }
        hasSelectedHolding={
          Boolean(
            selectedHolding,
          )
        }
        hasSelectedActivity={
          Boolean(
            selectedActivity,
          )
        }
        onDismiss={
          closeModal
        }
      />
    </>
  );
}

type InvalidInvestmentActionGuardProps = {
  action:
    InvestmentPageAction;

  accountId:
    string | null;

  holdingId:
    string | null;

  activityId:
    string | null;

  hasSelectedAccount:
    boolean;

  hasSelectedHolding:
    boolean;

  hasSelectedActivity:
    boolean;

  onDismiss: () => void;
};

function InvalidInvestmentActionGuard({
  action,
  accountId,
  holdingId,
  activityId,
  hasSelectedAccount,
  hasSelectedHolding,
  hasSelectedActivity,
  onDismiss,
}: InvalidInvestmentActionGuardProps) {
  const message =
    getInvalidActionMessage({
      action,
      accountId,
      holdingId,
      activityId,
      hasSelectedAccount,
      hasSelectedHolding,
      hasSelectedActivity,
    });

  if (
    !message
  ) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-xl rounded-2xl border border-[var(--danger)] bg-[var(--surface-default)] p-4 shadow-2xl sm:bottom-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
          <WarningIcon />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Unable to open item
          </h2>

          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={
            onDismiss
          }
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          aria-label="Dismiss message"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

function getInvalidActionMessage({
  action,
  accountId,
  holdingId,
  activityId,
  hasSelectedAccount,
  hasSelectedHolding,
  hasSelectedActivity,
}: Omit<
  InvalidInvestmentActionGuardProps,
  "onDismiss"
>) {
  if (
    action ===
    "edit-account"
  ) {
    if (
      !accountId
    ) {
      return "The account ID is missing from the URL.";
    }

    if (
      !hasSelectedAccount
    ) {
      return "The selected investment account could not be found.";
    }
  }

  if (
    action ===
    "edit-holding"
  ) {
    if (
      !holdingId
    ) {
      return "The holding ID is missing from the URL.";
    }

    if (
      !hasSelectedHolding
    ) {
      return "The selected investment holding could not be found.";
    }
  }

  if (
    action ===
    "edit-activity"
  ) {
    if (
      !activityId
    ) {
      return "The activity ID is missing from the URL.";
    }

    if (
      !hasSelectedActivity
    ) {
      return "The selected investment activity could not be found.";
    }
  }

  return null;
}

function normalizeAction(
  value:
    string | null,
): InvestmentPageAction {
  switch (
    value
  ) {
    case "add-account":
    case "edit-account":
    case "add-holding":
    case "edit-holding":
    case "add-activity":
    case "edit-activity":
      return value;

    default:
      return null;
  }
}

function WarningIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
