import {
  Heading,
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

export type WelcomeEmailProps = {
  firstName?: string;

  workspaceName?: string;

  dashboardUrl?: string;
};

export default function WelcomeEmail({
  firstName,
  workspaceName,
  dashboardUrl = "https://casebudgets.com/dashboard",
}: WelcomeEmailProps) {
  const greetingName =
    firstName?.trim() ||
    "there";

  const resolvedWorkspaceName =
    workspaceName?.trim() ||
    "your personal workspace";

  const preview =
    "Welcome to CASE Budget — your financial workspace is ready.";

  return (
    <CaseBudgetEmailLayout
      preview={preview}
      showSecurityNotice={false}
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
          Welcome aboard
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
          Welcome to CASE Budget
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
          Your CASE Budget account is ready.
          You now have a dedicated financial
          workspace designed to help you plan every
          dollar, stay ahead of bills, and make
          steady progress toward your financial
          goals.
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
            Your workspace
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
                "18px",

              fontWeight:
                700,

              lineHeight:
                "26px",
            }}
          >
            {resolvedWorkspaceName}
          </Text>
        </Section>

        <Heading
          as="h2"
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
              "20px",

            fontWeight:
              800,

            lineHeight:
              "28px",
          }}
        >
          A good place to start
        </Heading>

        <Section
          style={{
            margin:
              "0 0 30px",
          }}
        >
          <OnboardingStep
            number="1"
            title="Build your first budget"
            description="Give every dollar a job and see exactly where your money is going."
          />

          <OnboardingStep
            number="2"
            title="Add your accounts"
            description="Track cash, checking, savings, credit, debt, and investments in one place."
          />

          <OnboardingStep
            number="3"
            title="Add your bills"
            description="Keep upcoming payments visible and stay ahead of due dates."
          />

          <OnboardingStep
            number="4"
            title="Set a financial goal"
            description="Create a clear target for saving, debt payoff, or building wealth."
            isLast
          />
        </Section>

        <Section
          style={{
            margin:
              "0 0 28px",
          }}
        >
          <EmailButton
            href={dashboardUrl}
          >
            Open CASE Budget
          </EmailButton>
        </Section>

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
            You don&apos;t have to set up
            everything today.
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
            Start with the part of your finances
            that matters most right now. CASE Budget
            is designed to grow with you as you add
            more accounts, goals, bills, and
            financial history.
          </Text>
        </Section>
      </Section>
    </CaseBudgetEmailLayout>
  );
}

function OnboardingStep({
  number,
  title,
  description,
  isLast = false,
}: {
  number:
    string;

  title:
    string;

  description:
    string;

  isLast?:
    boolean;
}) {
  return (
    <Section
      style={{
        margin:
          isLast
            ? 0
            : "0 0 14px",

        padding:
          "16px",

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
                  "42px",

                paddingRight:
                  "14px",
              }}
            >
              <div
                style={{
                  width:
                    "34px",

                  height:
                    "34px",

                  borderRadius:
                    "50%",

                  backgroundColor:
                    caseBudgetEmailTheme
                      .colors
                      .primary,

                  textAlign:
                    "center",

                  lineHeight:
                    "34px",

                  color:
                    caseBudgetEmailTheme
                      .colors
                      .white,

                  fontFamily:
                    caseBudgetEmailTheme
                      .typography
                      .fontFamily,

                  fontSize:
                    "14px",

                  fontWeight:
                    800,
                }}
              >
                {number}
              </div>
            </td>

            <td
              valign="top"
            >
              <Text
                style={{
                  margin:
                    "0 0 4px",

                  color:
                    caseBudgetEmailTheme
                      .colors
                      .text,

                  fontFamily:
                    caseBudgetEmailTheme
                      .typography
                      .fontFamily,

                  fontSize:
                    "15px",

                  fontWeight:
                    700,

                  lineHeight:
                    "22px",
                }}
              >
                {title}
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
                {description}
              </Text>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
}

WelcomeEmail.PreviewProps = {
  firstName:
    "Calix",

  workspaceName:
    "Calix's Personal Budget",

  dashboardUrl:
    "https://casebudgets.com/dashboard",
} satisfies WelcomeEmailProps;