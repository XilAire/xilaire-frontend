import {
  Hr,
  Link,
  Section,
  Text,
} from "react-email";

import {
  caseBudgetEmailTheme,
} from "../styles/theme";

export type EmailFooterProps = {
  showSupportLink?: boolean;

  showWebsiteLink?: boolean;

  showUnsubscribe?: boolean;

  unsubscribeUrl?: string;

  privacyUrl?: string;

  termsUrl?: string;
};

export function EmailFooter({
  showSupportLink = true,
  showWebsiteLink = true,
  showUnsubscribe = false,
  unsubscribeUrl,
  privacyUrl = `${caseBudgetEmailTheme.brand.websiteUrl}/privacy`,
  termsUrl = `${caseBudgetEmailTheme.brand.websiteUrl}/terms`,
}: EmailFooterProps) {
  const currentYear =
    new Date().getFullYear();

  return (
    <Section
      style={{
        padding:
          "0 40px 40px",
      }}
    >
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
            "0 0 14px",

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

          textAlign:
            "center",
        }}
      >
        {
          caseBudgetEmailTheme
            .brand
            .name
        }
      </Text>

      <Text
        style={{
          margin:
            "0 0 20px",

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

          textAlign:
            "center",
        }}
      >
        {
          caseBudgetEmailTheme
            .brand
            .tagline
        }
      </Text>

      {showSupportLink ? (
        <Text
          style={{
            margin:
              "0 0 12px",

            textAlign:
              "center",

            fontFamily:
              caseBudgetEmailTheme
                .typography
                .fontFamily,

            fontSize:
              "13px",

            lineHeight:
              "21px",

            color:
              caseBudgetEmailTheme
                .colors
                .textSecondary,
          }}
        >
          Need help?{" "}
          <Link
            href={`mailto:${caseBudgetEmailTheme.brand.supportEmail}`}
            style={{
              color:
                caseBudgetEmailTheme
                  .colors
                  .primary,

              textDecoration:
                "none",
            }}
          >
            {
              caseBudgetEmailTheme
                .brand
                .supportEmail
            }
          </Link>
        </Text>
      ) : null}

      {showWebsiteLink ? (
        <Text
          style={{
            margin:
              "0 0 20px",

            textAlign:
              "center",

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
          <Link
            href={
              caseBudgetEmailTheme
                .brand
                .websiteUrl
            }
            style={{
              color:
                caseBudgetEmailTheme
                  .colors
                  .primary,

              textDecoration:
                "none",
            }}
          >
            casebudgets.com
          </Link>
        </Text>
      ) : null}

      <Text
        style={{
          margin:
            "0 0 16px",

          textAlign:
            "center",

          fontFamily:
            caseBudgetEmailTheme
              .typography
              .fontFamily,

          fontSize:
            "12px",

          lineHeight:
            "20px",

          color:
            caseBudgetEmailTheme
              .colors
              .textMuted,
        }}
      >
        <Link
          href={privacyUrl}
          style={{
            color:
              caseBudgetEmailTheme
                .colors
                .textMuted,

            textDecoration:
              "none",
          }}
        >
          Privacy Policy
        </Link>

        {" • "}

        <Link
          href={termsUrl}
          style={{
            color:
              caseBudgetEmailTheme
                .colors
                .textMuted,

            textDecoration:
              "none",
          }}
        >
          Terms of Service
        </Link>

        {showUnsubscribe &&
        unsubscribeUrl ? (
          <>
            {" • "}

            <Link
              href={
                unsubscribeUrl
              }
              style={{
                color:
                  caseBudgetEmailTheme
                    .colors
                    .textMuted,

                textDecoration:
                  "none",
              }}
            >
              Unsubscribe
            </Link>
          </>
        ) : null}
      </Text>

      <Text
        style={{
          margin:
            0,

          textAlign:
            "center",

          fontFamily:
            caseBudgetEmailTheme
              .typography
              .fontFamily,

          fontSize:
            "12px",

          lineHeight:
            "20px",

          color:
            caseBudgetEmailTheme
              .colors
              .textMuted,
        }}
      >
        © {currentYear}{" "}
        {
          caseBudgetEmailTheme
            .brand
            .companyName
        }

        <br />

        All rights reserved.
      </Text>
    </Section>
  );
}