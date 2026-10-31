import "server-only";
import type { ReactElement } from "react";
import { getXilAireResendClient, XILAIRE_FROM } from "./resend";

export type EmailDeliveryResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function sendXilAireEmail(input: {
  to: string;
  subject: string;
  html?: string;
  react?: ReactElement;
  text: string;
}): Promise<EmailDeliveryResult> {
  try {
    const { data, error } = await getXilAireResendClient().emails.send({
      from: XILAIRE_FROM,
      to: [input.to],
      subject: input.subject,
      ...(input.react ? { react: input.react } : { html: input.html ?? "" }),
      text: input.text,
    });
    if (error || !data?.id) {
      return { success: false, error: error?.message ?? "Email provider returned no message ID" };
    }
    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Email delivery error" };
  }
}
