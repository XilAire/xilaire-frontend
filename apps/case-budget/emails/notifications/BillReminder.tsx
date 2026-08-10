import {
  Heading,
  Hr,
  Section,
  Text,
} from "react-email";

import {
  CaseBudgetEmailLayout,
} from "../components/CaseBudgetEmailLayout";

import {
  EmailButton,
} from "../components/EmailButton";

import {
  caseBudgetEmailTheme,
} from "../styles/theme";

export type BillReminderEmailProps = {
  firstName?: string;

  billName: string;

  amountDue?: string;

  dueDate: string;

  accountName?: string;

  paymentMethod?: string;

  budgetItemName?: string;

  billUrl?: string;

  daysUntilDue?: number;

  isOverdue?: boolean;
};

export default function BillReminder({
  firstName,
  billName,
  amountDue,
  dueDate,
  accountName,
  paymentMethod,
  budgetItemName,
  billUrl =
    "https://casebudgets.com/dashboard/bills",
  daysUntilDue,
  isOverdue = false,
}: BillReminderEmailProps) {
  const greetingName =
    firstName?.trim() ||
    "there";

  const preview =
    isOverdue
      ? `${billName} is overdue in CASE Budget.`
      : `${billName} is coming due soon.`;

  const statusLabel =
    isOverdue
      ? "Overdue bill"
      : "Upcoming bill";

  const statusColor =
    isOverdue
      ? caseBudgetEmailTheme
          .colors
          .danger
      : caseBudgetEmailTheme
          .colors
          .warning;

  const statusBackground =
    isOverdue
      ? caseBudgetEmailTheme
          .colors
          .dangerSoft
      : caseBudgetEmailTheme
          .colors
          .warningSoft;

  return (
    <CaseBudgetEmailLayout
      preview={preview}
      showSecurityNotice={
        false
      }
      showSupportLink
    >
      <Section>
        <Text
          style={{
            margin:
              "0 0 12px",

            color:
              statusColor,

            fontFamily:
              caseBudgetEmailTheme
                .typography
                .fontFamily,

            fontSize:
              "12px",

            fontWeight:
              800,

            letterSpacing:
              "1.4px",

            lineHeight:
              "18px",

            textTransform:
              "uppercase",
          }}
        >
          {statusLabel}
        </Text>

        <Heading
          as="h1"
          style={{
            margin:
              "0 0 18px",

            color:
              caseBudgetEmailTheme
                .colors
                .text,

            fontFamily:
              caseBudgetEmailTheme
                .typography
                .headingFontFamily,

            fontSize:
              "32px",

            fontWeight:
              800,

            letterSpacing:
              "-0.6px",

            lineHeight:
              "40px",
          }}
        >
          {isOverdue
            ? `${billName} is past due`
            : `${billName} is coming up`}
        </Heading>

        <Text
          style={{
            margin:
              "0 0 16px",

            color:
              caseBudgetEmailTheme
                .colors
                .textSecondary,

            fontFamily:
              caseBudgetEmailTheme
                .typography
                .fontFamily,

            fontSize:
              "16px",

            lineHeight:
              "26px",
          }}
        >
          Hi {greetingName},
        </Text>

        <Text
          style={{
            margin:
              "0 0 28px",

            color:
              caseBudgetEmailTheme
                .colors
                .textSecondary,

            fontFamily:
              caseBudgetEmailTheme
                .typography
                .fontFamily,

            fontSize:
              "16px",

            lineHeight:
              "26px",
          }}
        >
          {isOverdue
            ? "CASE Budget is reminding you that this bill is now past its scheduled due date."
            : "CASE Budget is reminding you about an upcoming bill so you have time to plan for it before it is due."}
        </Text>

        <Section
          style={{
            margin:
              "0 0 28px",

            padding:
              "20px",

            backgroundColor:
              statusBackground,

            border:
              `1px solid ${caseBudgetEmailTheme.colors.border}`,

            borderRadius:
              "12px",
          }}
        >
          <Text
            style={{
              margin:
                "0 0 6px",

              color:
                caseBudgetEmailTheme
                  .colors
                  .textMuted,

              fontFamily:
                caseBudgetEmailTheme
                  .typography
                  .fontFamily,

              fontSize:
                "12px",

              fontWeight:
                700,

              letterSpacing:
                "1px",

              lineHeight:
                "18px",

              textTransform:
                "uppercase",
            }}
          >
            Bill
          </Text>

          <Text
            style={{
              margin:
                "0 0 14px",

              color:
                caseBudgetEmailTheme
                  .colors
                  .text,

              fontFamily:
                caseBudgetEmailTheme
                  .typography
                  .headingFontFamily,

              fontSize:
                "22px",

              fontWeight:
                800,

              lineHeight:
                "30px",
            }}
          >
            {billName}
          </Text>

          {amountDue ? (
            <BillDetailRow
              label="Amount"
              value={
                amountDue
              }
            />
          ) : null}

          <BillDetailRow
            label="Due date"
            value={
              dueDate
            }
          />

          {typeof daysUntilDue ===
          "number" ? (
            <BillDetailRow
              label={
                isOverdue
                  ? "Status"
                  : "Time remaining"
              }
              value={
                isOverdue
                  ? `${Math.abs(daysUntilDue)} ${
                      Math.abs(
                        daysUntilDue,
                      ) ===
                      1
                        ? "day"
                        : "days"
                    } overdue`
                  : `${daysUntilDue} ${
                      daysUntilDue ===
                      1
                        ? "day"
                        : "days"
                    } remaining`
              }
            />
          ) : null}

          {accountName ? (
            <BillDetailRow
              label="Account"
              value={
                accountName
              }
            />
          ) : null}

          {paymentMethod ? (
            <BillDetailRow
              label="Payment method"
              value={
                paymentMethod
              }
            />
          ) : null}

          {budgetItemName ? (
            <BillDetailRow
              label="Budget item"
              value={
                budgetItemName
              }
              isLast
            />
          ) : null}
        </Section>

        <Section
          style={{
            margin:
              "0 0 28px",
          }}
        >
          <EmailButton
            href={billUrl}
          >
            {isOverdue
              ? "Review overdue bill"
              : "Review bill"}
          </EmailButton>
        </Section>

        <Section
          style={{
            margin:
              "0 0 28px",

            padding:
              "18px",

            backgroundColor:
              caseBudgetEmailTheme
                .colors
                .surfaceMuted,

            border:
              `1px solid ${caseBudgetEmailTheme.colors.border}`,

            borderRadius:
              "12px",
          }}
        >
          <Text
            style={{
              margin:
                "0 0 6px",

              color:
                caseBudgetEmailTheme
                  .colors
                  .text,

              fontFamily:
                caseBudgetEmailTheme
                  .typography
                  .fontFamily,

              fontSize:
                "14px",

              fontWeight:
                700,

              lineHeight:
                "22px",
            }}
          >
            Keep your budget accurate
          </Text>

          <Text
            style={{
              margin:
                0,

              color:
                caseBudgetEmailTheme
                  .colors
                  .textSecondary,

              fontFamily:
                caseBudgetEmailTheme
                  .typography
                  .fontFamily,

              fontSize:
                "14px",

              lineHeight:
                "22px",
            }}
          >
            Once the bill is paid,
            update its status in CASE
            Budget so your upcoming
            obligations, activity, and
            monthly plan stay current.
          </Text>
        </Section>

        <Hr
          style={{
            border:
              "none",

            borderTop:
              `1px solid ${caseBudgetEmailTheme.colors.border}`,

            margin:
              "0 0 24px",
          }}
        />

        <Text
          style={{
            margin:
              0,

            color:
              caseBudgetEmailTheme
                .colors
                .textMuted,

            fontFamily:
              caseBudgetEmailTheme
                .typography
                .fontFamily,

            fontSize:
              "13px",

            lineHeight:
              "21px",
          }}
        >
          This reminder is based on
          the bill information currently
          saved in your CASE Budget
          workspace. CASE Budget does
          not initiate payment unless a
          separate payment feature has
          been explicitly configured.
        </Text>
      </Section>
    </CaseBudgetEmailLayout>
  );
}

function BillDetailRow({
  label,
  value,
  isLast = false,
}: {
  label:
    string;

  value:
    string;

  isLast?:
    boolean;
}) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding="0"
      cellSpacing="0"
      border={0}
      style={{
        marginBottom:
          isLast
            ? 0
            : "10px",
      }}
    >
      <tbody>
        <tr>
          <td
            valign="top"
            style={{
              width:
                "42%",

              paddingRight:
                "12px",

              color:
                caseBudgetEmailTheme
                  .colors
                  .textMuted,

              fontFamily:
                caseBudgetEmailTheme
                  .typography
                  .fontFamily,

              fontSize:
                "13px",

              fontWeight:
                600,

              lineHeight:
                "21px",
            }}
          >
            {label}
          </td>

          <td
            valign="top"
            align="right"
            style={{
              color:
                caseBudgetEmailTheme
                  .colors
                  .text,

              fontFamily:
                caseBudgetEmailTheme
                  .typography
                  .fontFamily,

              fontSize:
                "13px",

              fontWeight:
                700,

              lineHeight:
                "21px",

              wordBreak:
                "break-word",
            }}
          >
            {value}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

BillReminder.PreviewProps = {
  firstName:
    "Calix",

  billName:
    "Electric Bill",

  amountDue:
    "$184.72",

  dueDate:
    "August 12, 2026",

  accountName:
    "Household Checking",

  paymentMethod:
    "Auto Pay",

  budgetItemName:
    "Utilities",

  daysUntilDue:
    5,

  isOverdue:
    false,

  billUrl:
    "https://casebudgets.com/dashboard/bills",
} satisfies BillReminderEmailProps;