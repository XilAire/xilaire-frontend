/**
 * XilAire Technologies
 * AUTH-04T-24U-R8A
 *
 * Booking Notification Worker - Disabled Foundation
 *
 * This route is intentionally inactive.
 *
 * No Supabase operations.
 * No Microsoft Graph operations.
 * No email sending.
 *
 * Future implementation must pass separate security
 * review and receive explicit activation approval.
 */

export const runtime = "nodejs"

export const dynamic = "force-dynamic"

/**
 * HARD ACTIVATION LOCK
 *
 * Do not replace this value without a separately
 * reviewed and approved change.
 */
const WORKER_ACTIVATION_APPROVED: boolean = false

/**
 * This constant describes the intended workflow.
 * It does not enable worker execution.
 */
const REQUIRED_NOTIFICATION_RPC_CONTRACT = [
  "claim_booking_notification",
  "confirm_booking_notification_submitted",
  "mark_booking_notification_unknown",
] as const

/**
 * Worker activation readiness.
 *
 * Not a security bypass: this remains false until
 * source is explicitly changed and reviewed.
 */
function isWorkerActive(): boolean {
  return WORKER_ACTIVATION_APPROVED
}

/**
 * POST /api/internal/booking-notifications
 *
 * Intentionally rejects all requests in R8A.
 *
 * Authentication, database claiming, Graph submission,
 * and state transitions will be implemented only after
 * the final worker design is approved.
 */
export async function POST(_req: Request): Promise<Response> {
  if (!isWorkerActive()) {
    return Response.json(
      {
        error: "BOOKING_NOTIFICATION_WORKER_DISABLED",
        stage: "AUTH-04T-24U-R8A",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  }

  // Defense-in-depth:
  // Even if the activation constant is changed,
  // this initial foundation does not claim or send.
  return Response.json(
    {
      error: "BOOKING_NOTIFICATION_WORKER_NOT_IMPLEMENTED",
      requiredRpcCount: REQUIRED_NOTIFICATION_RPC_CONTRACT.length,
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}

/**
 * Explicitly reject GET requests.
 *
 * No Vercel cron schedule is registered for this route.
 */
export async function GET(): Promise<Response> {
  return Response.json(
    {
      error: "METHOD_NOT_AVAILABLE",
    },
    {
      status: 405,
      headers: {
        "Cache-Control": "no-store",
        Allow: "POST",
      },
    }
  )
}