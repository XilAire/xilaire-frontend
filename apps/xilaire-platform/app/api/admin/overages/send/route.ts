import { NextResponse } from "next/server"
import { sendInvoiceNotification } from "@/lib/billing/sendInvoiceNotification"
import { getProfile } from "@/lib/getProfile"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const profile = await getProfile()

  if (!profile || !["master_admin", "finance"].includes(profile.role)) {
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
    const result = await sendInvoiceNotification(invoice_id)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error("Invoice send failed:", err)

    return NextResponse.json(
      { error: err.message ?? "SEND_FAILED" },
      { status: 500 }
    )
  }
}