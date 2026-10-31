import "server-only";
import { Resend } from "resend";

let client: Resend | undefined;
export const XILAIRE_FROM = "XilAire Technologies <noreply@xilairetechnologies.com>";
export function getXilAireResendClient(): Resend {
  const key = process.env.RESEND_API_KEY_XILAIRE?.trim();
  if (!key) throw new Error("Missing RESEND_API_KEY_XILAIRE");
  return (client ??= new Resend(key));
}
