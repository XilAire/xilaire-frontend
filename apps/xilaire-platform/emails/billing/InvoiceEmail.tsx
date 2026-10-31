import { EmailButton, EmailLinkFallback, XilAireEmailLayout } from "../components/XilAireEmailLayout";

type Props = { invoiceNumber: string; customerName?: string; amountDue: string; dueDate?: string; invoiceUrl: string };
export function InvoiceEmail({ invoiceNumber, customerName, amountDue, dueDate, invoiceUrl }: Props) {
  return <XilAireEmailLayout eyebrow="Billing" title="Your XilAire invoice" preview={`Invoice ${invoiceNumber} from XilAire Technologies.`}>
    <p style={{ fontSize: 16, lineHeight: "26px" }}>Hello {customerName?.trim() || "there"},</p>
    <p style={{ fontSize: 16, lineHeight: "26px" }}>Your invoice is available to review securely in XilAire.</p>
    <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ backgroundColor: "#f8fafc", borderCollapse: "collapse", marginTop: 16 }}><tbody>
      <tr><td style={{ padding: "12px 16px", fontSize: 14, color: "#64748b" }}>Invoice</td><td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>{invoiceNumber}</td></tr>
      <tr><td style={{ padding: "12px 16px", fontSize: 14, color: "#64748b" }}>Amount due</td><td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>{amountDue}</td></tr>
      {dueDate ? <tr><td style={{ padding: "12px 16px", fontSize: 14, color: "#64748b" }}>Due date</td><td style={{ padding: "12px 16px", textAlign: "right" }}>{dueDate}</td></tr> : null}
    </tbody></table>
    <EmailButton href={invoiceUrl}>View invoice securely</EmailButton>
    <p style={{ fontSize: 14, lineHeight: "24px", color: "#64748b" }}>For your security, payment details are not included in this email. Verify the website address before entering payment information.</p>
    <EmailLinkFallback href={invoiceUrl}/>
  </XilAireEmailLayout>;
}
