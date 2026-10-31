import { EmailButton, EmailLinkFallback, XilAireEmailLayout } from "../components/XilAireEmailLayout";

export function InviteUserEmail({ inviteUrl, inviterName, organizationName, expiresInHours }: { inviteUrl: string; inviterName?: string; organizationName?: string; expiresInHours?: number }) {
  return <XilAireEmailLayout eyebrow="Workspace invitation" title="You're invited to XilAire" preview="You have been invited to join a XilAire workspace.">
    <p style={{ fontSize: 16, lineHeight: "26px" }}>{inviterName?.trim() || "An administrator"} invited you to join {organizationName?.trim() || "a workspace"} on XilAire Technologies.</p>
    <EmailButton href={inviteUrl}>Accept invitation</EmailButton>
    {expiresInHours ? <p style={{ fontSize: 14, lineHeight: "24px", color: "#475569" }}>This invitation expires in {expiresInHours} hours.</p> : null}
    <p style={{ fontSize: 14, lineHeight: "24px", color: "#64748b" }}>If you were not expecting this invitation, you can ignore this email.</p>
    <EmailLinkFallback href={inviteUrl}/>
  </XilAireEmailLayout>;
}
