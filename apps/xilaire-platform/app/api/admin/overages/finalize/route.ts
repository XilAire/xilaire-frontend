import { NextResponse } from "next/server"
import { finalizeOverageInvoice } from "@/lib/billing/finalizeOverageInvoice"
import { getProfile } from "@/lib/getProfile"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const profile = await getProfile()

  if (!profile || profile.role !== "master_admin") {
    return NextResponse.json(
      { error: "FORBIDDEN" },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { invoice_id } = body

  if (!invoice_id) {
    return NextResponse.json(
      { error: "MISSING_INVOICE_ID" },
      { status: 400 }
    )
  }

  try {
    const result = await finalizeOverageInvoice({
      invoice_id,
      approved_by: profile.email,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("Finalize overage invoice failed:", err)

    return NextResponse.json(
      { error: err.message ?? "FINALIZE_FAILED" },
      { status: 500 }
    )
  }
}