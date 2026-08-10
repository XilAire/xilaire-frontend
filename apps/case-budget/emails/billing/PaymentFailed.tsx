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

export type PaymentFailedEmailProps = {
  firstName?: string;

  planName?: string;

  amountDue?: string;

  retryDate?: string;

  billingUrl?: string;

  supportEmail?: string;
};

export default function PaymentFailed({
  firstName,
  planName = "CASE Budget Premium",
  amountDue,
  retryDate,
  billingUrl =
    "https://casebudgets.com/dashboard/settings/billing",
  supportEmail =
    caseBudgetEmailTheme
      .brand
      .supportEmail,
}: PaymentFailedEmailProps) {
  const greetingName =
    firstName?.trim() ||
    "there";

  const preview =
    "We couldn’t process your CASE Budget payment.";

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
                .danger,

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
          Payment issue
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
          We couldn&apos;t process
          your payment
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
          We were unable to process
          the latest payment for your{" "}
          <strong>
            {planName}
          </strong>{" "}
          subscription. Please review
          your billing information to
          avoid an interruption to
          premium features.
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
                .dangerSoft,

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
            Payment status
          </Text>

          <Text
            style={{
              margin:
                amountDue ||
                retryDate
                  ? "0 0 12px"
                  : 0,

              color:
                caseBudgetEmailTheme
                  .colors
                  .danger,

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
            Payment failed
          </Text>

          {amountDue ? (
            <>
              <Text
                style={{
                  margin:
                    "0 0 4px",

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
                Amount due
              </Text>

              <Text
                style={{
                  margin:
                    retryDate
                      ? "0 0 14px"
                      : 0,

                  color:
                    caseBudgetEmailTheme
                      .colors
                      .text,

                  fontFamily:
                    caseBudgetEmailTheme
                      .typography
                      .fontFamily,

                  fontSize:
                    "17px",

                  fontWeight:
                    700,

                  lineHeight:
                    "24px",
                }}
              >
                {amountDue}
              </Text>
            </>
          ) : null}

          {retryDate ? (
            <>
              <Text
                style={{
                  margin:
                    "0 0 4px",

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
                Next retry
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
                      .fontFamily,

                  fontSize:
                    "15px",

                  fontWeight:
                    700,

                  lineHeight:
                    "24px",
                }}
              >
                {retryDate}
              </Text>
            </>
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
          What to do next
        </Heading>

        <Section
          style={{
            margin:
              "0 0 28px",
          }}
        >
          <ActionItem
            number="1"
            title="Review your payment method"
            description="Make sure your card or payment account is active and the billing details are current."
          />

          <ActionItem
            number="2"
            title="Update billing information if needed"
            description="You can securely manage your subscription and payment method from CASE Budget settings."
          />

          <ActionItem
            number="3"
            title="Contact support if the issue continues"
            description={`If your payment details look correct but the charge still fails, contact ${supportEmail}.`}
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
            href={billingUrl}
          >
            Update billing information
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
            Your financial information
            is not affected
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
            A failed subscription
            payment does not delete
            your CASE Budget account,
            budgets, transactions,
            account data, or financial
            history. Access to
            plan-specific features may
            change if billing is not
            resolved.
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
          If you already updated your
          payment method, no additional
          action may be necessary while
          the payment processor retries
          the charge.
        </Text>
      </Section>
    </CaseBudgetEmailLayout>
  );
}

function ActionItem({
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
            : "0 0 12px",

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
                      .dangerSoft,

                  border:
                    `1px solid ${caseBudgetEmailTheme.colors.border}`,

                  textAlign:
                    "center",

                  lineHeight:
                    "32px",

                  color:
                    caseBudgetEmailTheme
                      .colors
                      .danger,

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

PaymentFailed.PreviewProps = {
  firstName:
    "Calix",

  planName:
    "CASE Budget Premium",

  amountDue:
    "$9.99",

  retryDate:
    "August 10, 2026",

  billingUrl:
    "https://casebudgets.com/dashboard/settings/billing",

  supportEmail:
    "support@casebudgets.com",
} satisfies PaymentFailedEmailProps;