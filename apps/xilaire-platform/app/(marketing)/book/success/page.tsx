// apps/xilaire-platform/app/(marketing)/book/success/page.tsx

import Link from "next/link"

export const dynamic = "force-dynamic"

export default function BookingSuccessPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-10">

        <div className="mb-6">
          <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            Booking status
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          Your booking is being processed
        </h1>

        <p className="text-gray-600 mb-5">
          If you have just returned from checkout, payment verification
          and calendar scheduling may still be in progress.
        </p>

        <p className="text-gray-600 mb-5">
          Returning to this page does not by itself confirm that
          payment was received or that your session was scheduled.
        </p>

        <p className="text-gray-600 mb-8">
          Please refer to your confirmed booking details when they
          become available. If you are uncertain about the status,
          contact XilAire Technologies before making another payment.
        </p>

        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-500 mb-6">
            This page does not display private booking information
            or independently verify payment status.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/book"
              className="flex-1 text-center bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-100 transition"
            >
              Booking Page
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
    </main>
  )
}