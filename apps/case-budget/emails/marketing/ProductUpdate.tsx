import {
  Heading,
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
  EmailCard,
} from "../components/EmailCard";

import {
  caseBudgetEmailTheme,
} from "../styles/theme";

export type ProductUpdateFeature = {
  title:
    string;

  description:
    string;

  href?:
    string;

  badge?:
    string;
};

export type ProductUpdateEmailProps = {
  firstName?:
    string;

  title?:
    string;

  subtitle?:
    string;

  versionLabel?:
    string;

  features?:
    ProductUpdateFeature[];

  primaryCtaLabel?:
    string;

  primaryCtaUrl?:
    string;

  changelogUrl?:
    string;

  unsubscribeUrl?:
    string;
};

export default function ProductUpdate({
  firstName,
  title =
    "What’s new in CASE Budget",
  subtitle =
    "We’ve made improvements to help you manage your money with less friction and better visibility.",
  versionLabel,
  features = [],
  primaryCtaLabel =
    "Open CASE Budget",
  primaryCtaUrl =
    "https://casebudgets.com/dashboard",
  changelogUrl,
  unsubscribeUrl,
}: ProductUpdateEmailProps) {
  const greetingName =
    firstName?.trim() ||
    "there";

  return (
    <CaseBudgetEmailLayout
      preview={
        title
      }
      showSecurityNotice={
        false
      }
      showSupportLink
      showWebsiteLink
      showUnsubscribe={
        Boolean(
          unsubscribeUrl,
        )
      }
      unsubscribeUrl={
        unsubscribeUrl
      }
    >
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
        Product update
      </Text>

      <Heading
        as="h1"
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
            "32px",

          fontWeight:
            800,

          letterSpacing:
            "-0.6px",

          lineHeight:
            "40px",
        }}
      >
        {title}
      </Heading>

      {versionLabel ? (
        <Text
          style={{
            margin:
              "0 0 18px",

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
              700,

            lineHeight:
              "20px",
          }}
        >
          {versionLabel}
        </Text>
      ) : null}

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
            "0 0 30px",

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
        {subtitle}
      </Text>

      {features.length >
      0 ? (
        <Section
          style={{
            margin:
              "0 0 30px",
          }}
        >
          {features.map(
            (
              feature,
              index,
            ) => (
              <FeatureCard
                key={`${feature.title}-${index}`}
                feature={
                  feature
                }
                isLast={
                  index ===
                  features.length -
                    1
                }
              />
            ),
          )}
        </Section>
      ) : null}

      <Section
        style={{
          margin:
            "0 0 28px",

          textAlign:
            "center",
        }}
      >
        <EmailButton
          href={
            primaryCtaUrl
          }
        >
          {
            primaryCtaLabel
          }
        </EmailButton>
      </Section>

      {changelogUrl ? (
        <Section
          style={{
            textAlign:
              "center",

            margin:
              "0 0 8px",
          }}
        >
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
            Want the full details?{" "}

            <Link
              href={
                changelogUrl
              }
              style={{
                color:
                  caseBudgetEmailTheme
                    .colors
                    .primary,

                fontWeight:
                  700,

                textDecoration:
                  "none",
              }}
            >
              View the changelog
            </Link>
          </Text>
        </Section>
      ) : null}
    </CaseBudgetEmailLayout>
  );
}

function FeatureCard({
  feature,
  isLast,
}: {
  feature:
    ProductUpdateFeature;

  isLast:
    boolean;
}) {
  return (
    <EmailCard
      padding="22px"
      shadow={
        false
      }
      backgroundColor={
        caseBudgetEmailTheme
          .colors
          .surfaceMuted
      }
      style={{
        marginBottom:
          isLast
            ? "0"
            : "16px",
      }}
    >
      {feature.badge ? (
        <Text
          style={{
            display:
              "inline-block",

            margin:
              "0 0 10px",

            padding:
              "4px 8px",

            color:
              caseBudgetEmailTheme
                .colors
                .primary,

            backgroundColor:
              caseBudgetEmailTheme
                .colors
                .primarySoft,

            border:
              `1px solid ${caseBudgetEmailTheme.colors.primaryBorder}`,

            borderRadius:
              "999px",

            fontFamily:
              caseBudgetEmailTheme
                .typography
                .fontFamily,

            fontSize:
              "11px",

            fontWeight:
              800,

            letterSpacing:
              "0.7px",

            lineHeight:
              "16px",

            textTransform:
              "uppercase",
          }}
        >
          {feature.badge}
        </Text>
      ) : null}

      <Heading
        as="h2"
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
        {feature.title}
      </Heading>

      <Text
        style={{
          margin:
            feature.href
              ? "0 0 12px"
              : 0,

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
        {feature.description}
      </Text>

      {feature.href ? (
        <Text
          style={{
            margin:
              0,

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
          <Link
            href={
              feature.href
            }
            style={{
              color:
                caseBudgetEmailTheme
                  .colors
                  .primary,

              fontWeight:
                700,

              textDecoration:
                "none",
            }}
          >
            Learn more →
          </Link>
        </Text>
      ) : null}
    </EmailCard>
  );
}

ProductUpdate.PreviewProps = {
  firstName:
    "Calix",

  title:
    "A better way to manage your financial accounts",

  subtitle:
    "This update brings improvements across account management, activity tracking, and the financial connections experience.",

  versionLabel:
    "August 2026 update",

  features: [
    {
      badge:
        "New",

      title:
        "Connected account foundation",

      description:
        "CASE Budget now has the foundation for securely connecting financial institutions and managing connection status.",

      href:
        "https://casebudgets.com/dashboard/accounts",
    },

    {
      badge:
        "Improved",

      title:
        "Account balances at a glance",

      description:
        "Review balances, available funds, account types, and connection details from one organized accounts workspace.",
    },

    {
      badge:
        "Security",

      title:
        "Stronger authentication flows",

      description:
        "Sign-in, sign-up, password recovery, session protection, and email confirmation have been strengthened throughout CASE Budget.",
    },
  ],

  primaryCtaLabel:
    "See what’s new",

  primaryCtaUrl:
    "https://casebudgets.com/dashboard",

  changelogUrl:
    "https://casebudgets.com/updates",

  unsubscribeUrl:
    "https://casebudgets.com/unsubscribe",
} satisfies ProductUpdateEmailProps;