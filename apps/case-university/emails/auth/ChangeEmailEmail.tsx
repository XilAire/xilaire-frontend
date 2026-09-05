import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type ChangeEmailEmailProps = {
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
  const greeting = firstName?.trim()
    ? `Hi ${firstName.trim()},`
    : "Hello,";

  const expirationLabel =
    expiresInMinutes === 1
      ? "1 minute"
      : `${expiresInMinutes} minutes`;

  return (
    <Html>
      <Head />
      <Preview>Confirm your CASE University email change</Preview>

      <Body
        style={{
          margin: "0",
          padding: "0",
          backgroundColor: "#f6f8fc",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: "#172033",
        }}
      >
        <Container style={{ width: "100%", maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
          <BrandHeader />

          <Section style={{ backgroundColor: "#ffffff", border: "1px solid #e4e7ec", borderRadius: "18px", padding: "32px" }}>
            <Text style={{ margin: "0 0 18px", fontSize: "16px", lineHeight: "24px", color: "#344054" }}>
              {greeting}
            </Text>

            <Heading as="h1" style={{ margin: "0 0 18px", fontSize: "30px", lineHeight: "38px", fontWeight: "700", letterSpacing: "-0.02em", color: "#172033" }}>
              Confirm your email change
            </Heading>

            <Text style={{ margin: "0 0 24px", fontSize: "16px", lineHeight: "26px", color: "#475467" }}>
              We received a request to change the email address associated
              with your CASE account.
            </Text>

            {(currentEmail?.trim() || newEmail?.trim()) ? (
              <Section style={{ margin: "0 0 24px", borderRadius: "12px", backgroundColor: "#f8fafc", padding: "16px" }}>
                {currentEmail?.trim() ? (
                  <>
                    <Text style={{ margin: "0 0 4px", fontSize: "12px", lineHeight: "18px", fontWeight: "700", color: "#667085" }}>
                      Current email
                    </Text>
                    <Text style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: "22px", color: "#172033" }}>
                      {currentEmail.trim()}
                    </Text>
                  </>
                ) : null}

                {newEmail?.trim() ? (
                  <>
                    <Text style={{ margin: "0 0 4px", fontSize: "12px", lineHeight: "18px", fontWeight: "700", color: "#667085" }}>
                      New email
                    </Text>
                    <Text style={{ margin: "0", fontSize: "14px", lineHeight: "22px", color: "#172033" }}>
                      {newEmail.trim()}
                    </Text>
                  </>
                ) : null}
              </Section>
            ) : null}

            <Section style={{ margin: "28px 0", textAlign: "center" }}>
              <Button
                href={confirmationUrl}
                style={{
                  display: "inline-block",
                  borderRadius: "10px",
                  backgroundColor: "#2563eb",
                  padding: "14px 24px",
                  fontSize: "16px",
                  lineHeight: "20px",
                  fontWeight: "700",
                  textDecoration: "none",
                  color: "#ffffff",
                }}
              >
                Confirm email change
              </Button>
            </Section>

            <Text style={{ margin: "0 0 14px", fontSize: "14px", lineHeight: "22px", color: "#667085" }}>
              This confirmation link expires in {expirationLabel}.
            </Text>

            <Text style={{ margin: "0 0 24px", fontSize: "14px", lineHeight: "22px", color: "#667085" }}>
              If you did not request this change, do not use the link. Your
              existing account email will remain unchanged.
            </Text>

            <Hr style={{ margin: "26px 0", borderColor: "#e4e7ec" }} />

            <Text style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: "20px", color: "#667085" }}>
              If the button does not work, copy and paste this link into your browser:
            </Text>

            <Link href={confirmationUrl} style={{ display: "block", overflowWrap: "anywhere", fontSize: "13px", lineHeight: "20px", color: "#2563eb", textDecoration: "underline" }}>
              {confirmationUrl}
            </Link>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

function BrandHeader() {
  return (
    <Section style={{ marginBottom: "28px", textAlign: "center" }}>
      <Text style={{ margin: "0 0 6px", fontSize: "22px", lineHeight: "28px", fontWeight: "700", color: "#172033" }}>
        CASE University
      </Text>
      <Text style={{ margin: "0", fontSize: "14px", lineHeight: "20px", color: "#667085" }}>
        Investing Academy
      </Text>
    </Section>
  );
}

function Footer() {
  return (
    <Section style={{ marginTop: "28px", textAlign: "center" }}>
      <Text style={{ margin: "0 0 8px", fontSize: "12px", lineHeight: "18px", color: "#98a2b3" }}>
        This is an automated security message from CASE University.
      </Text>
      <Text style={{ margin: "0", fontSize: "12px", lineHeight: "18px", color: "#98a2b3" }}>
        Educational content is provided for informational purposes and does
        not constitute personalized investment, tax, or legal advice.
      </Text>
    </Section>
  );
}
