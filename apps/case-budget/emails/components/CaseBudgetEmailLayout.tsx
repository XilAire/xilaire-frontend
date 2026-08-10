import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
} from "react-email";

import {
  EmailFooter,
} from "./EmailFooter";

import {
  EmailHeader,
} from "./EmailHeader";

import {
  EmailCard,
} from "./EmailCard";

import {
  caseBudgetEmailTheme,
} from "../styles/theme";

export type CaseBudgetEmailLayoutProps = {
  children:
    React.ReactNode;

  preview:
    string;

  showHeader?:
    boolean;

  showFooter?:
    boolean;

  showSupportLink?:
    boolean;

  showWebsiteLink?:
    boolean;

  showSecurityNotice?:
    boolean;

  showUnsubscribe?:
    boolean;

  unsubscribeUrl?:
    string;

  centeredHeader?:
    boolean;

  compactHeader?:
    boolean;
};

export function CaseBudgetEmailLayout({
  children,
  preview,

  showHeader = true,

  showFooter = true,

  showSupportLink = true,

  showWebsiteLink = true,

  showSecurityNotice = false,

  showUnsubscribe = false,

  unsubscribeUrl,

  centeredHeader = true,

  compactHeader = false,
}: CaseBudgetEmailLayoutProps) {
  return (
    <Html>
      <Head />

      <Preview>
        {preview}
      </Preview>

      <Body
        style={{
          margin: 0,

          padding: "40px 20px",

          backgroundColor:
            caseBudgetEmailTheme
              .colors
              .background,

          fontFamily:
            caseBudgetEmailTheme
              .typography
              .fontFamily,
        }}
      >
        <Container
          style={{
            width: "100%",

            maxWidth:
              caseBudgetEmailTheme
                .sizing
                .emailWidth,

            margin:
              "0 auto",
          }}
        >
          <EmailCard
            padding="0"
          >
            {showHeader ? (
              <EmailHeader
                compact={
                  compactHeader
                }
                centered={
                  centeredHeader
                }
              />
            ) : null}

            <Section
              style={{
                padding:
                  "0 40px 40px",
              }}
            >
              {children}

              {showSecurityNotice ? (
                <Section
                  style={{
                    marginTop:
                      "32px",

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
                  <div
                    style={{
                      color:
                        caseBudgetEmailTheme
                          .colors
                          .textSecondary,

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
                    This email contains
                    information related
                    to your CASE Budget
                    account.

                    Never share your
                    verification codes,
                    sign-in links, or
                    passwords with
                    anyone.

                    CASE Budget will
                    never ask you for
                    your password by
                    email.
                  </div>
                </Section>
              ) : null}
            </Section>
          </EmailCard>

          {showFooter ? (
            <EmailFooter
              showSupportLink={
                showSupportLink
              }
              showWebsiteLink={
                showWebsiteLink
              }
              showUnsubscribe={
                showUnsubscribe
              }
              unsubscribeUrl={
                unsubscribeUrl
              }
            />
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}