
/**
 * ============================================================
 * XILAIRE TECHNOLOGIES
 * XILAIRE PLATFORM
 *
 * CORE REPORTING API
 *
 * GET /api/reporting/core
 *
 * Server-side only.
 * Uses the authenticated Supabase session.
 * Does not use service-role credentials.
 * ============================================================
 */

import { NextResponse } from "next/server";
import { getProfile } from "@/lib/getProfile";
import { getCoreReportingSnapshot } from "@/lib/reporting/getCoreReportingSnapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // --------------------------------------------------------
    // AUTHENTICATION
    // --------------------------------------------------------

    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // --------------------------------------------------------
    // ORGANIZATION CONTEXT
    // --------------------------------------------------------

    if (!profile.org_id) {
      return NextResponse.json(
        {
          error: "No organization is associated with this account.",
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // --------------------------------------------------------
    // CORE REPORTING SNAPSHOT
    // --------------------------------------------------------

    const snapshot = await getCoreReportingSnapshot();

    return NextResponse.json(snapshot, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Core reporting API failed:", error);

    return NextResponse.json(
      {
        error: "Unable to load reporting data.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
