import "server-only";

import {
  createElement,
} from "react";

import BillReminder from "@/emails/notifications/BillReminder";
import BudgetAlert from "@/emails/notifications/BudgetAlert";
import DebtMilestone from "@/emails/notifications/DebtMilestone";
import GoalReached from "@/emails/notifications/GoalReached";
import WeeklySummary from "@/emails/notifications/WeeklySummary";

import {
  sendCaseBudgetEmail,
  type SendCaseBudgetEmailResult,
} from "./send-email";

import {
  CASE_BUDGET_EMAIL_ADDRESSES,
} from "./resend";

export type SendBillReminderEmailInput = {
  to:
    string;

  firstName?:
    string;

  billName:
    string;

  amountDue?:
    string;

  dueDate:
    string;

  accountName?:
    string;

  paymentMethod?:
    string;

  budgetItemName?:
    string;

  billUrl?:
    string;

  daysUntilDue?:
    number;

  isOverdue?:
    boolean;
};

export type SendBudgetAlertEmailInput = {
  to:
    string;

  firstName?:
    string;

  budgetItemName:
    string;

  budgetGroupName?:
    string;

  plannedAmount?:
    string;

  spentAmount?:
    string;

  remainingAmount?:
    string;

  percentUsed?:
    number;

  alertType?:
    | "warning"
    | "overspent";

  budgetUrl?:
    string;
};

export type SendGoalReachedEmailInput = {
  to:
    string;

  firstName?:
    string;

  goalName:
    string;

  targetAmount?:
    string;

  savedAmount?:
    string;

  reachedOn?:
    string;

  goalUrl?:
    string;
};

export type SendDebtMilestoneEmailInput = {
  to:
    string;

  firstName?:
    string;

  debtName:
    string;

  originalBalance?:
    string;

  currentBalance?:
    string;

  amountPaid?:
    string;

  percentPaid?:
    number;

  milestoneLabel?:
    string;

  debtUrl?:
    string;

  paidOff?:
    boolean;
};

export type SendWeeklySummaryEmailInput = {
  to:
    string;

  firstName?:
    string;

  weekLabel?:
    string;

  incomeTotal?:
    string;

  spendingTotal?:
    string;

  billsPaidTotal?:
    string;

  billsDueTotal?:
    string;

  savingsTotal?:
    string;

  debtPaidTotal?:
    string;

  remainingToBudget?:
    string;

  netCashFlow?:
    string;

  summaryUrl?:
    string;

  topSpendingCategory?:
    string;

  topSpendingAmount?:
    string;
};

/**
 * Sends an upcoming or overdue bill reminder.
 */
export async function sendBillReminderEmail({
  to,
  firstName,
  billName,
  amountDue,
  dueDate,
  accountName,
  paymentMethod,
  budgetItemName,
  billUrl,
  daysUntilDue,
  isOverdue = false,
}: SendBillReminderEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  const normalizedBillName =
    normalizeRequiredText(
      billName,
    );

  const normalizedDueDate =
    normalizeRequiredText(
      dueDate,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  if (
    !normalizedBillName
  ) {
    return createInputFailure(
      "bill-name-required",
      "A bill name is required.",
    );
  }

  if (
    !normalizedDueDate
  ) {
    return createInputFailure(
      "due-date-required",
      "A bill due date is required.",
    );
  }

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      isOverdue
        ? `${normalizedBillName} is overdue`
        : `${normalizedBillName} is due soon`,

    sender:
      "noreply",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        BillReminder,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          billName:
            normalizedBillName,

          amountDue:
            normalizeOptionalText(
              amountDue,
            ),

          dueDate:
            normalizedDueDate,

          accountName:
            normalizeOptionalText(
              accountName,
            ),

          paymentMethod:
            normalizeOptionalText(
              paymentMethod,
            ),

          budgetItemName:
            normalizeOptionalText(
              budgetItemName,
            ),

          billUrl:
            normalizeOptionalText(
              billUrl,
            ),

          daysUntilDue:
            normalizeOptionalInteger(
              daysUntilDue,
            ),

          isOverdue,
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "notification",
      },

      {
        name:
          "template",

        value:
          "bill-reminder",
      },

      {
        name:
          "status",

        value:
          isOverdue
            ? "overdue"
            : "upcoming",
      },
    ],
  });
}

/**
 * Sends an alert when a budget item approaches or exceeds its planned amount.
 */
export async function sendBudgetAlertEmail({
  to,
  firstName,
  budgetItemName,
  budgetGroupName,
  plannedAmount,
  spentAmount,
  remainingAmount,
  percentUsed,
  alertType = "warning",
  budgetUrl,
}: SendBudgetAlertEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  const normalizedBudgetItemName =
    normalizeRequiredText(
      budgetItemName,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  if (
    !normalizedBudgetItemName
  ) {
    return createInputFailure(
      "budget-item-required",
      "A budget item name is required.",
    );
  }

  const normalizedAlertType =
    alertType ===
    "overspent"
      ? "overspent"
      : "warning";

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      normalizedAlertType ===
      "overspent"
        ? `${normalizedBudgetItemName} is over budget`
        : `${normalizedBudgetItemName} is nearing its budget limit`,

    sender:
      "noreply",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        BudgetAlert,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          budgetItemName:
            normalizedBudgetItemName,

          budgetGroupName:
            normalizeOptionalText(
              budgetGroupName,
            ),

          plannedAmount:
            normalizeOptionalText(
              plannedAmount,
            ),

          spentAmount:
            normalizeOptionalText(
              spentAmount,
            ),

          remainingAmount:
            normalizeOptionalText(
              remainingAmount,
            ),

          percentUsed:
            normalizePercentage(
              percentUsed,
            ),

          alertType:
            normalizedAlertType,

          budgetUrl:
            normalizeOptionalText(
              budgetUrl,
            ),
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "notification",
      },

      {
        name:
          "template",

        value:
          "budget-alert",
      },

      {
        name:
          "status",

        value:
          normalizedAlertType,
      },
    ],
  });
}

/**
 * Sends a savings or financial-goal completion message.
 */
export async function sendGoalReachedEmail({
  to,
  firstName,
  goalName,
  targetAmount,
  savedAmount,
  reachedOn,
  goalUrl,
}: SendGoalReachedEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  const normalizedGoalName =
    normalizeRequiredText(
      goalName,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  if (
    !normalizedGoalName
  ) {
    return createInputFailure(
      "goal-name-required",
      "A goal name is required.",
    );
  }

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      `You reached your ${normalizedGoalName} goal`,

    sender:
      "noreply",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        GoalReached,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          goalName:
            normalizedGoalName,

          targetAmount:
            normalizeOptionalText(
              targetAmount,
            ),

          savedAmount:
            normalizeOptionalText(
              savedAmount,
            ),

          reachedOn:
            normalizeOptionalText(
              reachedOn,
            ),

          goalUrl:
            normalizeOptionalText(
              goalUrl,
            ),
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "notification",
      },

      {
        name:
          "template",

        value:
          "goal-reached",
      },
    ],
  });
}

/**
 * Sends a debt-payoff progress or completion milestone.
 */
export async function sendDebtMilestoneEmail({
  to,
  firstName,
  debtName,
  originalBalance,
  currentBalance,
  amountPaid,
  percentPaid,
  milestoneLabel,
  debtUrl,
  paidOff = false,
}: SendDebtMilestoneEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  const normalizedDebtName =
    normalizeRequiredText(
      debtName,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  if (
    !normalizedDebtName
  ) {
    return createInputFailure(
      "debt-name-required",
      "A debt name is required.",
    );
  }

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      paidOff
        ? `You paid off ${normalizedDebtName}`
        : `${normalizedDebtName} reached a new payoff milestone`,

    sender:
      "noreply",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        DebtMilestone,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          debtName:
            normalizedDebtName,

          originalBalance:
            normalizeOptionalText(
              originalBalance,
            ),

          currentBalance:
            normalizeOptionalText(
              currentBalance,
            ),

          amountPaid:
            normalizeOptionalText(
              amountPaid,
            ),

          percentPaid:
            normalizePercentage(
              percentPaid,
            ),

          milestoneLabel:
            normalizeOptionalText(
              milestoneLabel,
            ),

          debtUrl:
            normalizeOptionalText(
              debtUrl,
            ),

          paidOff,
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "notification",
      },

      {
        name:
          "template",

        value:
          "debt-milestone",
      },

      {
        name:
          "status",

        value:
          paidOff
            ? "paid-off"
            : "milestone",
      },
    ],
  });
}

/**
 * Sends the CASE Budget weekly financial summary.
 */
export async function sendWeeklySummaryEmail({
  to,
  firstName,
  weekLabel,
  incomeTotal,
  spendingTotal,
  billsPaidTotal,
  billsDueTotal,
  savingsTotal,
  debtPaidTotal,
  remainingToBudget,
  netCashFlow,
  summaryUrl,
  topSpendingCategory,
  topSpendingAmount,
}: SendWeeklySummaryEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  const normalizedWeekLabel =
    normalizeOptionalText(
      weekLabel,
    );

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      normalizedWeekLabel
        ? `Your CASE Budget summary for ${normalizedWeekLabel}`
        : "Your CASE Budget weekly summary",

    sender:
      "noreply",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        WeeklySummary,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          weekLabel:
            normalizedWeekLabel,

          incomeTotal:
            normalizeOptionalText(
              incomeTotal,
            ),

          spendingTotal:
            normalizeOptionalText(
              spendingTotal,
            ),

          billsPaidTotal:
            normalizeOptionalText(
              billsPaidTotal,
            ),

          billsDueTotal:
            normalizeOptionalText(
              billsDueTotal,
            ),

          savingsTotal:
            normalizeOptionalText(
              savingsTotal,
            ),

          debtPaidTotal:
            normalizeOptionalText(
              debtPaidTotal,
            ),

          remainingToBudget:
            normalizeOptionalText(
              remainingToBudget,
            ),

          netCashFlow:
            normalizeOptionalText(
              netCashFlow,
            ),

          summaryUrl:
            normalizeOptionalText(
              summaryUrl,
            ),

          topSpendingCategory:
            normalizeOptionalText(
              topSpendingCategory,
            ),

          topSpendingAmount:
            normalizeOptionalText(
              topSpendingAmount,
            ),
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "notification",
      },

      {
        name:
          "template",

        value:
          "weekly-summary",
      },
    ],
  });
}

function createInputFailure(
  code:
    string,
  message:
    string,
): SendCaseBudgetEmailResult {
  return {
    success:
      false,

    error: {
      code,
      message,

      statusCode:
        null,
    },
  };
}

function normalizeRequiredText(
  value:
    string,
) {
  return value.trim();
}

function normalizeOptionalText(
  value:
    string | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function normalizeOptionalInteger(
  value:
    number | undefined,
) {
  if (
    value ===
      undefined ||
    !Number.isFinite(
      value,
    )
  ) {
    return undefined;
  }

  return Math.trunc(
    value,
  );
}

function normalizePercentage(
  value:
    number | undefined,
) {
  if (
    value ===
      undefined ||
    !Number.isFinite(
      value,
    )
  ) {
    return undefined;
  }

  return Math.min(
    Math.max(
      value,
      0,
    ),
    100,
  );
}