export type BillStatus =
  | "upcoming"
  | "due-soon"
  | "due-today"
  | "past-due"
  | "paid";

export type BillFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "annual"
  | "one-time";

export type BillPaymentMethod =
  | "manual"
  | "autopay";

/**
 * Describes how a bill's amount behaves.
 *
 * fixed:
 *   A bill with a predictable amount, such as rent or a subscription.
 *
 * variable:
 *   A bill that is paid once per billing period but whose final amount
 *   can differ from the expected amount, such as electricity.
 *
 * spending:
 *   A spending bucket that can accumulate multiple transactions during
 *   the billing period, such as groceries, gas, restaurants, supplies,
 *   or miscellaneous spending.
 */
export type BillAmountType =
  | "fixed"
  | "variable"
  | "spending";

export type BillReminderTiming =
  | "same-day"
  | "1-day"
  | "3-days"
  | "5-days"
  | "7-days"
  | "14-days";

export type BillAccountType =
  | "checking"
  | "savings"
  | "credit-card"
  | "cash"
  | "investment"
  | "loan"
  | "other";

export type BillBudgetSyncMode =
  | "manual"
  | "suggest"
  | "automatic";

export type BillBudgetAllocationType =
  | "fixed"
  | "percentage";

export type BillAccountReference = {
  id: string;
  name: string;
  type: BillAccountType;
};

export type BillBudgetItemReference = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
};

export type BillBudgetSync = {
  enabled: boolean;
  mode: BillBudgetSyncMode;
  lastSyncedAt?: string;
};

export type BillBudgetAllocation = {
  id: string;
  budgetItem: BillBudgetItemReference;
  allocationType: BillBudgetAllocationType;
  value: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BillReminder = {
  enabled: boolean;
  timing: BillReminderTiming;
};

export type BillData = {
  id: string;
  name: string;
  payee?: string;

  /**
   * For fixed and variable bills this is the expected/scheduled amount.
   *
   * For spending bills this represents the spending target/limit for
   * the billing period.
   */
  amount: number;

  amountType: BillAmountType;

  /**
   * Actual amount paid/spent.
   *
   * Variable bills:
   *   The final amount that was actually paid.
   *
   * Spending bills:
   *   The accumulated spending for the billing period when available.
   *
   * Fixed bills:
   *   Usually unnecessary because `amount` is the payment amount.
   */
  paidAmount?: number;

  dueDate: string;
  status: BillStatus;
  frequency: BillFrequency;
  paymentMethod: BillPaymentMethod;

  account?: BillAccountReference;
  budgetItem?: BillBudgetItemReference;
  budgetSync?: BillBudgetSync;
  budgetAllocations?: BillBudgetAllocation[];

  reminder: BillReminder;

  note?: string;
  paidDate?: string;
  paymentTransactionId?: string;

  createdAt?: string;
  updatedAt?: string;
};

export type BillFilters = {
  search: string;
  status: BillStatus | "all";
  frequency: BillFrequency | "all";
  paymentMethod: BillPaymentMethod | "all";
  accountId: string | "all";
  budgetItemId: string | "all";
  dateFrom?: string;
  dateTo?: string;
};

export type BillSummary = {
  totalScheduled: number;
  totalPaid: number;
  remainingAmount: number;
  upcomingCount: number;
  dueSoonCount: number;
  dueTodayCount: number;
  pastDueCount: number;
  paidCount: number;
};

export type BillFormValues = {
  name: string;
  payee: string;
  amount: string;
  amountType: BillAmountType;
  dueDate: string;
  frequency: BillFrequency;
  paymentMethod: BillPaymentMethod;
  accountId: string;
  budgetItemId: string;
  budgetSyncEnabled: boolean;
  budgetSyncMode: BillBudgetSyncMode;
  reminderEnabled: boolean;
  reminderTiming: BillReminderTiming;
  note: string;
};

export type BillStatusDefinition = {
  value: BillStatus;
  label: string;
  description: string;
};

export type BillFrequencyDefinition = {
  value: BillFrequency;
  label: string;
};

export type BillAmountTypeDefinition = {
  value: BillAmountType;
  label: string;
  description: string;
};

export type BillReminderTimingDefinition = {
  value: BillReminderTiming;
  label: string;
};

export type BillBudgetSyncModeDefinition = {
  value: BillBudgetSyncMode;
  label: string;
  description: string;
};

export type BillBudgetAllocationTypeDefinition = {
  value: BillBudgetAllocationType;
  label: string;
  description: string;
};

export const billStatusDefinitions: BillStatusDefinition[] = [
  {
    value: "upcoming",
    label: "Upcoming",
    description:
      "The bill is scheduled for a future date.",
  },
  {
    value: "due-soon",
    label: "Due Soon",
    description:
      "The bill is approaching its due date.",
  },
  {
    value: "due-today",
    label: "Due Today",
    description:
      "The bill is due today.",
  },
  {
    value: "past-due",
    label: "Past Due",
    description:
      "The bill has passed its due date and is not marked paid.",
  },
  {
    value: "paid",
    label: "Paid",
    description:
      "The bill has been marked as paid.",
  },
];

export const billFrequencyDefinitions: BillFrequencyDefinition[] = [
  {
    value: "weekly",
    label: "Weekly",
  },
  {
    value: "biweekly",
    label: "Every Two Weeks",
  },
  {
    value: "monthly",
    label: "Monthly",
  },
  {
    value: "quarterly",
    label: "Quarterly",
  },
  {
    value: "semiannual",
    label: "Every Six Months",
  },
  {
    value: "annual",
    label: "Annually",
  },
  {
    value: "one-time",
    label: "One Time",
  },
];

/**
 * Definitions used by the Add/Edit Bill UI.
 */
export const billAmountTypeDefinitions: BillAmountTypeDefinition[] = [
  {
    value: "fixed",
    label: "Fixed",
    description:
      "A predictable bill amount that is normally paid once per billing period, such as rent or a subscription.",
  },
  {
    value: "variable",
    label: "Variable",
    description:
      "A bill paid once per billing period whose actual amount may differ from the expected amount, such as electricity or water.",
  },
  {
    value: "spending",
    label: "Spending",
    description:
      "A spending category that accumulates purchases throughout the billing period, such as groceries, gas, restaurants, supplies, or miscellaneous spending.",
  },
];

export const billReminderTimingDefinitions: BillReminderTimingDefinition[] = [
  {
    value: "same-day",
    label: "On the due date",
  },
  {
    value: "1-day",
    label: "1 day before",
  },
  {
    value: "3-days",
    label: "3 days before",
  },
  {
    value: "5-days",
    label: "5 days before",
  },
  {
    value: "7-days",
    label: "7 days before",
  },
  {
    value: "14-days",
    label: "14 days before",
  },
];

export const billBudgetSyncModeDefinitions: BillBudgetSyncModeDefinition[] = [
  {
    value: "suggest",
    label: "Suggest",
    description:
      "CASE Budget will recommend updates when the bill amount and linked budget item no longer match.",
  },
  {
    value: "automatic",
    label: "Automatic",
    description:
      "CASE Budget will automatically update the linked budget item when the bill amount changes.",
  },
  {
    value: "manual",
    label: "Manual",
    description:
      "The bill will remain linked, but budget updates must be made manually.",
  },
];

export const billBudgetAllocationTypeDefinitions: BillBudgetAllocationTypeDefinition[] = [
  {
    value: "fixed",
    label: "Fixed Amount",
    description:
      "Allocate a specific dollar amount from this bill to the selected budget item.",
  },
  {
    value: "percentage",
    label: "Percentage",
    description:
      "Allocate a percentage of this bill to the selected budget item.",
  },
];

export const defaultBillBudgetSync: BillBudgetSync = {
  enabled: true,
  mode: "suggest",
};

export function getBillStatusLabel(
  status: BillStatus,
) {
  return (
    billStatusDefinitions.find(
      (definition) =>
        definition.value === status,
    )?.label ?? status
  );
}

export function getBillFrequencyLabel(
  frequency: BillFrequency,
) {
  return (
    billFrequencyDefinitions.find(
      (definition) =>
        definition.value === frequency,
    )?.label ?? frequency
  );
}

export function getBillAmountTypeLabel(
  amountType: BillAmountType,
) {
  return (
    billAmountTypeDefinitions.find(
      (definition) =>
        definition.value === amountType,
    )?.label ?? amountType
  );
}

export function getBillAmountTypeDescription(
  amountType: BillAmountType,
) {
  return (
    billAmountTypeDefinitions.find(
      (definition) =>
        definition.value === amountType,
    )?.description ?? ""
  );
}

export function getBillReminderTimingLabel(
  timing: BillReminderTiming,
) {
  return (
    billReminderTimingDefinitions.find(
      (definition) =>
        definition.value === timing,
    )?.label ?? timing
  );
}

export function getBillBudgetSyncModeLabel(
  mode: BillBudgetSyncMode,
) {
  return (
    billBudgetSyncModeDefinitions.find(
      (definition) =>
        definition.value === mode,
    )?.label ?? mode
  );
}

export function getBillBudgetSyncModeDescription(
  mode: BillBudgetSyncMode,
) {
  return (
    billBudgetSyncModeDefinitions.find(
      (definition) =>
        definition.value === mode,
    )?.description ?? ""
  );
}

export function getBillBudgetAllocationTypeLabel(
  allocationType: BillBudgetAllocationType,
) {
  return (
    billBudgetAllocationTypeDefinitions.find(
      (definition) =>
        definition.value === allocationType,
    )?.label ?? allocationType
  );
}

export function getBillBudgetAllocationAmount(
  billAmount: number,
  allocation: BillBudgetAllocation,
) {
  if (
    allocation.allocationType ===
    "percentage"
  ) {
    return (
      billAmount *
      (allocation.value / 100)
    );
  }

  return allocation.value;
}

export function getBillBudgetAllocatedTotal(
  bill: Pick<
    BillData,
    "amount" | "budgetAllocations"
  >,
) {
  return (
    bill.budgetAllocations?.reduce(
      (total, allocation) =>
        total +
        getBillBudgetAllocationAmount(
          bill.amount,
          allocation,
        ),
      0,
    ) ?? 0
  );
}

export function getBillBudgetUnallocatedAmount(
  bill: Pick<
    BillData,
    "amount" | "budgetAllocations"
  >,
) {
  return Math.max(
    0,
    bill.amount -
      getBillBudgetAllocatedTotal(
        bill,
      ),
  );
}

export function isBillFullyAllocated(
  bill: Pick<
    BillData,
    "amount" | "budgetAllocations"
  >,
) {
  const allocatedTotal =
    getBillBudgetAllocatedTotal(
      bill,
    );

  return (
    Math.abs(
      allocatedTotal - bill.amount,
    ) < 0.01
  );
}

/**
 * Returns the actual amount represented by the bill.
 *
 * fixed:
 *   The scheduled amount is the payment amount.
 *
 * variable:
 *   Use the actual paid amount once known. Before payment, fall back
 *   to the expected amount.
 *
 * spending:
 *   Use accumulated spending when available. Before any spending has
 *   been recorded, return zero rather than the spending target.
 */
export function getBillPaymentAmount(
  bill: Pick<
    BillData,
    "amount" | "amountType" | "paidAmount"
  >,
) {
  if (
    bill.amountType === "variable" &&
    typeof bill.paidAmount === "number" &&
    Number.isFinite(bill.paidAmount)
  ) {
    return bill.paidAmount;
  }

  if (bill.amountType === "spending") {
    if (
      typeof bill.paidAmount === "number" &&
      Number.isFinite(bill.paidAmount)
    ) {
      return bill.paidAmount;
    }

    return 0;
  }

  return bill.amount;
}

/**
 * Returns the planned/expected amount for the bill.
 *
 * For spending bills this is the spending target for the period,
 * not the amount already spent.
 */
export function getBillExpectedAmount(
  bill: Pick<BillData, "amount">,
) {
  return bill.amount;
}

/**
 * Returns the actual paid/spent amount.
 */
export function getBillActualAmount(
  bill: Pick<
    BillData,
    "amount" | "amountType" | "paidAmount"
  >,
) {
  return getBillPaymentAmount(bill);
}

/**
 * Returns the amount still remaining against the expected amount.
 *
 * Examples:
 *
 * fixed:
 *   $500 expected -> $500 remaining until paid.
 *
 * variable:
 *   $220 expected and $205 actually paid -> $0 remaining once paid
 *   should normally be determined together with bill status.
 *
 * spending:
 *   $500 target and $175 spent -> $325 remaining.
 */
export function getBillRemainingAmount(
  bill: Pick<
    BillData,
    "amount" | "amountType" | "paidAmount" | "status"
  >,
) {
  if (bill.amountType === "spending") {
    return Math.max(
      0,
      bill.amount -
        getBillPaymentAmount(bill),
    );
  }

  if (bill.status === "paid") {
    return 0;
  }

  return bill.amount;
}

/**
 * Spending bills remain active throughout their billing period and
 * accumulate transactions rather than behaving like a traditional
 * one-payment bill.
 */
export function isSpendingBill(
  bill: Pick<BillData, "amountType">,
) {
  return bill.amountType === "spending";
}

/**
 * Variable bills have one payment whose final amount may differ from
 * the expected amount.
 */
export function isVariableBill(
  bill: Pick<BillData, "amountType">,
) {
  return bill.amountType === "variable";
}

/**
 * Fixed bills have a predictable scheduled payment amount.
 */
export function isFixedBill(
  bill: Pick<BillData, "amountType">,
) {
  return bill.amountType === "fixed";
}