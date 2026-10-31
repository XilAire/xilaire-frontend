"use client";

import { useSearchParams } from "next/navigation";

export default function CancelledPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  let title = "Booking Cancelled";
  let message = "Your booking has been successfully cancelled.";
  let titleColor = "text-red-600";

  switch (status) {
    case "already":
      title = "Already Cancelled";
      message =
        "This booking was already cancelled earlier. No further action is required.";
      titleColor = "text-amber-600";
      break;

    case "notfound":
      title = "Booking Not Found";
      message =
        "We couldn't locate this booking. It may have already been removed or the link is invalid.";
      titleColor = "text-amber-600";
      break;

    case "missing":
      title = "Invalid Cancellation Link";
      message =
        "This cancellation link is missing required information.";
      titleColor = "text-amber-600";
      break;

    case "invalid":
      title = "Invalid or Expired Link";
      message =
        "This cancellation link is invalid or has expired.";
      titleColor = "text-amber-600";
      break;

    default:
      // success case
      break;
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <h1 className={`mb-4 text-3xl font-bold ${titleColor}`}>
        {title}
      </h1>

      <p className="mb-6 text-slate-600">{message}</p>

      <a
        href="/book"
        className="inline-block rounded bg-sky-600 px-6 py-3 text-white hover:bg-sky-700 transition"
      >
        Book a New Call
      </a>
    </main>
  );
}