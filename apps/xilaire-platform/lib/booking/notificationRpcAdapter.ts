/**
 * XilAire Technologies - AUTH-04T-24U-R8T
 *
 * Typed adapter for three PREVIEW-audited notification RPCs.
 * No Supabase import or network activity.
 *
 * An injected executor must be scoped to the explicitly
 * approved environment by the future worker.
 *
 * IMPORTANT:
 * Claim is a database WRITE when used with a real executor.
 * This module must not be wired to a live executor until
 * environment isolation and worker activation are approved.
 */

export type NotificationClaim = {
  job_id: string
  booking_id: string
  notification_type:
    | "customer_confirmation"
    | "internal_confirmation"
  claim_token: string
}

export type NotificationRpcResponse = {
  data: unknown
  error: unknown
}

export type NotificationRpcExecutor = (
  name: string,
  params: Record<string, unknown>
) => Promise<NotificationRpcResponse>

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    UUID_PATTERN.test(value)
  )
}

function readClaim(value: unknown): NotificationClaim {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error("NOTIFICATION_CLAIM_INVALID")
  }

  const row = value as Record<string, unknown>

  if (
    !validUuid(row.job_id) ||
    !validUuid(row.booking_id) ||
    !validUuid(row.claim_token) ||
    (
      row.notification_type !== "customer_confirmation" &&
      row.notification_type !== "internal_confirmation"
    )
  ) {
    throw new Error("NOTIFICATION_CLAIM_INVALID")
  }

  return {
    job_id: row.job_id,
    booking_id: row.booking_id,
    claim_token: row.claim_token,
    notification_type: row.notification_type,
  }
}

function requireResponse(
  response: NotificationRpcResponse
): unknown {
  if (
    !response ||
    typeof response !== "object" ||
    response.error !== null
  ) {
    throw new Error("NOTIFICATION_RPC_FAILED")
  }

  return response.data
}

export function createNotificationRpcAdapter(
  execute: NotificationRpcExecutor
) {
  if (typeof execute !== "function") {
    throw new Error("NOTIFICATION_RPC_EXECUTOR_REQUIRED")
  }

  return {
    async claim(): Promise<NotificationClaim | null> {
      const data = requireResponse(
        await execute("claim_booking_notification", {})
      )

      if (!Array.isArray(data)) {
        throw new Error("NOTIFICATION_CLAIM_RESPONSE_INVALID")
      }

      if (data.length === 0) {
        return null
      }

      if (data.length !== 1) {
        throw new Error("NOTIFICATION_CLAIM_RESPONSE_INVALID")
      }

      return readClaim(data[0])
    },

    async confirmSubmitted(
      claim: NotificationClaim
    ): Promise<boolean> {
      const verified = readClaim(claim)

      const data = requireResponse(
        await execute(
          "confirm_booking_notification_submitted",
          {
            p_job_id: verified.job_id,
            p_claim_token: verified.claim_token,
          }
        )
      )

      if (typeof data !== "boolean") {
        throw new Error("NOTIFICATION_ACK_RESPONSE_INVALID")
      }

      return data
    },

    async markUnknown(
      claim: NotificationClaim,
      reason: string
    ): Promise<boolean> {
      const verified = readClaim(claim)

      if (
        typeof reason !== "string" ||
        !/^[A-Z0-9_]{1,120}$/.test(reason)
      ) {
        throw new Error("NOTIFICATION_REASON_INVALID")
      }

      const data = requireResponse(
        await execute(
          "mark_booking_notification_unknown",
          {
            p_job_id: verified.job_id,
            p_claim_token: verified.claim_token,
            p_error: reason,
          }
        )
      )

      if (typeof data !== "boolean") {
        throw new Error("NOTIFICATION_ACK_RESPONSE_INVALID")
      }

      return data
    },
  }
}