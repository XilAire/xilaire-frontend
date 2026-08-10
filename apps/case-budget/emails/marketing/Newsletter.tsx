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

export type NewsletterArticle = {
  title: string;

  description: string;

  href?: string;

  category?: string;
};

export type NewsletterEmailProps = {
  firstName?: string;

  issueTitle?: string;

  intro?: string;

  articles?: NewsletterArticle[];

  primaryCtaLabel?: string;

  primaryCtaUrl?: string;

  unsubscribeUrl?: string;
};

export default function Newsletter({
  firstName,
  issueTitle = "CASE Budget Newsletter",
  intro = "Here's what's new this month from CASE Budget.",
  articles = [],
  primaryCtaLabel = "Open CASE Budget",
  primaryCtaUrl = "https://casebudgets.com/dashboard",
  unsubscribeUrl,
}: NewsletterEmailProps) {
  return (
    <CaseBudgetEmailLayout
      preview={issueTitle}
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
      <Heading
        style={{
          color:
            caseBudgetEmailTheme
              .colors.text,

          fontFamily:
            caseBudgetEmailTheme
              .typography
              .headingFontFamily,

          fontSize:
            "30px",

          fontWeight:
            800,

          margin:
            "0 0 18px",
        }}
      >
        {issueTitle}
      </Heading>

      <Text
        style={{
          color:
            caseBudgetEmailTheme
              .colors.textSecondary,

          fontSize:
            "16px",

          lineHeight:
            "28px",

          margin:
            "0 0 28px",
        }}
      >
        Hello{" "}
        {firstName ??
          "there"}
        ,
      </Text>

      <Text
        style={{
          color:
            caseBudgetEmailTheme
              .colors.textSecondary,

          fontSize:
            "16px",

          lineHeight:
            "28px",

          margin:
            "0 0 32px",
        }}
      >
        {intro}
      </Text>

      {articles.map(
        (
          article,
          index,
        ) => (
          <EmailCard
            key={`${article.title}-${index}`}
            padding="24px"
            style={{
              marginBottom:
                "20px",
            }}
          >
            {article.category ? (
              <Text
                style={{
                  margin:
                    "0 0 8px",

                  color:
                    caseBudgetEmailTheme
                      .colors.primary,

                  fontSize:
                    "11px",

                  fontWeight:
                    700,

                  textTransform:
                    "uppercase",

                  letterSpacing:
                    "1px",
                }}
              >
                {
                  article.category
                }
              </Text>
            ) : null}

            <Heading
              as="h2"
              style={{
                margin:
                  "0 0 10px",

                fontSize:
                  "22px",

                fontWeight:
                  700,

                color:
                  caseBudgetEmailTheme
                    .colors.text,
              }}
            >
              {article.title}
            </Heading>

            <Text
              style={{
                color:
                  caseBudgetEmailTheme
                    .colors.textSecondary,

                lineHeight:
                  "26px",

                margin:
                  "0",
              }}
            >
              {
                article.description
              }
            </Text>

            {article.href ? (
              <Section
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <Link
                  href={
                    article.href
                  }
                  style={{
                    color:
                      caseBudgetEmailTheme
                        .colors.primary,

                    fontWeight:
                      700,

                    textDecoration:
                      "none",
                  }}
                >
                  Read more →
                </Link>
              </Section>
            ) : null}
          </EmailCard>
        ),
      )}

      <Section
        style={{
          textAlign:
            "center",

          marginTop:
            "36px",
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
    </CaseBudgetEmailLayout>
  );
}

Newsletter.PreviewProps =
  {
    firstName:
      "Calix",

    issueTitle:
      "August 2026 Newsletter",

    intro:
      "This month we're introducing new budgeting tools, account improvements, and several features requested by our community.",

    primaryCtaLabel:
      "Open Dashboard",

    primaryCtaUrl:
      "https://casebudgets.com/dashboard",

    unsubscribeUrl:
      "https://casebudgets.com/unsubscribe",

    articles: [
      {
        category:
          "New Feature",

        title:
          "Budget Forecasting",

        description:
          "Project your cash flow several months into the future using upcoming bills, recurring income, and savings goals.",

        href:
          "https://casebudgets.com/features",
      },

      {
        category:
          "Tips",

        title:
          "Build Your Emergency Fund Faster",

        description:
          "Learn practical strategies for reaching your savings goals without sacrificing your monthly budget.",

        href:
          "https://casebudgets.com/blog",
      },
    ],
  } satisfies NewsletterEmailProps;