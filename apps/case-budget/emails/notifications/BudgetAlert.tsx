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

export type BudgetAlertEmailProps = {
  firstName?: string;

  budgetItemName: string;

  budgetGroupName?: string;

  plannedAmount?: string;

  spentAmount?: string;

  remainingAmount?: string;

  percentUsed?: number;

  alertType?:
    | "warning"
    | "overspent";

  budgetUrl?: string;
};

export default function BudgetAlert({
  firstName,
  budgetItemName,
  budgetGroupName,
  plannedAmount,
  spentAmount,
  remainingAmount,
  percentUsed,
  alertType = "warning",
  budgetUrl =
    "https://casebudgets.com/dashboard/budget",
}: BudgetAlertEmailProps) {
  const greetingName =
    firstName?.trim() ||
    "there";

  const isOverspent =
    alertType ===
    "overspent";

  const preview =
    isOverspent
      ? `${budgetItemName} is over budget in CASE Budget.`
      : `${budgetItemName} is getting close to its budget limit.`;

  const statusColor =
    isOverspent
      ? caseBudgetEmailTheme
          .colors
          .danger
      : caseBudgetEmailTheme
          .colors
          .warning;

  const statusBackground =
    isOverspent
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
          {isOverspent
            ? "Budget exceeded"
            : "Budget alert"}
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
          {isOverspent
            ? `${budgetItemName} is over budget`
            : `${budgetItemName} is getting close`}
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
          {isOverspent
            ? "Your spending has moved beyond the amount planned for this budget item. Review the activity now so you can decide whether to adjust the budget or reduce additional spending."
            : "Your spending is approaching the amount planned for this budget item. A quick review now can help you stay on track before the category goes over budget."}
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
          {budgetGroupName ? (
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
              {budgetGroupName}
            </Text>
          ) : null}

          <Text
            style={{
              margin:
                "0 0 16px",

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
            {budgetItemName}
          </Text>

          {plannedAmount ? (
            <BudgetDetailRow
              label="Planned"
              value={
                plannedAmount
              }
            />
          ) : null}

          {spentAmount ? (
            <BudgetDetailRow
              label="Spent"
              value={
                spentAmount
              }
            />
          ) : null}

          {remainingAmount ? (
            <BudgetDetailRow
              label={
                isOverspent
                  ? "Over budget"
                  : "Remaining"
              }
              value={
                remainingAmount
              }
            />
          ) : null}

          {typeof percentUsed ===
          "number" ? (
            <BudgetDetailRow
              label="Budget used"
              value={`${Math.round(
                percentUsed,
              )}%`}
              isLast
            />
          ) : null}
        </Section>

        {typeof percentUsed ===
        "number" ? (
          <Section
            style={{
              margin:
                "0 0 28px",
            }}
          >
            <Text
              style={{
                margin:
                  "0 0 8px",

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
                  "0.8px",

                lineHeight:
                  "18px",

                textTransform:
                  "uppercase",
              }}
            >
              Spending progress
            </Text>

            <div
              style={{
                width:
                  "100%",

                height:
                  "12px",

                overflow:
                  "hidden",

                backgroundColor:
                  caseBudgetEmailTheme
                    .colors
                    .border,

                borderRadius:
                  "999px",
              }}
            >
              <div
                style={{
                  width:
                    `${Math.min(
                      Math.max(
                        percentUsed,
                        0,
                      ),
                      100,
                    )}%`,

                  height:
                    "12px",

                  backgroundColor:
                    statusColor,

                  borderRadius:
                    "999px",
                }}
              />
            </div>
          </Section>
        ) : null}

        <Section
          style={{
            margin:
              "0 0 28px",
          }}
        >
          <EmailButton
            href={budgetUrl}
          >
            Review budget
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
            Your budget can change
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
            If your priorities or
            expenses changed this
            month, adjust the planned
            amount intentionally rather
            than letting the category
            drift without a decision.
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
          This alert is based on the
          transactions and budget data
          currently recorded in your
          CASE Budget workspace. Pending
          or recently imported
          transactions may change these
          totals.
        </Text>
      </Section>
    </CaseBudgetEmailLayout>
  );
}

function BudgetDetailRow({
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
            }}
          >
            {value}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

BudgetAlert.PreviewProps = {
  firstName:
    "Calix",

  budgetItemName:
    "Dining Out",

  budgetGroupName:
    "Lifestyle",

  plannedAmount:
    "$300.00",

  spentAmount:
    "$258.42",

  remainingAmount:
    "$41.58",

  percentUsed:
    86,

  alertType:
    "warning",

  budgetUrl:
    "https://casebudgets.com/dashboard/budget",
} satisfies BudgetAlertEmailProps;