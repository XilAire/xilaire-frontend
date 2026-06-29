import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { randomUUID } from "crypto"

export const runtime = "nodejs"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM")
if (!SUPABASE_ANON_KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM")
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY_PLATFORM")

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

type ProfileRow = {
  id: string
  org_id: string
  role: string | null
  vendor_id: string | null
}

type VendorRow = {
  id: string
  org_id: string
}

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

async function getAuthedProfile(req: Request): Promise<ProfileRow> {
  const token = resolveToken(req)

  if (!token) {
    throw new Error("Unauthorized")
  }

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token)

  if (userError || !user) {
    throw new Error("Unauthorized")
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, org_id, role, vendor_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    throw new Error("Profile not found")
  }

  if (!profile.org_id) {
    throw new Error("Profile is missing org_id")
  }

  return profile as ProfileRow
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
}

function safeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : ""
}

export async function POST(req: Request) {
  try {
    const profile = await getAuthedProfile(req)

    const formData = await req.formData()

    const file = formData.get("file")
    const documentType = safeText(formData.get("document_type")).toLowerCase()
    const requestedVendorId = safeText(formData.get("vendor_id"))
    const expirationDate = safeText(formData.get("expiration_date"))
    const notes = safeText(formData.get("notes"))

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A file is required." }, { status: 400 })
    }

    if (!documentType) {
      return NextResponse.json({ error: "document_type is required." }, { status: 400 })
    }

    const allowedRoles = new Set(["vendor", "master_admin"])
    if (!allowedRoles.has(profile.role || "")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 })
    }

    let effectiveVendorId = requestedVendorId

    if (profile.role === "vendor") {
      if (!profile.vendor_id) {
        return NextResponse.json(
          { error: "Vendor profile is not linked to a vendor company." },
          { status: 403 }
        )
      }

      effectiveVendorId = profile.vendor_id
    }

    if (!effectiveVendorId) {
      return NextResponse.json({ error: "vendor_id is required." }, { status: 400 })
    }

    const { data: vendor, error: vendorError } = await admin
      .from("infrastructure_vendors")
      .select("id, org_id")
      .eq("id", effectiveVendorId)
      .eq("org_id", profile.org_id)
      .single()

    if (vendorError || !vendor) {
      return NextResponse.json(
        { error: "Vendor not found in the active organization." },
        { status: 404 }
      )
    }

    const originalName = file.name || "document"
    const cleanedName = sanitizeFileName(originalName)
    const extension = cleanedName.includes(".")
      ? cleanedName.split(".").pop()
      : ""
    const storedName = `${randomUUID()}${extension ? `.${extension}` : ""}`

    const storagePath = [
      profile.org_id,
      (vendor as VendorRow).id,
      documentType,
      storedName,
    ].join("/")

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await admin.storage
      .from("vendor-documents")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const payload = {
      org_id: profile.org_id,
      vendor_id: (vendor as VendorRow).id,
      document_type: documentType,
      file_name: originalName,
      file_url: storagePath,
      storage_path: storagePath,
      status: "pending",
      expiration_date: expirationDate || null,
      notes: notes || null,
    }

    const { data: inserted, error: insertError } = await admin
      .from("infrastructure_vendor_documents")
      .insert(payload)
      .select("*")
      .single()

    if (insertError) {
      await admin.storage.from("vendor-documents").remove([storagePath])

      return NextResponse.json(
        { error: `Database insert failed: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Vendor document uploaded successfully.",
        document: inserted,
      },
      { status: 200 }
    )
  } catch (error: any) {
    const message =
      typeof error?.message === "string" ? error.message : "Unexpected error."

    const status = message === "Unauthorized" ? 401 : 500

    return NextResponse.json({ error: message }, { status })
  }
}