import type {
  BudgetCategoryData,
  BudgetData,
  NotificationItem,
} from "./generate-notifications";

import {
  createNotificationId,
  formatCurrency,
  formatPercentage,
  normalizeCalendarDate,
  normalizeMoney,
  resolveEntityTimestamp,
  sortAndDeduplicateNotifications,
} from "./notification-utils";

export function generateBudgetNotifications(
  budget: BudgetData | null,
  asOfDate: Date,
): NotificationItem[] {
  if (!budget) {
    return [];
  }

  const normalizedAsOfDate =
    normalizeCalendarDate(asOfDate);

  const notifications: NotificationItem[] =
    [];

  const budgetEventDate =
    resolveEntityTimestamp(
      budget,
      normalizedAsOfDate,
    );

  for (const category of
    budget.categories ?? []) {
    const categoryNotification =
      createCategoryNotification(
        category,
        budgetEventDate,
      );

    if (categoryNotification) {
      notifications.push(
        categoryNotification,
      );
    }
  }

  const unassignedAmount =
    resolveUnassignedAmount(budget);

  if (unassignedAmount > 0) {
    notifications.push(
      createUnassignedMoneyNotification(
        budget,
        unassignedAmount,
        budgetEventDate,
      ),
    );
  }

  if (
    isMonthlyBudgetComplete(
      budget,
      unassignedAmount,
    )
  ) {
    notifications.push(
      createBudgetCompleteNotification(
        budget,
        budgetEventDate,
      ),
    );
  }

  return sortAndDeduplicateNotifications(
    notifications,
  );
}

function createCategoryNotification(
  category: BudgetCategoryData,
  fallbackDate: Date,
): NotificationItem | null {
  const budgetedAmount =
    normalizeMoney(
      category.budgetedAmount,
    );

  const spentAmount =
    normalizeMoney(
      category.spentAmount,
    );

  if (budgetedAmount <= 0) {
    return null;
  }

  const percentageUsed =
    calculatePercentageUsed(
      spentAmount,
      budgetedAmount,
    );

  const eventDate =
    resolveEntityTimestamp(
      category,
      fallbackDate,
    );

  if (percentageUsed > 100) {
    return createOverBudgetNotification(
      category,
      budgetedAmount,
      spentAmount,
      eventDate,
    );
  }

  if (percentageUsed === 100) {
    return createBudgetReachedNotification(
      category,
      budgetedAmount,
      eventDate,
    );
  }

  if (percentageUsed >= 80) {
    return createBudgetWarningNotification(
      category,
      budgetedAmount,
      spentAmount,
      percentageUsed,
      eventDate,
    );
  }

  return null;
}

function createOverBudgetNotification(
  category: BudgetCategoryData,
  budgetedAmount: number,
  spentAmount: number,
  eventDate: Date,
): NotificationItem {
  const amountOverBudget =
    Math.max(
      0,
      spentAmount - budgetedAmount,
    );

  return {
    id: createNotificationId(
      "budget",
      category.id,
      "over-budget",
    ),
    category: "budget",
    priority: "critical",
    title: `${category.name} is over budget`,
    message: `You are ${formatCurrency(
      amountOverBudget,
    )} over the ${formatCurrency(
      budgetedAmount,
    )} category budget.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "Review category",
    href: createBudgetCategoryHref(
      category.id,
    ),
  };
}

function createBudgetReachedNotification(
  category: BudgetCategoryData,
  budgetedAmount: number,
  eventDate: Date,
): NotificationItem {
  return {
    id: createNotificationId(
      "budget",
      category.id,
      "budget-reached",
    ),
    category: "budget",
    priority: "high",
    title: `${category.name} has reached its budget`,
    message: `You have spent the full ${formatCurrency(
      budgetedAmount,
    )} assigned to this category.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "Review category",
    href: createBudgetCategoryHref(
      category.id,
    ),
  };
}

function createBudgetWarningNotification(
  category: BudgetCategoryData,
  budgetedAmount: number,
  spentAmount: number,
  percentageUsed: number,
  eventDate: Date,
): NotificationItem {
  const remainingAmount =
    Math.max(
      0,
      budgetedAmount - spentAmount,
    );

  return {
    id: createNotificationId(
      "budget",
      category.id,
      "budget-80-percent",
    ),
    category: "budget",
    priority: "medium",
    title: `${category.name} is nearing its limit`,
    message: `${formatPercentage(
      percentageUsed,
    )} of the ${formatCurrency(
      budgetedAmount,
    )} budget has been spent. ${formatCurrency(
      remainingAmount,
    )} remains.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "Review category",
    href: createBudgetCategoryHref(
      category.id,
    ),
  };
}

function createUnassignedMoneyNotification(
  budget: BudgetData,
  unassignedAmount: number,
  eventDate: Date,
): NotificationItem {
  return {
    id: createNotificationId(
      "budget",
      getBudgetIdentifier(budget),
      "unassigned-money",
    ),
    category: "budget",
    priority: "medium",
    title: "You still have money to assign",
    message: `${formatCurrency(
      unassignedAmount,
    )} remains unassigned in your monthly budget.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "Assign money",
    href: "/dashboard/budget",
  };
}

function createBudgetCompleteNotification(
  budget: BudgetData,
  eventDate: Date,
): NotificationItem {
  return {
    id: createNotificationId(
      "budget",
      getBudgetIdentifier(budget),
      "budget-complete",
    ),
    category: "budget",
    priority: "low",
    title: "Your monthly budget is complete",
    message:
      "All available income has been assigned a purpose.",
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "View budget",
    href: "/dashboard/budget",
  };
}

function isMonthlyBudgetComplete(
  budget: BudgetData,
  unassignedAmount: number,
): boolean {
  const income =
    normalizeMoney(
      budget.income,
    );

  if (income <= 0) {
    return false;
  }

  const assignedAmount =
    resolveAssignedAmount(budget);

  return (
    assignedAmount >= income &&
    unassignedAmount <= 0
  );
}

function resolveAssignedAmount(
  budget: BudgetData,
): number {
  if (
    budget.assignedAmount !==
      undefined &&
    budget.assignedAmount !== null
  ) {
    return Math.max(
      0,
      normalizeMoney(
        budget.assignedAmount,
      ),
    );
  }

  return Math.max(
    0,
    (budget.categories ?? []).reduce(
      (total, category) =>
        total +
        normalizeMoney(
          category.budgetedAmount,
        ),
      0,
    ),
  );
}

function resolveUnassignedAmount(
  budget: BudgetData,
): number {
  if (
    budget.unassignedAmount !==
      undefined &&
    budget.unassignedAmount !==
      null
  ) {
    return Math.max(
      0,
      normalizeMoney(
        budget.unassignedAmount,
      ),
    );
  }

  const income =
    normalizeMoney(
      budget.income,
    );

  const assignedAmount =
    resolveAssignedAmount(budget);

  return Math.max(
    0,
    income - assignedAmount,
  );
}

function calculatePercentageUsed(
  spentAmount: number,
  budgetedAmount: number,
): number {
  if (budgetedAmount <= 0) {
    return 0;
  }

  return (
    spentAmount /
    budgetedAmount
  ) * 100;
}

function getBudgetIdentifier(
  budget: BudgetData,
): string {
  return (
    budget.id?.trim() ||
    budget.month?.trim() ||
    "current"
  );
}

function createBudgetCategoryHref(
  categoryId: string,
): string {
  return `/dashboard/budget?categoryId=${encodeURIComponent(
    categoryId,
  )}`;
}