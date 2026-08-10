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

export type DebtMilestoneEmailProps = {
  firstName?: string;

  debtName: string;

  originalBalance?: string;

  currentBalance?: string;

  amountPaid?: string;

  percentPaid?: number;

  milestoneLabel?: string;

  debtUrl?: string;

  paidOff?: boolean;
};

export default function DebtMilestone({
  firstName,
  debtName,
  originalBalance,
  currentBalance,
  amountPaid,
  percentPaid,
  milestoneLabel,
  debtUrl =
    "https://casebudgets.com/dashboard/debts",
  paidOff = false,
}: DebtMilestoneEmailProps) {
  const greetingName =
    firstName?.trim() ||
    "there";

  const normalizedPercentPaid =
    typeof percentPaid ===
    "number"
      ? Math.min(
          Math.max(
            percentPaid,
            0,
          ),
          100,
        )
      : undefined;

  const resolvedMilestoneLabel =
    milestoneLabel?.trim() ||
    (
      paidOff
        ? "Debt paid off"
        : normalizedPercentPaid !==
          undefined
          ? `${Math.round(
              normalizedPercentPaid,
            )}% paid`
          : "Debt payoff milestone"
    );

  const preview =
    paidOff
      ? `You paid off ${debtName} in CASE Budget.`
      : `You reached a new payoff milestone for ${debtName}.`;

  return (
    <CaseBudgetEmailLayout
      preview={
        preview
      }
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
              caseBudgetEmailTheme
                .colors
                .success,

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
          {paidOff
            ? "Debt paid off"
            : "Debt milestone"}
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
          {paidOff
            ? `You paid off ${debtName}`
            : `You reached a new milestone`}
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
          {paidOff
            ? `Great progress. The balance recorded for ${debtName} has reached zero in CASE Budget.`
            : `Your payoff progress for ${debtName} has reached another meaningful milestone.`}
        </Text>

        <Section
          style={{
            margin:
              "0 0 28px",

            padding:
              "20px",

            backgroundColor:
              caseBudgetEmailTheme
                .colors
                .successSoft,

            border:
              `1px solid ${caseBudgetEmailTheme.colors.primaryBorder}`,

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
            Debt
          </Text>

          <Text
            style={{
              margin:
                "0 0 10px",

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
            {debtName}
          </Text>

          <Text
            style={{
              display:
                "inline-block",

              margin:
                "0 0 18px",

              padding:
                "5px 9px",

              color:
                caseBudgetEmailTheme
                  .colors
                  .success,

              backgroundColor:
                caseBudgetEmailTheme
                  .colors
                  .white,

              border:
                `1px solid ${caseBudgetEmailTheme.colors.primaryBorder}`,

              borderRadius:
                "999px",

              fontFamily:
                caseBudgetEmailTheme
                  .typography
                  .fontFamily,

              fontSize:
                "12px",

              fontWeight:
                800,

              lineHeight:
                "18px",
            }}
          >
            {resolvedMilestoneLabel}
          </Text>

          {originalBalance ? (
            <DebtDetailRow
              label="Original balance"
              value={
                originalBalance
              }
            />
          ) : null}

          {amountPaid ? (
            <DebtDetailRow
              label="Amount paid"
              value={
                amountPaid
              }
            />
          ) : null}

          {currentBalance ? (
            <DebtDetailRow
              label="Current balance"
              value={
                currentBalance
              }
            />
          ) : null}

          {normalizedPercentPaid !==
          undefined ? (
            <DebtDetailRow
              label="Paid off"
              value={`${Math.round(
                normalizedPercentPaid,
              )}%`}
              isLast
            />
          ) : null}
        </Section>

        {normalizedPercentPaid !==
        undefined ? (
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
              Payoff progress
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
                    `${normalizedPercentPaid}%`,

                  height:
                    "12px",

                  backgroundColor:
                    caseBudgetEmailTheme
                      .colors
                      .success,

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
            href={
              debtUrl
            }
          >
            {paidOff
              ? "View paid-off debt"
              : "View debt progress"}
          </EmailButton>
        </Section>

        <Heading
          as="h2"
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
              "20px",

            fontWeight:
              800,

            lineHeight:
              "28px",
          }}
        >
          {paidOff
            ? "Put that payment to work"
            : "Keep the momentum going"}
        </Heading>

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
              "15px",

            lineHeight:
              "24px",
          }}
        >
          {paidOff
            ? "Now that this debt is paid off, consider redirecting the payment amount toward your next debt, emergency savings, investing, or another financial priority."
            : "Every payment reduces the amount working against you. Keep following your plan and use each milestone as a checkpoint to review what is working."}
        </Text>

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
            Progress compounds
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
            Lower debt balances can free up cash
            flow and create more room in your
            financial plan. Keep your debt balances
            current in CASE Budget so your payoff
            picture stays accurate.
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
          This milestone is based on the debt
          balances and payments currently recorded
          in your CASE Budget workspace.
        </Text>
      </Section>
    </CaseBudgetEmailLayout>
  );
}

function DebtDetailRow({
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

DebtMilestone.PreviewProps = {
  firstName:
    "Calix",

  debtName:
    "Auto Loan",

  originalBalance:
    "$28,450.00",

  currentBalance:
    "$13,982.41",

  amountPaid:
    "$14,467.59",

  percentPaid:
    51,

  milestoneLabel:
    "Halfway there",

  paidOff:
    false,

  debtUrl:
    "https://casebudgets.com/dashboard/debts",
} satisfies DebtMilestoneEmailProps;