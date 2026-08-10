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

export type GoalReachedEmailProps = {
  firstName?: string;

  goalName: string;

  targetAmount?: string;

  savedAmount?: string;

  reachedOn?: string;

  goalUrl?: string;
};

export default function GoalReached({
  firstName,
  goalName,
  targetAmount,
  savedAmount,
  reachedOn,
  goalUrl =
    "https://casebudgets.com/dashboard/goals",
}: GoalReachedEmailProps) {
  const greetingName =
    firstName?.trim() ||
    "there";

  const preview =
    `You reached your ${goalName} goal in CASE Budget.`;

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
          Goal achieved
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
          You reached your goal
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
          You did it. Your{" "}
          <strong>
            {goalName}
          </strong>{" "}
          goal has reached its target in CASE Budget.
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
            Financial goal
          </Text>

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
            {goalName}
          </Text>

          {targetAmount ? (
            <GoalDetailRow
              label="Target"
              value={
                targetAmount
              }
            />
          ) : null}

          {savedAmount ? (
            <GoalDetailRow
              label="Saved"
              value={
                savedAmount
              }
            />
          ) : null}

          {reachedOn ? (
            <GoalDetailRow
              label="Reached on"
              value={
                reachedOn
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
            href={goalUrl}
          >
            View goal
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
          Keep the momentum going
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
          Reaching a financial goal is a meaningful
          milestone. When you&apos;re ready, consider
          assigning the money&apos;s next purpose or
          creating another goal so your progress keeps
          building.
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
            One goal down. What&apos;s next?
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
            You can create another savings goal,
            increase an existing target, redirect
            contributions toward debt, or simply enjoy
            the progress you&apos;ve made.
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
          This milestone is based on the goal balance
          currently recorded in your CASE Budget
          workspace.
        </Text>
      </Section>
    </CaseBudgetEmailLayout>
  );
}

function GoalDetailRow({
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

GoalReached.PreviewProps = {
  firstName:
    "Calix",

  goalName:
    "Emergency Fund",

  targetAmount:
    "$10,000.00",

  savedAmount:
    "$10,000.00",

  reachedOn:
    "August 7, 2026",

  goalUrl:
    "https://casebudgets.com/dashboard/goals",
} satisfies GoalReachedEmailProps;