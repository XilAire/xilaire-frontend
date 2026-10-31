import { EmailButton, EmailLinkFallback, XilAireEmailLayout } from "../components/XilAireEmailLayout";

export function WelcomeEmail({ firstName, dashboardUrl }: { firstName?: string; dashboardUrl: string }) {
  return <XilAireEmailLayout eyebrow="Welcome" title="Welcome to XilAire" preview="Your XilAire account is ready.">
    <p style={{ fontSize: 16, lineHeight: "26px" }}>Hi {firstName?.trim() || "there"},</p>
    <p style={{ fontSize: 16, lineHeight: "26px" }}>Welcome to XilAire Technologies. Your account is ready to access your workspace and services.</p>
    <EmailButton href={dashboardUrl}>Go to XilAire</EmailButton>
    <p style={{ fontSize: 14, lineHeight: "24px", color: "#64748b" }}>For your security, never share your password or account recovery codes.</p>
    <EmailLinkFallback href={dashboardUrl}/>
  </XilAireEmailLayout>;
}
