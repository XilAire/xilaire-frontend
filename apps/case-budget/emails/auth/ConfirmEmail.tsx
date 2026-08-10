import {
  Heading,
  Hr,
  Link,
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

export type ConfirmEmailProps = {
  firstName?: string;

  confirmationUrl: string;

  expiresInMinutes?: number;
};

export default function ConfirmEmail({
  firstName,
  confirmationUrl,
  expiresInMinutes = 60,
}: ConfirmEmailProps) {
  const greetingName =
    firstName?.trim() ||
    "there";

  const preview =
    "Confirm your CASE Budget email address.";

  return (
    <CaseBudgetEmailLayout
      preview={preview}
      showSecurityNotice
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
          Welcome to CASE Budget
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
          Confirm your email
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
          Thanks for creating your CASE Budget
          account. Confirm your email address to
          finish activating your account and begin
          setting up your personal financial
          workspace.
        </Text>

        <Section
          style={{
            margin:
              "0 0 28px",
          }}
        >
          <EmailButton
            href={confirmationUrl}
          >
            Confirm email address
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
            What happens next?
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
            After your email is confirmed, sign in
            to CASE Budget and we&apos;ll finish
            creating your personal profile,
            workspace, and account setup.
          </Text>
        </Section>

        <Text
          style={{
            margin:
              "0 0 12px",

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
          If the button above does not work, copy
          and paste this link into your browser:
        </Text>

        <Text
          style={{
            margin:
              "0 0 28px",

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

            wordBreak:
              "break-all",
          }}
        >
          <Link
            href={confirmationUrl}
            style={{
              color:
                caseBudgetEmailTheme
                  .colors
                  .primary,

              textDecoration:
                "underline",
            }}
          >
            {confirmationUrl}
          </Link>
        </Text>

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
              "0 0 8px",

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
          Didn&apos;t create this account?
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
              "14px",

            lineHeight:
              "22px",
          }}
        >
          You can safely ignore this email. No CASE
          Budget account will be activated unless
          the confirmation link is used.
        </Text>

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
          This confirmation link expires in{" "}
          {expiresInMinutes} minutes.
        </Text>
      </Section>
    </CaseBudgetEmailLayout>
  );
}

ConfirmEmail.PreviewProps = {
  firstName:
    "Calix",

  confirmationUrl:
    "https://casebudgets.com/confirm?token=preview-confirmation-token",

  expiresInMinutes:
    60,
} satisfies ConfirmEmailProps;