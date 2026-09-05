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

type ResetPasswordEmailProps = {
  firstName?: string;
  resetUrl: string;
  expiresInMinutes?: number;
};

export default function ResetPasswordEmail({
  firstName,
  resetUrl,
  expiresInMinutes = 60,
}: ResetPasswordEmailProps) {
  const greeting =
    firstName
      ? `Hi ${firstName},`
      : "Hello,";

  return (
    <Html>
      <Head />

      <Preview>
        Reset your CASE University password
      </Preview>

      <Body style={body}>
        <Container style={container}>
          <Section style={brandSection}>
            <Text style={brandEyebrow}>
              CASE UNIVERSITY
            </Text>

            <Heading style={brandTitle}>
              Learn. Practice. Build confidence.
            </Heading>
          </Section>

          <Section style={contentSection}>
            <Heading
              as="h1"
              style={heading}
            >
              Reset your password
            </Heading>

            <Text style={paragraph}>
              {greeting}
            </Text>

            <Text style={paragraph}>
              We received a request to reset the password for your CASE University account.
            </Text>

            <Section style={buttonSection}>
              <Button
                href={resetUrl}
                style={button}
              >
                Reset password
              </Button>
            </Section>

            <Text style={paragraph}>
              For your security, this link expires in{" "}
              <strong>
                {expiresInMinutes} minutes
              </strong>
              .
            </Text>

            <Text style={secondaryParagraph}>
              If you did not request a password reset, you can safely ignore this email. Your password will not change unless the reset link is used.
            </Text>

            <Hr style={divider} />

            <Text style={smallText}>
              If the button does not work, copy and paste this link into your browser:
            </Text>

            <Link
              href={resetUrl}
              style={link}
            >
              {resetUrl}
            </Link>
          </Section>

          <Section style={footerSection}>
            <Text style={footerText}>
              This security email was sent by CASE University.
            </Text>

            <Text style={footerText}>
              © CASE University
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  margin: "0",
  padding: "0",
  backgroundColor: "#f6f8fc",
  fontFamily: "Arial, Helvetica, sans-serif",
  color: "#172033",
};

const container = {
  width: "100%",
  maxWidth: "620px",
  margin: "0 auto",
  padding: "36px 18px",
};

const brandSection = {
  padding: "26px 30px",
  backgroundColor: "#172033",
  borderRadius: "16px 16px 0 0",
};

const brandEyebrow = {
  margin: "0",
  color: "#93c5fd",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "1.8px",
};

const brandTitle = {
  margin: "8px 0 0",
  color: "#ffffff",
  fontSize: "20px",
  lineHeight: "28px",
  fontWeight: "700",
};

const contentSection = {
  padding: "34px 30px",
  backgroundColor: "#ffffff",
  borderLeft: "1px solid #e2e8f0",
  borderRight: "1px solid #e2e8f0",
};

const heading = {
  margin: "0 0 22px",
  color: "#172033",
  fontSize: "28px",
  lineHeight: "36px",
  fontWeight: "700",
};

const paragraph = {
  margin: "0 0 18px",
  color: "#334155",
  fontSize: "16px",
  lineHeight: "26px",
};

const secondaryParagraph = {
  ...paragraph,
  color: "#64748b",
};

const buttonSection = {
  margin: "28px 0",
};

const button = {
  display: "inline-block",
  padding: "13px 22px",
  backgroundColor: "#2563eb",
  borderRadius: "10px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "700",
  textDecoration: "none",
};

const divider = {
  margin: "30px 0 22px",
  borderColor: "#e2e8f0",
};

const smallText = {
  margin: "0 0 8px",
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "19px",
};

const link = {
  color: "#2563eb",
  fontSize: "12px",
  lineHeight: "19px",
  wordBreak: "break-all" as const,
};

const footerSection = {
  padding: "20px 30px",
  backgroundColor: "#eef2f7",
  border: "1px solid #e2e8f0",
  borderRadius: "0 0 16px 16px",
};

const footerText = {
  margin: "3px 0",
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "18px",
  textAlign: "center" as const,
};
