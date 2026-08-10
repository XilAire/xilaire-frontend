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

export type InviteUserEmailProps = {
  recipientName?: string;

  inviterName?: string;

  workspaceName?: string;

  inviteUrl: string;

  expiresInHours?: number;
};

export default function InviteUserEmail({
  recipientName,
  inviterName,
  workspaceName,
  inviteUrl,
  expiresInHours = 72,
}: InviteUserEmailProps) {
  const greetingName =
    recipientName?.trim() ||
    "there";

  const resolvedInviterName =
    inviterName?.trim() ||
    "A CASE Budget member";

  const resolvedWorkspaceName =
    workspaceName?.trim() ||
    "a CASE Budget workspace";

  const preview =
    `${resolvedInviterName} invited you to join ${resolvedWorkspaceName}.`;

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
          Workspace invitation
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
          You&apos;ve been invited
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
          {resolvedInviterName} invited you to join{" "}
          <strong>
            {resolvedWorkspaceName}
          </strong>{" "}
          in CASE Budget.
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
            Workspace
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
          Once you accept, you&apos;ll be able to
          access the financial workspace based on
          the permissions assigned to your
          membership.
        </Text>

        <Section
          style={{
            margin:
              "0 0 28px",
          }}
        >
          <EmailButton
            href={inviteUrl}
          >
            Accept invitation
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
            Your financial privacy matters
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
            CASE Budget workspace access is
            permission-based. Accepting this
            invitation does not automatically grant
            unrestricted access to every financial
            feature or account.
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
            href={inviteUrl}
            style={{
              color:
                caseBudgetEmailTheme
                  .colors
                  .primary,

              textDecoration:
                "underline",
            }}
          >
            {inviteUrl}
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
          Don&apos;t recognize this invitation?
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
          You can safely ignore this email. You
          won&apos;t be added to the workspace
          unless you accept the invitation.
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
          This invitation expires in{" "}
          {expiresInHours} hours.
        </Text>
      </Section>
    </CaseBudgetEmailLayout>
  );
}

InviteUserEmail.PreviewProps = {
  recipientName:
    "Stephanie",

  inviterName:
    "Calix",

  workspaceName:
    "St. Hilaire Household",

  inviteUrl:
    "https://casebudgets.com/invitations/accept?token=preview-invitation-token",

  expiresInHours:
    72,
} satisfies InviteUserEmailProps;