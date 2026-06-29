// apps/xilaire-platform/app/(marketing)/book/success/page.tsx

import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error("Supabase public env vars missing")
}

function formatDateET(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "full",
    timeStyle: "short",
  })
}

function formatBookingTitle(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: { booking_id?: string }
}) {
  const bookingId = searchParams.booking_id

  if (!bookingId) notFound()

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single()

  if (!booking || booking.payment_status !== "paid") {
    notFound()
  }

  const formattedDate = formatDateET(booking.scheduled_start)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-10">

        {/* Success Icon */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Payment Successful
          </h1>
        </div>

        <p className="text-gray-600 mb-8">
          Your booking has been confirmed and added to our calendar.
          A confirmation email with meeting details has been sent.
        </p>

        {/* Booking Details Card */}
        <div className="bg-gray-50 border rounded-xl p-6 mb-8">
          <div className="space-y-3 text-sm">

            <div className="flex justify-between">
              <span className="text-gray-500">Booking Type</span>
              <span className="font-medium text-gray-900">
                {formatBookingTitle(booking.booking_type)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Scheduled For</span>
              <span className="font-medium text-gray-900">
                {formattedDate}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Booking ID</span>
              <span className="font-mono text-xs text-gray-600">
                {booking.id}
              </span>
            </div>

          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">

          <Link
            href="/book"
            className="flex-1 text-center bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-100 transition"
          >
            Book Another Session
          </Link>

          <Link
            href="/"
            className="flex-1 text-center bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Return Home
          </Link>

        </div>

      </div>
    </div>
  )
}