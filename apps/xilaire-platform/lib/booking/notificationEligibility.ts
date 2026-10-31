/**
 * XilAire Technologies
 * AUTH-04T-24U-R8H
 *
 * Booking notification eligibility guard.
 *
 * Pure validation only:
 * - No database calls
 * - No Graph calls
 * - No email submission
 * - No mutations
 */

export type NotificationClaim = {
  job_id: string
  booking_id: string
  notification_type: string
  claim_token: string
}

export type NotificationOutboxRow = {
  id: string
  booking_id: string
  notification_type: string
  delivery_status: string
  claim_token: string | null
  lease_expires_at: string | null
  attempt_count: number
  submitted_at: string | null
}

export type NotificationBookingRow = {
  id: string
  status: string
  payment_status: string
  requires_payment: boolean
  cancelled_at: string | null
  refund_status: string | null
  event_id: string | null
  stripe_checkout_session_id: string | null
  attendee_email: string
  attendee_name: string | null
  booking_type: string
  scheduled_start: string
  scheduled_end: string
}

export type NotificationFulfillmentRow = {
  booking_id: string
  processing_status: string
  graph_event_id: string | null
  graph_transaction_id: string
  stripe_checkout_session_id: string | null
  completed_at: string | null
}

export type NotificationEligibilityInput = {
  claim: NotificationClaim
  outbox: NotificationOutboxRow
  booking: NotificationBookingRow
  fulfillment: NotificationFulfillmentRow
  now: string
}

export type NotificationEligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: string }

function reject(reason: string): NotificationEligibilityResult {
  return { eligible: false, reason }
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function validTime(value: unknown): number | null {
  if (!nonempty(value)) return null

  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp) ? timestamp : null
}

/**
 * Validate a previously claimed notification against
 * freshly retrieved database rows.
 *
 * A successful result is only a point-in-time check.
 * It is not a database lock or authorization grant.
 *
 * The caller must execute this immediately before
 * a single approved Graph submission attempt.
 */
export function validateNotificationEligibility(
  input: NotificationEligibilityInput
): NotificationEligibilityResult {
  const { claim, outbox, booking, fulfillment } = input

  const now = validTime(input.now)

  if (now === null) {
    return reject("INVALID_CURRENT_TIME")
  }

  if (
    !nonempty(claim.job_id) ||
    !nonempty(claim.booking_id) ||
    !nonempty(claim.claim_token)
  ) {
    return reject("INVALID_NOTIFICATION_CLAIM")
  }

  if (
    claim.notification_type !== "customer_confirmation" &&
    claim.notification_type !== "internal_confirmation"
  ) {
    return reject("UNSUPPORTED_NOTIFICATION_TYPE")
  }

  if (
    outbox.id !== claim.job_id ||
    outbox.booking_id !== claim.booking_id ||
    outbox.notification_type !== claim.notification_type
  ) {
    return reject("OUTBOX_CLAIM_MISMATCH")
  }

  if (
    outbox.delivery_status !== "sending" ||
    outbox.claim_token !== claim.claim_token ||
    outbox.attempt_count !== 1 ||
    outbox.submitted_at !== null
  ) {
    return reject("NOTIFICATION_NOT_OWNED")
  }

  const lease = validTime(outbox.lease_expires_at)

  if (lease === null || lease <= now) {
    return reject("NOTIFICATION_LEASE_EXPIRED")
  }

  if (
    booking.id !== claim.booking_id ||
    fulfillment.booking_id !== claim.booking_id
  ) {
    return reject("BOOKING_RELATIONSHIP_MISMATCH")
  }

  if (
    booking.status !== "scheduled" ||
    booking.payment_status !== "paid" ||
    booking.requires_payment !== true
  ) {
    return reject("BOOKING_NOT_PAID_AND_SCHEDULED")
  }

  if (booking.cancelled_at !== null) {
    return reject("BOOKING_CANCELLED")
  }

  // Conservative rule: any non-null refund state
  // requires review before a confirmation is sent.
  if (booking.refund_status !== null) {
    return reject("BOOKING_REFUND_REQUIRES_REVIEW")
  }

  if (
    fulfillment.processing_status !== "completed" ||
    validTime(fulfillment.completed_at) === null
  ) {
    return reject("FULFILLMENT_NOT_COMPLETED")
  }

  if (
    !nonempty(booking.event_id) ||
    !nonempty(fulfillment.graph_event_id) ||
    booking.event_id !== fulfillment.graph_event_id
  ) {
    return reject("GRAPH_EVENT_ID_MISMATCH")
  }

  if (!nonempty(fulfillment.graph_transaction_id)) {
    return reject("GRAPH_TRANSACTION_ID_MISSING")
  }

  if (
    !nonempty(booking.stripe_checkout_session_id) ||
    !booking.stripe_checkout_session_id.startsWith("cs_") ||
    booking.stripe_checkout_session_id !==
      fulfillment.stripe_checkout_session_id
  ) {
    return reject("STRIPE_SESSION_MISMATCH")
  }

  if (
    !nonempty(booking.attendee_email) ||
    !nonempty(booking.attendee_name) ||
    !nonempty(booking.booking_type)
  ) {
    return reject("BOOKING_CONTACT_FIELDS_MISSING")
  }

  const start = validTime(booking.scheduled_start)
  const end = validTime(booking.scheduled_end)

  if (
    start === null ||
    end === null ||
    end <= start
  ) {
    return reject("BOOKING_SCHEDULE_INVALID")
  }

  return { eligible: true }
}