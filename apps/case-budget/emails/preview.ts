export type CaseBudgetEmailCategory =
  | "auth"
  | "marketing"
  | "billing"
  | "notifications";

export type CaseBudgetEmailTemplateId =
  | "confirm-email"
  | "reset-password"
  | "magic-link"
  | "invite-user"
  | "change-email"
  | "welcome"
  | "newsletter"
  | "product-update"
  | "trial-ending"
  | "payment-failed"
  | "receipt"
  | "bill-reminder"
  | "budget-alert"
  | "goal-reached"
  | "debt-milestone"
  | "weekly-summary";

export type CaseBudgetEmailTemplateDefinition = {
  id:
    CaseBudgetEmailTemplateId;

  name:
    string;

  description:
    string;

  category:
    CaseBudgetEmailCategory;

  transactional:
    boolean;

  sender:
    "noreply" | "support" | "billing";

  sourcePath:
    string;
};

export const CASE_BUDGET_EMAIL_TEMPLATES:
  readonly CaseBudgetEmailTemplateDefinition[] =
  [
    {
      id:
        "confirm-email",

      name:
        "Confirm Email",

      description:
        "Sent after registration when the user must verify their email address before completing account setup.",

      category:
        "auth",

      transactional:
        true,

      sender:
        "noreply",

      sourcePath:
        "emails/auth/ConfirmEmail.tsx",
    },

    {
      id:
        "reset-password",

      name:
        "Reset Password",

      description:
        "Provides the secure password-recovery link requested by a CASE Budget user.",

      category:
        "auth",

      transactional:
        true,

      sender:
        "noreply",

      sourcePath:
        "emails/auth/ResetPasswordEmail.tsx",
    },

    {
      id:
        "magic-link",

      name:
        "Magic Link",

      description:
        "Provides a secure passwordless sign-in link when magic-link authentication is enabled.",

      category:
        "auth",

      transactional:
        true,

      sender:
        "noreply",

      sourcePath:
        "emails/auth/MagicLinkEmail.tsx",
    },

    {
      id:
        "invite-user",

      name:
        "Workspace Invitation",

      description:
        "Invites another person to join a CASE Budget workspace.",

      category:
        "auth",

      transactional:
        true,

      sender:
        "noreply",

      sourcePath:
        "emails/auth/InviteUserEmail.tsx",
    },

    {
      id:
        "change-email",

      name:
        "Confirm Email Change",

      description:
        "Confirms a request to change the email address associated with a CASE Budget account.",

      category:
        "auth",

      transactional:
        true,

      sender:
        "noreply",

      sourcePath:
        "emails/auth/ChangeEmailEmail.tsx",
    },

    {
      id:
        "welcome",

      name:
        "Welcome",

      description:
        "Welcomes a confirmed and provisioned user after their CASE Budget workspace is ready.",

      category:
        "marketing",

      transactional:
        true,

      sender:
        "noreply",

      sourcePath:
        "emails/marketing/WelcomeEmail.tsx",
    },

    {
      id:
        "newsletter",

      name:
        "Newsletter",

      description:
        "Provides optional financial education, budgeting insights, and product communication.",

      category:
        "marketing",

      transactional:
        false,

      sender:
        "noreply",

      sourcePath:
        "emails/marketing/Newsletter.tsx",
    },

    {
      id:
        "product-update",

      name:
        "Product Update",

      description:
        "Highlights newly released CASE Budget features, improvements, and important product changes.",

      category:
        "marketing",

      transactional:
        false,

      sender:
        "noreply",

      sourcePath:
        "emails/marketing/ProductUpdate.tsx",
    },

    {
      id:
        "trial-ending",

      name:
        "Trial Ending",

      description:
        "Notifies a user before a paid CASE Budget plan trial expires.",

      category:
        "billing",

      transactional:
        true,

      sender:
        "billing",

      sourcePath:
        "emails/billing/TrialEnding.tsx",
    },

    {
      id:
        "payment-failed",

      name:
        "Payment Failed",

      description:
        "Notifies a subscriber when a CASE Budget subscription payment could not be processed.",

      category:
        "billing",

      transactional:
        true,

      sender:
        "billing",

      sourcePath:
        "emails/billing/PaymentFailed.tsx",
    },

    {
      id:
        "receipt",

      name:
        "Payment Receipt",

      description:
        "Confirms a successful CASE Budget subscription payment and provides receipt information.",

      category:
        "billing",

      transactional:
        true,

      sender:
        "billing",

      sourcePath:
        "emails/billing/Receipt.tsx",
    },

    {
      id:
        "bill-reminder",

      name:
        "Bill Reminder",

      description:
        "Reminds a user about an upcoming or overdue bill recorded in their CASE Budget workspace.",

      category:
        "notifications",

      transactional:
        true,

      sender:
        "noreply",

      sourcePath:
        "emails/notifications/BillReminder.tsx",
    },

    {
      id:
        "budget-alert",

      name:
        "Budget Alert",

      description:
        "Notifies a user when a budget item approaches or exceeds its planned spending amount.",

      category:
        "notifications",

      transactional:
        true,

      sender:
        "noreply",

      sourcePath:
        "emails/notifications/BudgetAlert.tsx",
    },

    {
      id:
        "goal-reached",

      name:
        "Goal Reached",

      description:
        "Celebrates completion of a savings or financial goal tracked in CASE Budget.",

      category:
        "notifications",

      transactional:
        true,

      sender:
        "noreply",

      sourcePath:
        "emails/notifications/GoalReached.tsx",
    },

    {
      id:
        "debt-milestone",

      name:
        "Debt Milestone",

      description:
        "Recognizes meaningful debt-payoff progress or completion of a debt payoff.",

      category:
        "notifications",

      transactional:
        true,

      sender:
        "noreply",

      sourcePath:
        "emails/notifications/DebtMilestone.tsx",
    },

    {
      id:
        "weekly-summary",

      name:
        "Weekly Financial Summary",

      description:
        "Summarizes important income, spending, bills, savings, debt, and budget activity for the week.",

      category:
        "notifications",

      transactional:
        true,

      sender:
        "noreply",

      sourcePath:
        "emails/notifications/WeeklySummary.tsx",
    },
  ] as const;

export const CASE_BUDGET_EMAIL_SENDERS = {
  noreply: {
    name:
      "CASE Budget",

    email:
      "noreply@casebudgets.com",
  },

  support: {
    name:
      "CASE Budget Support",

    email:
      "support@casebudgets.com",
  },

  billing: {
    name:
      "CASE Budget Billing",

    email:
      "billing@casebudgets.com",
  },
} as const;

export function getCaseBudgetEmailTemplate(
  templateId:
    CaseBudgetEmailTemplateId,
) {
  return (
    CASE_BUDGET_EMAIL_TEMPLATES.find(
      (
        template,
      ) =>
        template.id ===
        templateId,
    ) ??
    null
  );
}

export function getCaseBudgetEmailTemplatesByCategory(
  category:
    CaseBudgetEmailCategory,
) {
  return CASE_BUDGET_EMAIL_TEMPLATES.filter(
    (
      template,
    ) =>
      template.category ===
      category,
  );
}

export function getCaseBudgetEmailSender(
  sender:
    keyof typeof CASE_BUDGET_EMAIL_SENDERS,
) {
  return CASE_BUDGET_EMAIL_SENDERS[
    sender
  ];
}

export function formatCaseBudgetEmailSender(
  sender:
    keyof typeof CASE_BUDGET_EMAIL_SENDERS,
) {
  const senderDefinition =
    getCaseBudgetEmailSender(
      sender,
    );

  return `${senderDefinition.name} <${senderDefinition.email}>`;
}