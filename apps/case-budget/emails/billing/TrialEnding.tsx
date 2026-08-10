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

export type TrialEndingEmailProps = {
  firstName?: string;

  planName?: string;

  trialEndsOn?: string;

  daysRemaining?: number;

  billingUrl?: string;

  monthlyPrice?: string;

  annualPrice?: string;
};

export default function TrialEnding({
  firstName,
  planName = "CASE Budget Premium",
  trialEndsOn,
  daysRemaining = 3,
  billingUrl =
    "https://casebudgets.com/dashboard/settings/billing",
  monthlyPrice,
  annualPrice,
}: TrialEndingEmailProps) {
  const greetingName =
    firstName?.trim() ||
    "there";

  const preview =
    `Your ${planName} trial ends soon.`;

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
                .warning,

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
          Trial ending soon
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
          Keep your CASE Budget
          features active
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
          Your {planName} trial is
          almost over. Review your
          billing options now so
          there&apos;s no interruption
          to the premium features
          you&apos;ve been using.
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
                .warningSoft,

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
            Trial status
          </Text>

          <Text
            style={{
              margin:
                "0 0 8px",

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
            {daysRemaining}{" "}
            {daysRemaining === 1
              ? "day"
              : "days"}{" "}
            remaining
          </Text>

          {trialEndsOn ? (
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
              Your trial ends on{" "}
              <strong>
                {trialEndsOn}
              </strong>
              .
            </Text>
          ) : null}
        </Section>

        {monthlyPrice ||
        annualPrice ? (
          <Section
            style={{
              margin:
                "0 0 28px",
            }}
          >
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
              Choose the plan that
              works for you
            </Heading>

            <table
              role="presentation"
              width="100%"
              cellPadding="0"
              cellSpacing="0"
              border={0}
            >
              <tbody>
                <tr>
                  {monthlyPrice ? (
                    <td
                      valign="top"
                      style={{
                        width:
                          annualPrice
                            ? "50%"
                            : "100%",

                        paddingRight:
                          annualPrice
                            ? "6px"
                            : 0,
                      }}
                    >
                      <PlanCard
                        label="Monthly"
                        price={
                          monthlyPrice
                        }
                      />
                    </td>
                  ) : null}

                  {annualPrice ? (
                    <td
                      valign="top"
                      style={{
                        width:
                          monthlyPrice
                            ? "50%"
                            : "100%",

                        paddingLeft:
                          monthlyPrice
                            ? "6px"
                            : 0,
                      }}
                    >
                      <PlanCard
                        label="Annual"
                        price={
                          annualPrice
                        }
                        recommended
                      />
                    </td>
                  ) : null}
                </tr>
              </tbody>
            </table>
          </Section>
        ) : null}

        <Section
          style={{
            margin:
              "0 0 28px",
          }}
        >
          <EmailButton
            href={billingUrl}
          >
            Review billing options
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
            Your financial data stays
            yours
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
            If your trial ends
            without an upgrade, your
            account and financial
            information will not be
            automatically deleted.
            Access to plan-specific
            features may change based
            on your account tier.
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
          You can review subscription
          details, payment methods, and
          future billing information
          from your CASE Budget account
          settings.
        </Text>
      </Section>
    </CaseBudgetEmailLayout>
  );
}

function PlanCard({
  label,
  price,
  recommended = false,
}: {
  label:
    string;

  price:
    string;

  recommended?:
    boolean;
}) {
  return (
    <Section
      style={{
        padding:
          "18px",

        backgroundColor:
          recommended
            ? caseBudgetEmailTheme
                .colors
                .primarySoft
            : caseBudgetEmailTheme
                .colors
                .surfaceMuted,

        border:
          `1px solid ${
            recommended
              ? caseBudgetEmailTheme
                  .colors
                  .primaryBorder
              : caseBudgetEmailTheme
                  .colors
                  .border
          }`,

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
            recommended
              ? caseBudgetEmailTheme
                  .colors
                  .primary
              : caseBudgetEmailTheme
                  .colors
                  .textMuted,

          fontFamily:
            caseBudgetEmailTheme
              .typography
              .fontFamily,

          fontSize:
            "12px",

          fontWeight:
            800,

          letterSpacing:
            "0.8px",

          lineHeight:
            "18px",

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
        {price}
      </Text>
    </Section>
  );
}

TrialEnding.PreviewProps = {
  firstName:
    "Calix",

  planName:
    "CASE Budget Premium",

  trialEndsOn:
    "August 10, 2026",

  daysRemaining:
    3,

  monthlyPrice:
    "$9.99 / month",

  annualPrice:
    "$99 / year",

  billingUrl:
    "https://casebudgets.com/dashboard/settings/billing",
} satisfies TrialEndingEmailProps;