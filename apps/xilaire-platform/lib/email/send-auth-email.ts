import "server-only";
import { createElement } from "react";
import { ResetPasswordEmail } from "@/emails/auth/ResetPasswordEmail";
import { sendXilAireEmail } from "./send-email";

export async function sendResetPasswordEmail(input: { to: string; resetUrl: string }) {
  return sendXilAireEmail({
    to: input.to,
    subject: "Reset your XilAire password",
    react: createElement(ResetPasswordEmail, { resetUrl: input.resetUrl }),
    text: `Reset your XilAire password: ${input.resetUrl}\n\nIf you didn't request this, ignore this email.`,
  });
}
