/**
 * XilAire Technologies
 * AUTH-04T-24U-R8L
 *
 * Single-attempt notification submission controller.
 *
 * Does not import Graph, Supabase, fetch, or environment secrets.
 * A future worker must supply an approved non-retrying transport.
 *
 * HTTP 202 is submission acceptance, NOT proof of delivery.
 * Every uncertain response requires manual reconciliation.
 */

export type NotificationSubmissionResult =
  | {
      outcome: "accepted"
      httpStatus: 202
    }
  | {
      outcome: "delivery_unknown"
      reason: "NON_202_RESPONSE" | "TRANSPORT_EXCEPTION"
      httpStatus: number | null
    }

export type NotificationTransport = () => Promise<number>

/**
 * Calls the supplied transport exactly once.
 *
 * IMPORTANT:
 * This function cannot prevent internal retries performed
 * by the supplied transport. The future Graph transport
 * must independently guarantee no automatic retry.
 */
export async function submitNotificationOnce(
  transport: NotificationTransport
): Promise<NotificationSubmissionResult> {
  if (typeof transport !== "function") {
    throw new Error("NOTIFICATION_TRANSPORT_REQUIRED")
  }

  let status: number

  try {
    status = await transport()
  } catch {
    return {
      outcome: "delivery_unknown",
      reason: "TRANSPORT_EXCEPTION",
      httpStatus: null,
    }
  }

  if (status === 202) {
    return {
      outcome: "accepted",
      httpStatus: 202,
    }
  }

  return {
    outcome: "delivery_unknown",
    reason: "NON_202_RESPONSE",
    httpStatus:
      typeof status === "number" && Number.isInteger(status)
        ? status
        : null,
  }
}