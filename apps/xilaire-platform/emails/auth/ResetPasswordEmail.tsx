import { EmailButton, EmailLinkFallback, XilAireEmailLayout } from "../components/XilAireEmailLayout";

export function ResetPasswordEmail({ resetUrl }: { resetUrl: string }) {
  return <XilAireEmailLayout eyebrow="Account security" title="Reset your password" preview="A secure link to reset your XilAire password.">
    <p style={{ fontSize: 16, lineHeight: "26px", margin: "0 0 18px" }}>We received a request to reset your XilAire account password.</p>
    <EmailButton href={resetUrl}>Reset password</EmailButton>
    <p style={{ fontSize: 15, lineHeight: "25px", color: "#475569", margin: 0 }}>This is a one-time recovery link. If you did not request a reset, you can safely ignore this message. Your password will not change unless the link is used.</p>
    <EmailLinkFallback href={resetUrl} />
  </XilAireEmailLayout>;
}
