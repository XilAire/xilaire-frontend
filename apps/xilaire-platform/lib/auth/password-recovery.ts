import "server-only";
import { createClient } from "@supabase/supabase-js";
import { sendResetPasswordEmail } from "@/lib/email/send-auth-email";

export const RESET_GENERIC_MESSAGE =
  "If an account exists for that email address, a password reset link will be sent.";

function getProductionAppUrl(): URL {
  // Recovery email URLs always target the public production application,
  // including requests initiated from the local development server.
  const raw =
    process.env.XILAIRE_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_XILAIRE_APP_URL?.trim();

  if (!raw) {
    throw new Error(
      "Missing XILAIRE_APP_URL or NEXT_PUBLIC_XILAIRE_APP_URL."
    );
  }

  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "XilAire recovery URL must be an HTTPS origin without a path, credentials, or query."
    );
  }

  return url;
}

export async function requestPasswordReset(emailInput: unknown) {
  if (typeof emailInput !== "string") {
    return { ok: false, status: 400, message: "Enter a valid email address." };
  }

  const email = emailInput.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, message: "Enter a valid email address." };
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM;
    const appUrl = getProductionAppUrl();

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing XilAire Supabase recovery configuration.");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // The public recovery link goes directly to the production confirmation
    // route, where the one-time token is verified and a cookie session is set.
    const confirmUrl = new URL("/auth/recovery/confirm", appUrl);
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: confirmUrl.toString() },
    });

    if (error) {
      console.error("[XilAire recovery] Link generation error", {
        status: error.status,
        message: error.message,
      });
      return { ok: true, status: 200, message: RESET_GENERIC_MESSAGE };
    }

    const tokenHash = data.properties?.hashed_token;
    if (!tokenHash) {
      console.error("[XilAire recovery] Missing recovery token hash");
      return { ok: true, status: 200, message: RESET_GENERIC_MESSAGE };
    }

    const recoveryLink = new URL(confirmUrl);
    recoveryLink.searchParams.set("token_hash", tokenHash);

    const delivery = await sendResetPasswordEmail({
      to: email,
      resetUrl: recoveryLink.toString(),
    });

    if ("error" in delivery) {
      console.error("[XilAire recovery] Email delivery error", {
        error: delivery.error,
      });
    } else {
      console.info("[XilAire recovery] Email accepted", { id: delivery.id });
    }

    return { ok: true, status: 200, message: RESET_GENERIC_MESSAGE };
  } catch (error) {
    console.error("[XilAire recovery] Unexpected server error", error);
    return { ok: true, status: 200, message: RESET_GENERIC_MESSAGE };
  }
}
