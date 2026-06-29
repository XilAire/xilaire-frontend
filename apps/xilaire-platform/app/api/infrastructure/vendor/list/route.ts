import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

/* =================================================
ENV
================================================= */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM")
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY_PLATFORM")
}

/* =================================================
SUPABASE CLIENT
================================================= */

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

/* =================================================
NO-STORE HEADERS
================================================= */

const NO_STORE_HEADERS: HeadersInit = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Surrogate-Control": "no-store",
}

/* =================================================
TOKEN RESOLUTION
================================================= */

async function resolveToken(req: Request) {
  const authHeader = req.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim()
  }

  const cookieStore = await cookies()

  return (
    cookieStore.get("sb-access-token")?.value ||
    cookieStore.get("sb-access-token.0")?.value ||
    cookieStore.get("sb-access-token.1")?.value ||
    null
  )
}

/* =================================================
JWT HELPERS
================================================= */

function decodeJWT(token: string) {
  const parts = token.split(".")

  if (parts.length < 2) {
    throw new Error("Invalid token structure")
  }

  const base64 = parts[1]
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  return JSON.parse(Buffer.from(base64, "base64").toString())
}

function getUserIdFromPayload(payload: any) {
  return String(payload?.sub || "").trim() || null
}

function getOrgIdFromPayload(payload: any) {
  return (
    payload?.org_id ||
    payload?.app_metadata?.org_id ||
    payload?.user_metadata?.org_id ||
    null
  )
}

/* =================================================
NORMALIZERS
================================================= */

function normalizeText(value: unknown) {
  return String(value || "").trim()
}

function normalizeNullableText(value: unknown) {
  const text = String(value || "").trim()
  return text.length ? text : null
}

function normalizeBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value
  if (value === null || value === undefined) return fallback
  return Boolean(value)
}

/* =================================================
ORG CONTEXT
================================================= */

async function resolveEffectiveOrgId(payload: any) {
  const userId = getUserIdFromPayload(payload)
  const jwtOrgId = getOrgIdFromPayload(payload)

  let profileOrgId: string | null = null
  let profileRole: string | null = null
  let profileAccountType: string | null = null

  if (userId) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, org_id, role, account_type")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      throw new Error(`Unable to resolve profile org context: ${profileError.message}`)
    }

    profileOrgId = profile?.org_id ? String(profile.org_id).trim() : null
    profileRole = profile?.role ? String(profile.role).trim() : null
    profileAccountType = profile?.account_type
      ? String(profile.account_type).trim()
      : null
  }

  const effectiveOrgId = profileOrgId || jwtOrgId || null

  return {
    effectiveOrgId,
    jwtOrgId: jwtOrgId ? String(jwtOrgId).trim() : null,
    profileOrgId,
    profileRole,
    profileAccountType,
    userId,
  }
}

/* =================================================
GET VENDOR LIST
================================================= */

export async function GET(req: Request) {
  try {
    const token = await resolveToken(req)

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - no token found" },
        { status: 401, headers: NO_STORE_HEADERS }
      )
    }

    let payload: any

    try {
      payload = decodeJWT(token)
    } catch (err) {
      console.error("LIST_VENDORS_TOKEN_DECODE_ERROR:", err)

      return NextResponse.json(
        { error: "Unauthorized - invalid token format" },
        { status: 401, headers: NO_STORE_HEADERS }
      )
    }

    const orgContext = await resolveEffectiveOrgId(payload)

    if (!orgContext.effectiveOrgId) {
      return NextResponse.json(
        { error: "Unauthorized - missing org context" },
        { status: 401, headers: NO_STORE_HEADERS }
      )
    }

    const { data, error } = await supabase
      .from("infrastructure_vendors")
      .select(`
        id,
        org_id,
        company_name,
        contact_name,
        email,
        license_number,
        license_type,
        vendor_category,
        active,
        is_active,
        created_at
      `)
      .eq("org_id", orgContext.effectiveOrgId)
      .order("company_name", { ascending: true, nullsFirst: false })

    if (error) {
      console.error("LIST_VENDORS_QUERY_ERROR:", error)

      return NextResponse.json(
        {
          error: "Failed to load vendors",
          details: error.message,
        },
        { status: 500, headers: NO_STORE_HEADERS }
      )
    }

    const vendorMap = new Map<
      string,
      {
        id: string
        org_id: string
        company_name: string
        contact_name: string | null
        email: string | null
        license_number: string | null
        license_type: string | null
        vendor_category: string | null
        is_active: boolean
        created_at: string | null
      }
    >()

    for (const row of data || []) {
      const id = normalizeText(row?.id)

      if (!id) continue

      const companyName = normalizeNullableText(row?.company_name)
      const contactName = normalizeNullableText(row?.contact_name)
      const email = normalizeNullableText(row?.email)

      const displayName =
        companyName ||
        contactName ||
        email ||
        "Unnamed Vendor"

      const activeValue =
        typeof row?.is_active === "boolean"
          ? row.is_active
          : typeof row?.active === "boolean"
          ? row.active
          : true

      vendorMap.set(id, {
        id,
        org_id: normalizeText(row?.org_id),
        company_name: displayName,
        contact_name: contactName,
        email,
        license_number: normalizeNullableText(row?.license_number),
        license_type: normalizeNullableText(row?.license_type),
        vendor_category: normalizeNullableText(row?.vendor_category),
        is_active: normalizeBoolean(activeValue, true),
        created_at: row?.created_at ? String(row.created_at) : null,
      })
    }

    const vendors = Array.from(vendorMap.values()).sort((a, b) =>
      a.company_name.localeCompare(b.company_name)
    )

    return NextResponse.json(
      {
        success: true,
        org_id: orgContext.effectiveOrgId,
        context: {
          user_id: orgContext.userId,
          jwt_org_id: orgContext.jwtOrgId,
          profile_org_id: orgContext.profileOrgId,
          profile_role: orgContext.profileRole,
          profile_account_type: orgContext.profileAccountType,
        },
        count: vendors.length,
        vendors,
      },
      { headers: NO_STORE_HEADERS }
    )
  } catch (err: any) {
    console.error("LIST_VENDORS_ERROR:", err)

    return NextResponse.json(
      {
        error: "Failed to load vendors",
        details: err?.message || "Unknown server error",
      },
      { status: 500, headers: NO_STORE_HEADERS }
    )
  }
}