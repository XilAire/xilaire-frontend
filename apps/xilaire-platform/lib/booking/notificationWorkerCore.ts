/**
 * XilAire Technologies - AUTH-04T-24U-R8Q-R2
 *
 * Post-claim notification lifecycle coordinator.
 *
 * No direct database, Graph, token, or network access.
 * No operations are performed when imported.
 *
 * Execution starts only after a durable database claim.
 *
 * The caller must enforce:
 * - Authentication
 * - PREVIEW/production environment isolation
 * - Original claim-token ownership
 * - No automatic email retries
 * - Manual reconciliation for uncertain outcomes
 */

import {
  validateNotificationEligibility,
  type NotificationEligibilityInput,
} from "./notificationEligibility"

import type {
  NotificationSubmissionResult,
} from "./notificationSubmission"

export type NotificationWorkerDependencies = {
  loadFreshEligibility:
    () => Promise<NotificationEligibilityInput>

  submitOnce:
    () => Promise<NotificationSubmissionResult>

  confirmSubmitted:
    () => Promise<boolean>

  markUnknown:
    (reason: string) => Promise<boolean>
}

export type NotificationWorkerOutcome =
  | {
      state: "submitted"
      manualReconciliation: false
    }
  | {
      state: "delivery_unknown"
      manualReconciliation: true
      reason: string
    }
  | {
      state: "acknowledgment_failed"
      manualReconciliation: true
      reason: string
    }

function safeReason(value: string): string {
  return value.slice(0, 120)
}

/**
 * Coordinates exactly one post-claim submission attempt.
 *
 * There are no automatic retries.
 *
 * A failed acknowledgment always requires independent
 * reconciliation against the durable notification outbox.
 */
export async function processClaimedNotification(
  dependencies: NotificationWorkerDependencies
): Promise<NotificationWorkerOutcome> {
  if (
    !dependencies ||
    typeof dependencies.loadFreshEligibility !== "function" ||
    typeof dependencies.submitOnce !== "function" ||
    typeof dependencies.confirmSubmitted !== "function" ||
    typeof dependencies.markUnknown !== "function"
  ) {
    throw new Error("NOTIFICATION_DEPENDENCIES_INVALID")
  }

  async function recordUnknown(
    reason: string
  ): Promise<NotificationWorkerOutcome> {
    const code = safeReason(reason)

    try {
      const acknowledged = await dependencies.markUnknown(code)

      if (acknowledged === true) {
        return {
          state: "delivery_unknown",
          manualReconciliation: true,
          reason: code,
        }
      }
    } catch {
      // Do not retry the database acknowledgment.
    }

    return {
      state: "acknowledgment_failed",
      manualReconciliation: true,
      reason: code,
    }
  }

  let snapshot: NotificationEligibilityInput

  try {
    snapshot = await dependencies.loadFreshEligibility()
  } catch {
    return recordUnknown("ELIGIBILITY_READ_FAILED")
  }

  let result: ReturnType<typeof validateNotificationEligibility>

  try {
    result = validateNotificationEligibility(snapshot)
  } catch {
    return recordUnknown("ELIGIBILITY_CHECK_FAILED")
  }

  // Explicit discriminant comparison plus property existence
  // ensures TypeScript safely accesses the rejection reason.
  if (result.eligible === false) {
    const reason = "reason" in result
      ? result.reason
      : "UNKNOWN"

    return recordUnknown(
      "ELIGIBILITY_REJECTED_" + reason
    )
  }

  // Fail closed if the validator returned an unexpected shape.
  if (result.eligible !== true) {
    return recordUnknown("ELIGIBILITY_RESULT_INVALID")
  }

  let submission: NotificationSubmissionResult

  try {
    submission = await dependencies.submitOnce()
  } catch {
    return recordUnknown("SUBMISSION_EXCEPTION")
  }

  if (
    !submission ||
    submission.outcome !== "accepted" ||
    submission.httpStatus !== 202
  ) {
    return recordUnknown("SUBMISSION_NOT_ACCEPTED")
  }

  try {
    const acknowledged = await dependencies.confirmSubmitted()

    if (acknowledged === true) {
      return {
        state: "submitted",
        manualReconciliation: false,
      }
    }
  } catch {
    // Graph may already have accepted the message.
    // Never resubmit to compensate for an acknowledgment error.
  }

  return {
    state: "acknowledgment_failed",
    manualReconciliation: true,
    reason: "SUBMISSION_ACKNOWLEDGMENT_FAILED",
  }
}