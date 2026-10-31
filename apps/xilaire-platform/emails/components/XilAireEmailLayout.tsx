import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  preview: string;
  children: ReactNode;
};

export const EMAIL_BRAND = {
  navy: "#14233b",
  accent: "#1268c4",
  text: "#26354f",
  muted: "#64748b",
};

/** Table layout and inline styles for Outlook/Gmail-compatible transactional email. */
export function XilAireEmailLayout({ eyebrow, title, preview, children }: Props) {
  return (
    <html lang="en">
      <head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
      <body style={{ margin: 0, backgroundColor: "#edf2f7", padding: "26px 12px", fontFamily: "Arial, Helvetica, sans-serif", color: EMAIL_BRAND.text }}>
        <div style={{ display: "none", maxHeight: 0, maxWidth: 0, overflow: "hidden", opacity: 0, color: "transparent" }}>{preview}</div>
        <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ borderCollapse: "collapse" }}>
          <tbody><tr><td align="center">
            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ maxWidth: 640, borderCollapse: "separate", borderSpacing: 0, backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden" }}>
              <tbody>
                <tr><td style={{ backgroundColor: EMAIL_BRAND.navy, padding: "28px 34px" }}>
                  <table role="presentation" cellPadding={0} cellSpacing={0}>
                    <tbody><tr>
                      <td style={{ verticalAlign: "middle", paddingRight: 14 }}>
                        <img src="https://xilairetechnologies.com/icon-light.png" alt="XilAire" width="48" height="48" style={{ display: "block", border: 0 }} />
                      </td>
                      <td style={{ verticalAlign: "middle" }}>
                        <div style={{ color: "#93c5fd", fontSize: 12, fontWeight: 700, letterSpacing: 1.4 }}>XILAIRE TECHNOLOGIES</div>
                        <div style={{ color: "#ffffff", fontSize: 16, fontWeight: 700, lineHeight: "25px", paddingTop: 5 }}>Secure IT. Built for growth.</div>
                      </td>
                    </tr></tbody>
                  </table>
                </td></tr>
                <tr><td style={{ padding: "36px 34px 32px" }}>
                  <div style={{ color: EMAIL_BRAND.accent, fontSize: 12, fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 12 }}>{eyebrow}</div>
                  <h1 style={{ color: EMAIL_BRAND.navy, fontSize: 26, lineHeight: "34px", margin: "0 0 24px" }}>{title}</h1>
                  {children}
                </td></tr>
                <tr><td style={{ backgroundColor: "#f8fafc", padding: "22px 34px", borderTop: "1px solid #e2e8f0" }}>
                  <div style={{ color: EMAIL_BRAND.navy, fontSize: 12, fontWeight: 700 }}>XilAire Technologies</div>
                  <div style={{ color: EMAIL_BRAND.muted, fontSize: 12, lineHeight: "20px", paddingTop: 6 }}>Automated account notification. Please do not reply to this message.</div>
                  <div style={{ color: EMAIL_BRAND.muted, fontSize: 12, paddingTop: 4 }}>© {new Date().getFullYear()} XilAire Technologies</div>
                </td></tr>
              </tbody>
            </table>
          </td></tr></tbody>
        </table>
      </body>
    </html>
  );
}

export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: "26px 0" }}><tbody><tr><td style={{ backgroundColor: EMAIL_BRAND.accent, borderRadius: 8 }}><a href={href} style={{ display: "inline-block", padding: "15px 24px", color: "#ffffff", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>{children}</a></td></tr></tbody></table>;
}

export function EmailLinkFallback({ href }: { href: string }) {
  return <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 19, marginTop: 26 }}><p style={{ color: EMAIL_BRAND.muted, fontSize: 12, lineHeight: "19px", margin: "0 0 8px" }}>If the button does not work, copy this link into your browser:</p><a href={href} style={{ fontSize: 12, color: EMAIL_BRAND.accent, wordBreak: "break-all", overflowWrap: "anywhere" }}>{href}</a></div>;
}
