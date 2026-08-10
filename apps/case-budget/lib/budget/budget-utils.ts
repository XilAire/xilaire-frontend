import type {
  BudgetCategoryGroupData,
  BudgetIncomeSource,
  BudgetIncomeStatus,
  BudgetMonthData,
} from "@/types/budget";

export type BudgetTotals = {
  plannedIncome: number;
  receivedIncome: number;
  assignedAmount: number;
  spentAmount: number;
  remainingAmount: number;
};

export function getIncomeStatus(
  plannedAmount: number,
  receivedAmount: number,
): BudgetIncomeStatus {
  if (
    plannedAmount > 0 &&
    receivedAmount >= plannedAmount
  ) {
    return "received";
  }

  if (receivedAmount > 0) {
    return "partial";
  }

  return "planned";
}

export function getPlannedIncomeTotal(
  incomeSources: BudgetIncomeSource[],
) {
  return incomeSources.reduce(
    (
      total,
      incomeSource,
    ) =>
      total +
      incomeSource.amount,
    0,
  );
}

export function getReceivedIncomeTotal(
  incomeSources: BudgetIncomeSource[],
) {
  return incomeSources.reduce(
    (
      total,
      incomeSource,
    ) =>
      total +
      incomeSource.receivedAmount,
    0,
  );
}

export function getBudgetGroupAssignedAmount(
  group: BudgetCategoryGroupData,
) {
  return group.categories.reduce(
    (
      total,
      item,
    ) =>
      total +
      item.assignedAmount,
    0,
  );
}

export function getBudgetGroupSpentAmount(
  group: BudgetCategoryGroupData,
) {
  return group.categories.reduce(
    (
      total,
      item,
    ) =>
      total +
      item.spentAmount,
    0,
  );
}

export function getAssignedAmountTotal(
  budgetGroups: BudgetCategoryGroupData[],
) {
  return budgetGroups.reduce(
    (
      total,
      group,
    ) =>
      total +
      getBudgetGroupAssignedAmount(
        group,
      ),
    0,
  );
}

export function getSpentAmountTotal(
  budgetGroups: BudgetCategoryGroupData[],
) {
  return budgetGroups.reduce(
    (
      total,
      group,
    ) =>
      total +
      getBudgetGroupSpentAmount(
        group,
      ),
    0,
  );
}

export function calculateBudgetTotals(
  incomeSources: BudgetIncomeSource[],
  budgetGroups: BudgetCategoryGroupData[],
): BudgetTotals {
  const plannedIncome =
    getPlannedIncomeTotal(
      incomeSources,
    );

  const receivedIncome =
    getReceivedIncomeTotal(
      incomeSources,
    );

  const assignedAmount =
    getAssignedAmountTotal(
      budgetGroups,
    );

  const spentAmount =
    getSpentAmountTotal(
      budgetGroups,
    );

  return {
    plannedIncome,
    receivedIncome,
    assignedAmount,
    spentAmount,
    remainingAmount:
      plannedIncome -
      assignedAmount,
  };
}

export function calculateBudgetMonthTotals(
  budgetMonth: BudgetMonthData,
): BudgetTotals {
  return calculateBudgetTotals(
    budgetMonth.incomeSources,
    budgetMonth.budgetGroups,
  );
}