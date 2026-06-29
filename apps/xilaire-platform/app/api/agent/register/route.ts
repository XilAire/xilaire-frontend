import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

/* -------------------------------------------------
   🔒 SERVICE ROLE CLIENT (NO SESSION, NO RLS)
------------------------------------------------- */
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM
) {
  throw new Error("Missing Supabase env vars for agent registration");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM,
  {
    auth: { persistSession: false },
  }
);

/* -------------------------------------------------
   🔐 HELPERS
------------------------------------------------- */
function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/* -------------------------------------------------
   POST /api/agent/register
------------------------------------------------- */
export async function POST(req: Request) {
  try {
    /* -------------------------------------------------
       📥 INPUT
    ------------------------------------------------- */
    const body = await req.json();
    const {
      enrollment_token,
      device,
    } = body ?? {};

    if (
      !enrollment_token ||
      !device?.fingerprint ||
      !device?.hostname ||
      !device?.os ||
      !device?.os_version
    ) {
      return NextResponse.json(
        { error: "Invalid registration payload" },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(enrollment_token);

    /* -------------------------------------------------
       🔎 LOOKUP ENROLLMENT TOKEN
    ------------------------------------------------- */
    const { data: tokenRow, error: tokenError } = await supabase
      .from("agent_enrollment_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return NextResponse.json(
        { error: "Invalid enrollment token" },
        { status: 401 }
      );
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Enrollment token expired" },
        { status: 410 }
      );
    }

    if (tokenRow.uses >= tokenRow.max_uses) {
      return NextResponse.json(
        { error: "Enrollment token already used" },
        { status: 409 }
      );
    }

    /* -------------------------------------------------
       🔎 ENSURE ENDPOINT UNIQUENESS
    ------------------------------------------------- */
    const { data: existing } = await supabase
      .from("endpoints")
      .select("id")
      .eq("org_id", tokenRow.org_id)
      .eq("fingerprint", device.fingerprint)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Endpoint already registered" },
        { status: 409 }
      );
    }

    /* -------------------------------------------------
       🧱 CREATE ENDPOINT
    ------------------------------------------------- */
    const now = new Date().toISOString();

    const { data: endpoint, error: endpointError } = await supabase
      .from("endpoints")
      .insert({
        org_id: tokenRow.org_id,
        hostname: device.hostname,
        os: device.os,
        os_version: device.os_version,
        fingerprint: device.fingerprint,
        agent_status: "online",
        registered_at: now,
        last_seen_at: now,
      })
      .select()
      .single();

    if (endpointError) {
      console.error("Endpoint insert failed", endpointError);
      return NextResponse.json(
        { error: "Failed to create endpoint" },
        { status: 500 }
      );
    }

    /* -------------------------------------------------
       🔥 INCREMENT TOKEN USAGE
    ------------------------------------------------- */
    await supabase
      .from("agent_enrollment_tokens")
      .update({
        uses: tokenRow.uses + 1,
      })
      .eq("id", tokenRow.id);

    /* -------------------------------------------------
       🧾 AUDIT LOG
    ------------------------------------------------- */
    await supabase.from("platform_audit_logs").insert({
      org_id: tokenRow.org_id,
      actor_type: "agent",
      action: "endpoint_registered",
      target_id: endpoint.id,
      metadata: {
        hostname: device.hostname,
        fingerprint: device.fingerprint,
      },
    });

    /* -------------------------------------------------
       ✅ RESPONSE (BOOTSTRAP CONFIG)
    ------------------------------------------------- */
    return NextResponse.json({
      status: "registered",
      endpoint_id: endpoint.id,
      heartbeat_interval_seconds: 60,
      api_base_url:
        process.env.NEXT_PUBLIC_PLATFORM_BASE_URL ??
        process.env.NEXT_PUBLIC_SITE_URL,
    });
  } catch (err) {
    console.error("Agent register fatal error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
