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

export type MagicLinkEmailProps = {
  firstName?: string;

  magicLinkUrl: string;

  expiresInMinutes?: number;
};

export default function MagicLinkEmail({
  firstName,
  magicLinkUrl,
  expiresInMinutes = 60,
}: MagicLinkEmailProps) {
  const greetingName =
    firstName?.trim() ||
    "there";

  const preview =
    "Use your secure CASE Budget sign-in link.";

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
          Secure sign in
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
          Sign in to CASE Budget
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
          Use the secure link below to sign in to
          your CASE Budget account. No password is
          required.
        </Text>

        <Section
          style={{
            margin:
              "0 0 28px",
          }}
        >
          <EmailButton
            href={magicLinkUrl}
          >
            Sign in securely
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
                .infoSoft,

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
            This link is for you only
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
            For your security, do not forward this
            email or share the sign-in link. The link
            can provide access to your CASE Budget
            account.
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
            href={magicLinkUrl}
            style={{
              color:
                caseBudgetEmailTheme
                  .colors
                  .primary,

              textDecoration:
                "underline",
            }}
          >
            {magicLinkUrl}
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
          Didn&apos;t request this sign-in link?
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
          You can safely ignore this email. Your
          account will remain secure as long as the
          sign-in link is not used.
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
          This sign-in link expires in{" "}
          {expiresInMinutes} minutes.
        </Text>
      </Section>
    </CaseBudgetEmailLayout>
  );
}

MagicLinkEmail.PreviewProps = {
  firstName:
    "Calix",

  magicLinkUrl:
    "https://casebudgets.com/callback?code=preview-magic-link-code",

  expiresInMinutes:
    60,
} satisfies MagicLinkEmailProps;