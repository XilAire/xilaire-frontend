import type {
  BudgetCategoryGroupData,
  BudgetIncomeSource,
} from "@/types/budget";

const monthLabelFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );

export function createMonthDate(
  year: number,
  monthIndex: number,
) {
  return new Date(
    year,
    monthIndex,
    1,
    12,
    0,
    0,
    0,
  );
}

export function shiftMonth(
  month: Date,
  amount: number,
) {
  return createMonthDate(
    month.getFullYear(),
    month.getMonth() + amount,
  );
}

export function formatMonthLabel(
  month: Date,
) {
  return monthLabelFormatter.format(
    month,
  );
}

export function createMonthKey(
  month: Date,
) {
  const year =
    month.getFullYear();

  const monthNumber = String(
    month.getMonth() + 1,
  ).padStart(
    2,
    "0",
  );

  return `${year}-${monthNumber}`;
}

export function createDateFromMonthKey(
  monthKey: string,
) {
  const [
    year,
    month,
  ] = monthKey
    .split("-")
    .map(Number);

  return createMonthDate(
    year,
    month - 1,
  );
}

export function createId(
  prefix: string,
) {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function cloneIncomeSources(
  incomeSources: BudgetIncomeSource[],
) {
  return incomeSources.map(
    (
      incomeSource,
    ) => ({
      ...incomeSource,
    }),
  );
}

export function cloneBudgetGroups(
  budgetGroups: BudgetCategoryGroupData[],
) {
  return budgetGroups.map(
    (
      group,
    ) => ({
      ...group,
      categories:
        group.categories.map(
          (
            category,
          ) => ({
            ...category,
          }),
        ),
    }),
  );
}

export function copyIncomeSourcesForNewMonth(
  incomeSources: BudgetIncomeSource[],
) {
  return incomeSources.map(
    (
      incomeSource,
    ) => ({
      id: createId("income"),
      name: incomeSource.name,
      amount: incomeSource.amount,
      receivedAmount: 0,
      status: "planned" as const,
    }),
  );
}

export function copyBudgetGroupsForNewMonth(
  budgetGroups: BudgetCategoryGroupData[],
) {
  return budgetGroups.map(
    (
      group,
    ) => ({
      id: createId("group"),
      name: group.name,
      description:
        group.description,
      categories:
        group.categories.map(
          (
            category,
          ) => ({
            id: createId(
              "category",
            ),
            name: category.name,
            assignedAmount:
              category.assignedAmount,
            spentAmount: 0,
          }),
        ),
    }),
  );
}