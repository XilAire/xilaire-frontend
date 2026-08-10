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

export type ChangeEmailEmailProps = {
  firstName?: string;

  currentEmail?: string;

  newEmail?: string;

  confirmationUrl: string;

  expiresInMinutes?: number;
};

export default function ChangeEmailEmail({
  firstName,
  currentEmail,
  newEmail,
  confirmationUrl,
  expiresInMinutes = 60,
}: ChangeEmailEmailProps) {
  const greetingName =
    firstName?.trim() ||
    "there";

  const normalizedCurrentEmail =
    currentEmail?.trim();

  const normalizedNewEmail =
    newEmail?.trim();

  const preview =
    "Confirm the email address change for your CASE Budget account.";

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
          Account security
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
          Confirm your new email
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
          We received a request to change the email
          address associated with your CASE Budget
          account. Confirm the change using the
          secure button below.
        </Text>

        {normalizedCurrentEmail ||
        normalizedNewEmail ? (
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
            {normalizedCurrentEmail ? (
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
                      "1px",

                    lineHeight:
                      "18px",

                    textTransform:
                      "uppercase",
                  }}
                >
                  Current email
                </Text>

                <Text
                  style={{
                    margin:
                      normalizedNewEmail
                        ? "0 0 16px"
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
                      "15px",

                    fontWeight:
                      700,

                    lineHeight:
                      "24px",

                    wordBreak:
                      "break-word",
                  }}
                >
                  {normalizedCurrentEmail}
                </Text>
              </>
            ) : null}

            {normalizedNewEmail ? (
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
                      "1px",

                    lineHeight:
                      "18px",

                    textTransform:
                      "uppercase",
                  }}
                >
                  New email
                </Text>

                <Text
                  style={{
                    margin:
                      0,

                    color:
                      caseBudgetEmailTheme
                        .colors
                        .primary,

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

                    wordBreak:
                      "break-word",
                  }}
                >
                  {normalizedNewEmail}
                </Text>
              </>
            ) : null}
          </Section>
        ) : null}

        <Section
          style={{
            margin:
              "0 0 28px",
          }}
        >
          <EmailButton
            href={confirmationUrl}
          >
            Confirm email change
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
            Important security information
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
            Changing your email address changes the
            identity you use to sign in to CASE
            Budget. Only confirm this request if you
            initiated it.
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
          Didn&apos;t request this change?
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
          Do not use the confirmation link. Your
          current email address will remain
          unchanged. If you&apos;re concerned about
          the security of your account, contact CASE
          Budget support.
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

ChangeEmailEmail.PreviewProps = {
  firstName:
    "Calix",

  currentEmail:
    "calix@example.com",

  newEmail:
    "calix@casebudgets.com",

  confirmationUrl:
    "https://casebudgets.com/confirm?token=preview-email-change-token",

  expiresInMinutes:
    60,
} satisfies ChangeEmailEmailProps;