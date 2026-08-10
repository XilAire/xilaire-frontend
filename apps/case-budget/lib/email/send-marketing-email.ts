import "server-only";

import {
  createElement,
} from "react";

import Newsletter from "@/emails/marketing/Newsletter";
import ProductUpdate from "@/emails/marketing/ProductUpdate";
import WelcomeEmail from "@/emails/marketing/WelcomeEmail";

import {
  sendCaseBudgetEmail,
  type SendCaseBudgetEmailResult,
} from "./send-email";

import {
  CASE_BUDGET_EMAIL_ADDRESSES,
} from "./resend";

export type SendWelcomeEmailInput = {
  to:
    string;

  firstName?:
    string;

  workspaceName?:
    string;

  dashboardUrl?:
    string;
};

export type SendNewsletterEmailInput = {
  to:
    string;

  firstName?:
    string;

  issueTitle?:
    string;

  intro?:
    string;

  articles?: {
    title:
      string;

    description:
      string;

    href?:
      string;

    category?:
      string;
  }[];

  primaryCtaLabel?:
    string;

  primaryCtaUrl?:
    string;

  unsubscribeUrl?:
    string;
};

export type SendProductUpdateEmailInput = {
  to:
    string;

  firstName?:
    string;

  title?:
    string;

  subtitle?:
    string;

  versionLabel?:
    string;

  features?: {
    title:
      string;

    description:
      string;

    href?:
      string;

    badge?:
      string;
  }[];

  primaryCtaLabel?:
    string;

  primaryCtaUrl?:
    string;

  changelogUrl?:
    string;

  unsubscribeUrl?:
    string;
};

/**
 * Sends the CASE Budget welcome email after the user's
 * account has been confirmed and their workspace has
 * successfully been provisioned.
 */
export async function sendWelcomeEmail({
  to,
  firstName,
  workspaceName,
  dashboardUrl,
}: SendWelcomeEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      "Welcome to CASE Budget",

    sender:
      "hello",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        WelcomeEmail,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          workspaceName:
            normalizeOptionalText(
              workspaceName,
            ),

          dashboardUrl:
            normalizeOptionalText(
              dashboardUrl,
            ),
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "marketing",
      },

      {
        name:
          "template",

        value:
          "welcome",
      },

      {
        name:
          "type",

        value:
          "transactional",
      },
    ],
  });
}

/**
 * Sends an optional CASE Budget newsletter.
 *
 * This is a marketing message and should only be sent
 * to users who have opted in to receive marketing
 * communications.
 */
export async function sendNewsletterEmail({
  to,
  firstName,
  issueTitle,
  intro,
  articles = [],
  primaryCtaLabel,
  primaryCtaUrl,
  unsubscribeUrl,
}: SendNewsletterEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  const normalizedArticles =
    normalizeNewsletterArticles(
      articles,
    );

  const normalizedUnsubscribeUrl =
    normalizeOptionalText(
      unsubscribeUrl,
    );

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      normalizeOptionalText(
        issueTitle,
      ) ??
      "Your CASE Budget update",

    sender:
      "hello",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        Newsletter,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          issueTitle:
            normalizeOptionalText(
              issueTitle,
            ),

          intro:
            normalizeOptionalText(
              intro,
            ),

          articles:
            normalizedArticles.length >
            0
              ? normalizedArticles
              : undefined,

          primaryCtaLabel:
            normalizeOptionalText(
              primaryCtaLabel,
            ),

          primaryCtaUrl:
            normalizeOptionalText(
              primaryCtaUrl,
            ),

          unsubscribeUrl:
            normalizedUnsubscribeUrl,
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "marketing",
      },

      {
        name:
          "template",

        value:
          "newsletter",
      },

      {
        name:
          "type",

        value:
          "marketing",
      },
    ],
  });
}

/**
 * Sends a CASE Budget product-update message.
 *
 * This should only be used for users who are eligible
 * to receive product or marketing communications.
 */
export async function sendProductUpdateEmail({
  to,
  firstName,
  title,
  subtitle,
  versionLabel,
  features = [],
  primaryCtaLabel,
  primaryCtaUrl,
  changelogUrl,
  unsubscribeUrl,
}: SendProductUpdateEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  const normalizedFeatures =
    normalizeProductUpdateFeatures(
      features,
    );

  const normalizedUnsubscribeUrl =
    normalizeOptionalText(
      unsubscribeUrl,
    );

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      normalizeOptionalText(
        title,
      ) ??
      "What’s new in CASE Budget",

    sender:
      "hello",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        ProductUpdate,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          title:
            normalizeOptionalText(
              title,
            ),

          subtitle:
            normalizeOptionalText(
              subtitle,
            ),

          versionLabel:
            normalizeOptionalText(
              versionLabel,
            ),

          features:
            normalizedFeatures.length >
            0
              ? normalizedFeatures
              : undefined,

          primaryCtaLabel:
            normalizeOptionalText(
              primaryCtaLabel,
            ),

          primaryCtaUrl:
            normalizeOptionalText(
              primaryCtaUrl,
            ),

          changelogUrl:
            normalizeOptionalText(
              changelogUrl,
            ),

          unsubscribeUrl:
            normalizedUnsubscribeUrl,
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "marketing",
      },

      {
        name:
          "template",

        value:
          "product-update",
      },

      {
        name:
          "type",

        value:
          "marketing",
      },
    ],
  });
}

function normalizeNewsletterArticles(
  articles:
    {
      title:
        string;

      description:
        string;

      href?:
        string;

      category?:
        string;
    }[],
) {
  return articles
    .map(
      (
        article,
      ) => ({
        title:
          article.title.trim(),

        description:
          article.description.trim(),

        href:
          normalizeOptionalText(
            article.href,
          ),

        category:
          normalizeOptionalText(
            article.category,
          ),
      }),
    )
    .filter(
      (
        article,
      ) =>
        Boolean(
          article.title,
        ) &&
        Boolean(
          article.description,
        ),
    );
}

function normalizeProductUpdateFeatures(
  features:
    {
      title:
        string;

      description:
        string;

      href?:
        string;

      badge?:
        string;
    }[],
) {
  return features
    .map(
      (
        feature,
      ) => ({
        title:
          feature.title.trim(),

        description:
          feature.description.trim(),

        href:
          normalizeOptionalText(
            feature.href,
          ),

        badge:
          normalizeOptionalText(
            feature.badge,
          ),
      }),
    )
    .filter(
      (
        feature,
      ) =>
        Boolean(
          feature.title,
        ) &&
        Boolean(
          feature.description,
        ),
    );
}

function createInputFailure(
  code:
    string,
  message:
    string,
): SendCaseBudgetEmailResult {
  return {
    success:
      false,

    error: {
      code,
      message,

      statusCode:
        null,
    },
  };
}

function normalizeRequiredText(
  value:
    string,
) {
  return value.trim();
}

function normalizeOptionalText(
  value:
    string | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}