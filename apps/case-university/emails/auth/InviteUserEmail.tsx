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

type InviteUserEmailProps = {
  recipientName?: string;
  inviterName?: string;
  courseName?: string;
  inviteUrl: string;
  expiresInHours?: number;
};

export default function InviteUserEmail({
  recipientName,
  inviterName,
  courseName,
  inviteUrl,
  expiresInHours = 72,
}: InviteUserEmailProps) {
  const greeting = recipientName?.trim()
    ? `Hi ${recipientName.trim()},`
    : "Hello,";

  const expirationLabel =
    expiresInHours === 1
      ? "1 hour"
      : `${expiresInHours} hours`;

  const intro =
    courseName?.trim()
      ? inviterName?.trim()
        ? `${inviterName.trim()} invited you to ${courseName.trim()} in CASE University.`
        : `You've been invited to ${courseName.trim()} in CASE University.`
      : inviterName?.trim()
        ? `${inviterName.trim()} invited you to CASE University.`
        : "You've been invited to CASE University.";

  return (
    <Html>
      <Head />
      <Preview>You&apos;re invited to CASE University</Preview>

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
              You&apos;re invited
            </Heading>

            <Text style={{ margin: "0 0 24px", fontSize: "16px", lineHeight: "26px", color: "#475467" }}>
              {intro}
            </Text>

            {courseName?.trim() ? (
              <Section style={{ margin: "0 0 24px", borderRadius: "12px", backgroundColor: "#eff6ff", padding: "16px" }}>
                <Text style={{ margin: "0 0 4px", fontSize: "12px", lineHeight: "18px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "#2563eb" }}>
                  Course
                </Text>
                <Text style={{ margin: "0", fontSize: "16px", lineHeight: "24px", fontWeight: "700", color: "#172033" }}>
                  {courseName.trim()}
                </Text>
              </Section>
            ) : null}

            <Section style={{ margin: "28px 0", textAlign: "center" }}>
              <Button
                href={inviteUrl}
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
                Accept invitation
              </Button>
            </Section>

            <Text style={{ margin: "0 0 24px", fontSize: "14px", lineHeight: "22px", color: "#667085" }}>
              This invitation link expires in {expirationLabel}.
            </Text>

            <Hr style={{ margin: "26px 0", borderColor: "#e4e7ec" }} />

            <Text style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: "20px", color: "#667085" }}>
              If the button does not work, copy and paste this link into your browser:
            </Text>

            <Link href={inviteUrl} style={{ display: "block", overflowWrap: "anywhere", fontSize: "13px", lineHeight: "20px", color: "#2563eb", textDecoration: "underline" }}>
              {inviteUrl}
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
      <Text style={{ margin: "0", fontSize: "12px", lineHeight: "18px", color: "#98a2b3" }}>
        Educational content is provided for informational purposes and does
        not constitute personalized investment, tax, or legal advice.
      </Text>
    </Section>
  );
}
