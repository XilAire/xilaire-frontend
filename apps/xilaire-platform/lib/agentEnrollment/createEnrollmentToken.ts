"use server";

import crypto from "crypto";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type CreateEnrollmentTokenInput = {
  expiresInHours?: number; // default 24
  maxUses?: number;        // default 1
};

type CreateEnrollmentTokenResult = {
  token: string;           // RAW TOKEN (RETURNED ONCE)
  expiresAt: string;
  maxUses: number;
};

/* -------------------------------------------------
   HELPERS
------------------------------------------------- */
function generateRawToken(): string {
  const random = crypto.randomBytes(32).toString("hex");
  return `xil_${random}`;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/* -------------------------------------------------
   SERVER ACTION
------------------------------------------------- */
export async function createEnrollmentToken(
  input: CreateEnrollmentTokenInput = {}
): Promise<CreateEnrollmentTokenResult> {
  const supabase = await createServerSupabaseClient();
  const profile = await getProfile();

  /* 🔒 AUTH GUARD */
  if (!profile || !["admin", "master_admin"].includes(profile.role)) {
    throw new Error("Unauthorized");
  }

  const expiresInHours = input.expiresInHours ?? 24;
  const maxUses = input.maxUses ?? 1;

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date(
    Date.now() + expiresInHours * 60 * 60 * 1000
  ).toISOString();

  const { error } = await supabase
    .from("agent_enrollment_tokens")
    .insert({
      org_id: profile.org_id,
      created_by: profile.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      max_uses: maxUses,
    });

  if (error) {
    console.error("Failed to create enrollment token", error);
    throw new Error("Failed to create enrollment token");
  }

  /* 🚨 IMPORTANT:
     RAW TOKEN IS RETURNED ONCE
     NEVER STORED
  */
  return {
    token: rawToken,
    expiresAt,
    maxUses,
  };
}
