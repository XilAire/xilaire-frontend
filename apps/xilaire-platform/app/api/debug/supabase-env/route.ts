import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function decodeJwtPayload(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);

    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function mask(value: string | undefined | null, start = 10, end = 8) {
  if (!value) return null;
  if (value.length <= start + end) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function getProjectRefFromUrl(url: string | undefined | null) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const match = parsed.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function getProjectRefFromIss(iss: string | null) {
  if (!iss) return null;

  try {
    const parsed = new URL(iss);
    const match = parsed.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function inspectToken(token: string | undefined | null) {
  if (!token) {
    return {
      present: false,
      masked: null,
      role: null,
      iss: null,
      aud: null,
      sub: null,
      exp: null,
      projectRefFromIss: null,
    };
  }

  const payload = decodeJwtPayload(token);
  const iss = typeof payload?.iss === "string" ? payload.iss : null;

  return {
    present: true,
    masked: mask(token),
    role: typeof payload?.role === "string" ? payload.role : null,
    iss,
    aud:
      typeof payload?.aud === "string"
        ? payload.aud
        : Array.isArray(payload?.aud)
        ? payload.aud
        : null,
    sub: typeof payload?.sub === "string" ? payload.sub : null,
    exp: typeof payload?.exp === "number" ? payload.exp : null,
    projectRefFromIss: getProjectRefFromIss(iss),
  };
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM;
    const defaultVendorOrgId = process.env.DEFAULT_VENDOR_ORG_ID_PLATFORM;

    const urlProjectRef = getProjectRefFromUrl(supabaseUrl);
    const anon = inspectToken(anonKey);
    const service = inspectToken(serviceRoleKey);

    const refs = [
      urlProjectRef,
      anon.projectRefFromIss,
      service.projectRefFromIss,
    ].filter(Boolean);

    const uniqueRefs = [...new Set(refs)];

    return NextResponse.json(
      {
        ok: true,
        environment: process.env.NODE_ENV ?? null,
        supabase: {
          url: {
            present: Boolean(supabaseUrl),
            value: supabaseUrl ?? null,
            projectRefFromUrl: urlProjectRef,
          },
          anonKey: anon,
          serviceRoleKey: service,
          defaultVendorOrgId: defaultVendorOrgId ?? null,
          matchCheck: {
            refs,
            uniqueRefs,
            allSameProject: uniqueRefs.length === 1 && uniqueRefs.length > 0,
          },
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while auditing Supabase env",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}