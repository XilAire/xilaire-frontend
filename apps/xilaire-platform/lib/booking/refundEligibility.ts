// apps/xilaire-platform/lib/booking/refundEligibility.ts

export function isRefundEligible(booking: {
  status: string
  payment_status: string
  scheduled_start: string
}) {
  if (booking.status !== "scheduled") {
    return false
  }

  if (booking.payment_status !== "paid") {
    return false
  }

  const now = new Date()
  const start = new Date(booking.scheduled_start)

  const hoursUntilStart =
    (start.getTime() - now.getTime()) / 1000 / 60 / 60

  if (hoursUntilStart < 24) {
    return false
  }

  return true
}