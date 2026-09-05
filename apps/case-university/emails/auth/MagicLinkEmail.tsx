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

type MagicLinkEmailProps = {
  firstName?: string;
  magicLinkUrl: string;
  expiresInMinutes?: number;
};

export default function MagicLinkEmail({
  firstName,
  magicLinkUrl,
  expiresInMinutes = 60,
}: MagicLinkEmailProps) {
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
      <Preview>Your secure CASE University sign-in link</Preview>

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
        <Container
          style={{
            width: "100%",
            maxWidth: "600px",
            margin: "0 auto",
            padding: "40px 20px",
          }}
        >
          <BrandHeader />

          <Section
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e4e7ec",
              borderRadius: "18px",
              padding: "32px",
            }}
          >
            <Text style={{ margin: "0 0 18px", fontSize: "16px", lineHeight: "24px", color: "#344054" }}>
              {greeting}
            </Text>

            <Heading
              as="h1"
              style={{
                margin: "0 0 18px",
                fontSize: "30px",
                lineHeight: "38px",
                fontWeight: "700",
                letterSpacing: "-0.02em",
                color: "#172033",
              }}
            >
              Sign in securely
            </Heading>

            <Text style={{ margin: "0 0 24px", fontSize: "16px", lineHeight: "26px", color: "#475467" }}>
              Use the secure sign-in link below to access your CASE account
              and continue your learning in CASE University.
            </Text>

            <Section style={{ margin: "28px 0", textAlign: "center" }}>
              <Button
                href={magicLinkUrl}
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
                Sign in to CASE University
              </Button>
            </Section>

            <Text style={{ margin: "0 0 14px", fontSize: "14px", lineHeight: "22px", color: "#667085" }}>
              This sign-in link expires in {expirationLabel}.
            </Text>

            <Text style={{ margin: "0 0 24px", fontSize: "14px", lineHeight: "22px", color: "#667085" }}>
              If you did not request this sign-in link, you can safely ignore this email.
            </Text>

            <Hr style={{ margin: "26px 0", borderColor: "#e4e7ec" }} />

            <Text style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: "20px", color: "#667085" }}>
              If the button does not work, copy and paste this link into your browser:
            </Text>

            <Link
              href={magicLinkUrl}
              style={{
                display: "block",
                overflowWrap: "anywhere",
                fontSize: "13px",
                lineHeight: "20px",
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              {magicLinkUrl}
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
