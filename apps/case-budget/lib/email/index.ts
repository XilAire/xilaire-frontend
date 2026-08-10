export {
  CASE_BUDGET_EMAIL_ADDRESSES,
  CASE_BUDGET_EMAIL_SENDERS,
  getCaseBudgetEmailAddress,
  getCaseBudgetEmailSender,
  getCaseBudgetResendClient,
} from "./resend";

export type {
  CaseBudgetEmailSender,
} from "./resend";

export {
  sendCaseBudgetEmail,
} from "./send-email";

export type {
  SendCaseBudgetEmailFailure,
  SendCaseBudgetEmailInput,
  SendCaseBudgetEmailResult,
  SendCaseBudgetEmailSuccess,
} from "./send-email";

export {
  sendChangeEmailEmail,
  sendConfirmEmail,
  sendInviteUserEmail,
  sendMagicLinkEmail,
  sendResetPasswordEmail,
} from "./send-auth-email";

export type {
  SendChangeEmailEmailInput,
  SendConfirmEmailInput,
  SendInviteUserEmailInput,
  SendMagicLinkEmailInput,
  SendResetPasswordEmailInput,
} from "./send-auth-email";

export {
  sendPaymentFailedEmail,
  sendReceiptEmail,
  sendTrialEndingEmail,
} from "./send-billing-email";

export type {
  SendPaymentFailedEmailInput,
  SendReceiptEmailInput,
  SendTrialEndingEmailInput,
} from "./send-billing-email";

export {
  sendBillReminderEmail,
  sendBudgetAlertEmail,
  sendDebtMilestoneEmail,
  sendGoalReachedEmail,
  sendWeeklySummaryEmail,
} from "./send-notification";

export type {
  SendBillReminderEmailInput,
  SendBudgetAlertEmailInput,
  SendDebtMilestoneEmailInput,
  SendGoalReachedEmailInput,
  SendWeeklySummaryEmailInput,
} from "./send-notification";

export {
  sendNewsletterEmail,
  sendProductUpdateEmail,
  sendWelcomeEmail,
} from "./send-marketing-email";

export type {
  SendNewsletterEmailInput,
  SendProductUpdateEmailInput,
  SendWelcomeEmailInput,
} from "./send-marketing-email";