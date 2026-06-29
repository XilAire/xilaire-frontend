import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export const runtime = "nodejs"

/* =================================================
SUPABASE CLIENT
================================================= */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!,
  { auth: { persistSession: false } }
)

/* =================================================
TOKEN RESOLUTION
================================================= */

function resolveToken(req: Request) {
  const authHeader = req.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim()
  }

  const cookieStore = cookies()

  return (
    cookieStore.get("sb-access-token")?.value ||
    cookieStore.get("sb-access-token.0")?.value ||
    cookieStore.get("sb-access-token.1")?.value ||
    null
  )
}

/* =================================================
DECODE JWT
================================================= */

function decodeJWT(token: string) {
  const parts = token.split(".")

  if (parts.length < 2) {
    throw new Error("Invalid token structure")
  }

  const base64 = parts[1]
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  return JSON.parse(
    Buffer.from(base64, "base64").toString()
  )
}

/* =================================================
HELPERS
================================================= */

function getOrgIdFromPayload(payload: any) {
  return (
    payload?.org_id ||
    payload?.app_metadata?.org_id ||
    payload?.user_metadata?.org_id ||
    null
  )
}

/* =================================================
GET VENDOR LIST
================================================= */

export async function GET(req: Request) {
  try {
    const token = resolveToken(req)

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - no token found" },
        { status: 401 }
      )
    }

    let payload: any

    try {
      payload = decodeJWT(token)
    } catch (err) {
      console.error("LIST_VENDORS_TOKEN_DECODE_ERROR:", err)

      return NextResponse.json(
        { error: "Unauthorized - invalid token format" },
        { status: 401 }
      )
    }

    const org_id = getOrgIdFromPayload(payload)

    if (!org_id) {
      return NextResponse.json(
        { error: "Unauthorized - missing org_id in token payload" },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from("infrastructure_vendors")
      .select(`
        id,
        org_id,
        company_name,
        license_type,
        vendor_category,
        is_active
      `)
      .eq("org_id", org_id)
      .order("company_name", { ascending: true })

    if (error) {
      console.error("LIST_VENDORS_QUERY_ERROR:", error)

      return NextResponse.json(
        {
          error: "Failed to load vendors",
          details: error.message,
        },
        { status: 500 }
      )
    }

    const vendorMap = new Map<
      string,
      {
        id: string
        org_id: string
        company_name: string
        license_type: string | null
        vendor_category: string | null
        is_active: boolean
      }
    >()

    for (const row of data || []) {
      const id = String(row?.id || "").trim()

      if (!id) continue

      vendorMap.set(id, {
        id,
        org_id: String(row?.org_id || "").trim(),
        company_name: String(
          row?.company_name || "Unnamed Vendor"
        ).trim(),
        license_type: row?.license_type || null,
        vendor_category: row?.vendor_category || null,
        is_active: row?.is_active ?? true,
      })
    }

    const vendors = Array.from(vendorMap.values()).sort((a, b) =>
      a.company_name.localeCompare(b.company_name)
    )

    return NextResponse.json({
      success: true,
      org_id,
      count: vendors.length,
      vendors,
    })
  } catch (err: any) {
    console.error("LIST_VENDORS_ERROR:", err)

    return NextResponse.json(
      {
        error: "Failed to load vendors",
        details: err?.message || "Unknown server error",
      },
      { status: 500 }
    )
  }
}