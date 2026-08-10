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

export type ReceiptLineItem = {
  label:
    string;

  amount:
    string;
};

export type ReceiptEmailProps = {
  firstName?:
    string;

  receiptNumber?:
    string;

  billingDate?:
    string;

  planName?:
    string;

  paymentMethodLabel?:
    string;

  subtotal?:
    string;

  tax?:
    string;

  total:
    string;

  lineItems?:
    ReceiptLineItem[];

  billingUrl?:
    string;

  receiptUrl?:
    string;
};

export default function Receipt({
  firstName,
  receiptNumber,
  billingDate,
  planName =
    "CASE Budget Premium",
  paymentMethodLabel,
  subtotal,
  tax,
  total,
  lineItems = [],
  billingUrl =
    "https://casebudgets.com/dashboard/settings/billing",
  receiptUrl,
}: ReceiptEmailProps) {
  const greetingName =
    firstName?.trim() ||
    "there";

  const preview =
    `Your CASE Budget receipt for ${total}.`;

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
          Payment received
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
          Thanks for your payment
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
          We successfully received your
          payment for{" "}
          <strong>
            {planName}
          </strong>
          . This email is your payment
          confirmation and receipt.
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
            Total paid
          </Text>

          <Text
            style={{
              margin:
                0,

              color:
                caseBudgetEmailTheme
                  .colors
                  .success,

              fontFamily:
                caseBudgetEmailTheme
                  .typography
                  .headingFontFamily,

              fontSize:
                "28px",

              fontWeight:
                800,

              lineHeight:
                "36px",
            }}
          >
            {total}
          </Text>
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
          Receipt details
        </Heading>

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
          {receiptNumber ? (
            <ReceiptDetailRow
              label="Receipt"
              value={
                receiptNumber
              }
            />
          ) : null}

          {billingDate ? (
            <ReceiptDetailRow
              label="Billing date"
              value={
                billingDate
              }
            />
          ) : null}

          <ReceiptDetailRow
            label="Plan"
            value={
              planName
            }
          />

          {paymentMethodLabel ? (
            <ReceiptDetailRow
              label="Payment method"
              value={
                paymentMethodLabel
              }
              isLast={
                lineItems.length ===
                  0 &&
                !subtotal &&
                !tax
              }
            />
          ) : null}
        </Section>

        {lineItems.length >
        0 ? (
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
              Charges
            </Heading>

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
              {lineItems.map(
                (
                  item,
                  index,
                ) => (
                  <AmountRow
                    key={`${item.label}-${index}`}
                    label={
                      item.label
                    }
                    value={
                      item.amount
                    }
                    isLast={
                      index ===
                        lineItems.length -
                          1 &&
                      !subtotal &&
                      !tax
                    }
                  />
                ),
              )}

              {subtotal ? (
                <AmountRow
                  label="Subtotal"
                  value={
                    subtotal
                  }
                />
              ) : null}

              {tax ? (
                <AmountRow
                  label="Tax"
                  value={
                    tax
                  }
                />
              ) : null}

              <Hr
                style={{
                  border:
                    "none",

                  borderTop:
                    `1px solid ${caseBudgetEmailTheme.colors.border}`,

                  margin:
                    "14px 0",
                }}
              />

              <AmountRow
                label="Total"
                value={
                  total
                }
                emphasized
                isLast
              />
            </Section>
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
              receiptUrl ||
              billingUrl
            }
          >
            {receiptUrl
              ? "View receipt"
              : "View billing"}
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
            Keep this receipt for your
            records
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
            You can review your
            subscription status,
            payment history, and billing
            information anytime from
            CASE Budget settings.
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
          If you don&apos;t recognize
          this charge, contact CASE
          Budget support so we can help
          you review the transaction.
        </Text>
      </Section>
    </CaseBudgetEmailLayout>
  );
}

function ReceiptDetailRow({
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
            : "12px",
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

function AmountRow({
  label,
  value,
  emphasized = false,
  isLast = false,
}: {
  label:
    string;

  value:
    string;

  emphasized?:
    boolean;

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
              color:
                emphasized
                  ? caseBudgetEmailTheme
                      .colors
                      .text
                  : caseBudgetEmailTheme
                      .colors
                      .textSecondary,

              fontFamily:
                caseBudgetEmailTheme
                  .typography
                  .fontFamily,

              fontSize:
                emphasized
                  ? "15px"
                  : "14px",

              fontWeight:
                emphasized
                  ? 800
                  : 500,

              lineHeight:
                "22px",
            }}
          >
            {label}
          </td>

          <td
            valign="top"
            align="right"
            style={{
              color:
                emphasized
                  ? caseBudgetEmailTheme
                      .colors
                      .text
                  : caseBudgetEmailTheme
                      .colors
                      .textSecondary,

              fontFamily:
                caseBudgetEmailTheme
                  .typography
                  .fontFamily,

              fontSize:
                emphasized
                  ? "15px"
                  : "14px",

              fontWeight:
                emphasized
                  ? 800
                  : 700,

              lineHeight:
                "22px",
            }}
          >
            {value}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

Receipt.PreviewProps = {
  firstName:
    "Calix",

  receiptNumber:
    "CB-2026-000184",

  billingDate:
    "August 7, 2026",

  planName:
    "CASE Budget Premium",

  paymentMethodLabel:
    "Visa ending in 4242",

  lineItems: [
    {
      label:
        "CASE Budget Premium — Monthly",
      amount:
        "$9.99",
    },
  ],

  subtotal:
    "$9.99",

  tax:
    "$0.70",

  total:
    "$10.69",

  receiptUrl:
    "https://casebudgets.com/dashboard/settings/billing/receipts/CB-2026-000184",

  billingUrl:
    "https://casebudgets.com/dashboard/settings/billing",
} satisfies ReceiptEmailProps;