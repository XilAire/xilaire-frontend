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

export type WeeklySummaryEmailProps = {
  firstName?: string;

  weekLabel?: string;

  incomeTotal?: string;

  spendingTotal?: string;

  billsPaidTotal?: string;

  billsDueTotal?: string;

  savingsTotal?: string;

  debtPaidTotal?: string;

  remainingToBudget?: string;

  netCashFlow?: string;

  summaryUrl?: string;

  topSpendingCategory?: string;

  topSpendingAmount?: string;
};

export default function WeeklySummary({
  firstName,
  weekLabel =
    "This week",
  incomeTotal,
  spendingTotal,
  billsPaidTotal,
  billsDueTotal,
  savingsTotal,
  debtPaidTotal,
  remainingToBudget,
  netCashFlow,
  summaryUrl =
    "https://casebudgets.com/dashboard",
  topSpendingCategory,
  topSpendingAmount,
}: WeeklySummaryEmailProps) {
  const greetingName =
    firstName?.trim() ||
    "there";

  const preview =
    `Your CASE Budget weekly summary for ${weekLabel}.`;

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
                .primary,

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
          Weekly financial summary
        </Text>

        <Heading
          as="h1"
          style={{
            margin:
              "0 0 12px",

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
          Your week in CASE Budget
        </Heading>

        <Text
          style={{
            margin:
              "0 0 18px",

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
              700,

            lineHeight:
              "20px",
          }}
        >
          {weekLabel}
        </Text>

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
          Here&apos;s a quick snapshot
          of what happened across your
          CASE Budget workspace this
          week.
        </Text>

        <Section
          style={{
            margin:
              "0 0 28px",
          }}
        >
          <SummaryGrid
            incomeTotal={
              incomeTotal
            }
            spendingTotal={
              spendingTotal
            }
            savingsTotal={
              savingsTotal
            }
            debtPaidTotal={
              debtPaidTotal
            }
          />
        </Section>

        <Section
          style={{
            margin:
              "0 0 28px",

            padding:
              "20px",

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
                "18px",

              fontWeight:
                800,

              lineHeight:
                "26px",
            }}
          >
            Weekly details
          </Text>

          {netCashFlow ? (
            <SummaryDetailRow
              label="Net cash flow"
              value={
                netCashFlow
              }
            />
          ) : null}

          {remainingToBudget ? (
            <SummaryDetailRow
              label="Remaining to budget"
              value={
                remainingToBudget
              }
            />
          ) : null}

          {billsPaidTotal ? (
            <SummaryDetailRow
              label="Bills paid"
              value={
                billsPaidTotal
              }
            />
          ) : null}

          {billsDueTotal ? (
            <SummaryDetailRow
              label="Bills still due"
              value={
                billsDueTotal
              }
            />
          ) : null}

          {topSpendingCategory ? (
            <SummaryDetailRow
              label="Top spending category"
              value={
                topSpendingAmount
                  ? `${topSpendingCategory} — ${topSpendingAmount}`
                  : topSpendingCategory
              }
              isLast
            />
          ) : null}
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
          A quick weekly check-in
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
          Review anything that looks
          different from what you
          expected. Small adjustments
          during the month are usually
          easier than trying to correct
          everything at the end.
        </Text>

        <Section
          style={{
            margin:
              "0 0 28px",
          }}
        >
          <EmailButton
            href={
              summaryUrl
            }
          >
            Review my finances
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
                .primarySoft,

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
            Keep the numbers current
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
            Categorize recent
            transactions, mark paid
            bills, and review account
            balances so next week&apos;s
            summary reflects the most
            accurate financial picture.
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
          This summary is based on the
          financial information
          currently available in your
          CASE Budget workspace.
          Pending transactions,
          incomplete categorization, or
          recently connected accounts
          may change these totals.
        </Text>
      </Section>
    </CaseBudgetEmailLayout>
  );
}

function SummaryGrid({
  incomeTotal,
  spendingTotal,
  savingsTotal,
  debtPaidTotal,
}: {
  incomeTotal?:
    string;

  spendingTotal?:
    string;

  savingsTotal?:
    string;

  debtPaidTotal?:
    string;
}) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding="0"
      cellSpacing="0"
      border={0}
    >
      <tbody>
        <tr>
          <td
            valign="top"
            style={{
              width:
                "50%",

              padding:
                "0 6px 12px 0",
            }}
          >
            <SummaryMetric
              label="Income"
              value={
                incomeTotal ||
                "—"
              }
            />
          </td>

          <td
            valign="top"
            style={{
              width:
                "50%",

              padding:
                "0 0 12px 6px",
            }}
          >
            <SummaryMetric
              label="Spending"
              value={
                spendingTotal ||
                "—"
              }
            />
          </td>
        </tr>

        <tr>
          <td
            valign="top"
            style={{
              width:
                "50%",

              padding:
                "0 6px 0 0",
            }}
          >
            <SummaryMetric
              label="Saved"
              value={
                savingsTotal ||
                "—"
              }
            />
          </td>

          <td
            valign="top"
            style={{
              width:
                "50%",

              padding:
                "0 0 0 6px",
            }}
          >
            <SummaryMetric
              label="Debt paid"
              value={
                debtPaidTotal ||
                "—"
              }
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <Section
      style={{
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

        boxSizing:
          "border-box",
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
            "11px",

          fontWeight:
            800,

          letterSpacing:
            "0.8px",

          lineHeight:
            "17px",

          textTransform:
            "uppercase",
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          margin:
            0,

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
        {value}
      </Text>
    </Section>
  );
}

function SummaryDetailRow({
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

WeeklySummary.PreviewProps = {
  firstName:
    "Calix",

  weekLabel:
    "August 3–9, 2026",

  incomeTotal:
    "$2,845.00",

  spendingTotal:
    "$1,624.38",

  billsPaidTotal:
    "$874.42",

  billsDueTotal:
    "$316.19",

  savingsTotal:
    "$425.00",

  debtPaidTotal:
    "$300.00",

  remainingToBudget:
    "$284.63",

  netCashFlow:
    "+$1,220.62",

  topSpendingCategory:
    "Groceries",

  topSpendingAmount:
    "$286.74",

  summaryUrl:
    "https://casebudgets.com/dashboard",
} satisfies WeeklySummaryEmailProps;