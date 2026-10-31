
/**
 * ============================================================
 * XILAIRE TECHNOLOGIES
 * XILAIRE PLATFORM
 *
 * BOOKING API - INITIATE PAID BOOKING
 *
 * Route: /api/booking/initiate-paid
 *
 * STATUS: NOT IMPLEMENTED
 *
 * This endpoint is intentionally disabled until the
 * paid-booking workflow, payment provider integration,
 * authentication, and authorization are implemented
 * and verified.
 *
 * No bookings, payment sessions, or charges are created.
 * ============================================================
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Paid booking initiation is not yet available.",
      code: "NOT_IMPLEMENTED",
    },
    {
      status: 501,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
