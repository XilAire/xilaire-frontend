"use client";

import { useEffect, useState } from "react";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type AvailabilitySlot = {
  bookingType: string;
  duration: number;
  start: string; // ISO
  end: string;   // ISO
  requiresPayment?: boolean;
};

type AvailabilityResponse = {
  date: string;
  timezone: string;
  availability: AvailabilitySlot[];
};

type BookingResponse = {
  success?: boolean;
  requiresPayment?: boolean;
  checkoutUrl?: string;
  error?: string;
};

type BookingConfirmation = {
  start: string;
  end: string;
};

/* -------------------------------------------------
   FORMATTERS (LOCKED TO EASTERN)
------------------------------------------------- */
function formatTimeET(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  }).format(new Date(iso));
}

function formatDateTimeET(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(iso));
}

/* -------------------------------------------------
   BOOKING TYPE LABELS
------------------------------------------------- */
function getBookingLabel(type: string) {
  switch (type) {
    case "technical_consult":
      return "Technical Consult";
    case "ai_strategy_session":
      return "AI Strategy Session";
    case "security_assessment_call":
      return "Security Assessment";
    case "m365_implementation_session":
      return "M365 Implementation";
    case "enterprise_architecture_review":
      return "Enterprise Architecture Review";
    case "priority_support_block":
      return "Priority Support";
    case "free_consult":
      return "Free Consultation";
    default:
      return type;
  }
}

/* -------------------------------------------------
   PAGE
------------------------------------------------- */
export default function BookingPage() {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(todayIso);
  const [availability, setAvailability] =
    useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] =
    useState<AvailabilitySlot | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmation, setConfirmation] =
    useState<BookingConfirmation | null>(null);

  /* ---------------------------------------------
     LOAD AVAILABILITY
  --------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/booking/availability?date=${date}`
        );

        if (!res.ok) {
          throw new Error("AVAILABILITY_FETCH_FAILED");
        }

        const data =
          (await res.json()) as AvailabilityResponse;

        if (!cancelled) {
          setAvailability(data.availability ?? []);
        }
      } catch (err) {
        console.error("BOOKING_AVAILABILITY_UI_ERROR", err);
        if (!cancelled) {
          setAvailability([]);
          setError("Unable to load availability.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [date]);

  /* ---------------------------------------------
     SUBMIT BOOKING
  --------------------------------------------- */
  async function handleSubmit() {
    if (!selectedSlot || !name || !email) {
      setError("Please complete all fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const start = new Date(selectedSlot.start);

      const timeString = start.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/New_York",
      });

      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          time: timeString,
          name,
          email,
          bookingType: selectedSlot.bookingType,
          duration: selectedSlot.duration,
        }),
      });

      const data = (await res.json()) as BookingResponse;

      if (!res.ok) {
        setError(data?.error ?? "Booking failed.");
        return;
      }

      /* -----------------------------------------
         PAYMENT FLOW
      ----------------------------------------- */
      if (data.requiresPayment && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      /* -----------------------------------------
         FREE FLOW
      ----------------------------------------- */
      setConfirmation({
        start: selectedSlot.start,
        end: selectedSlot.end,
      });

    } catch (err) {
      console.error("BOOKING_SUBMIT_ERROR", err);
      setError("Unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------------------------------
     CONFIRMATION
  --------------------------------------------- */
  if (confirmation) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="mb-4 text-3xl font-bold">
          Booking Confirmed
        </h1>

        <p className="mb-4 text-slate-600">
          Your session is scheduled for:
        </p>

        <p className="mb-2 font-medium">
          {formatDateTimeET(confirmation.start)}
        </p>

        <p className="text-sm text-slate-500">
          Eastern Time (ET)
        </p>

        <p className="mt-6 text-sm text-slate-500">
          A confirmation email has been sent.
        </p>
      </main>
    );
  }

  /* ---------------------------------------------
     UI
  --------------------------------------------- */
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold">
        Book a Call
      </h1>

      <p className="mb-6 text-sm text-slate-500">
        All times shown in Eastern Time (ET)
      </p>

      {/* DATE */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Date
        </label>
        <input
          type="date"
          value={date}
          min={todayIso}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </div>

      {/* AVAILABILITY */}
      <div className="mb-8">
        {loading && (
          <p className="text-sm text-slate-500">
            Loading availability…
          </p>
        )}

        {!loading && availability.length === 0 && (
          <p className="text-sm text-slate-500">
            No availability for this date.
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availability.map((slot, idx) => {
            const label = `${formatTimeET(
              slot.start
            )} – ${formatTimeET(slot.end)}`;

            return (
              <button
                key={`${slot.start}-${idx}`}
                onClick={() => setSelectedSlot(slot)}
                className={
                  "rounded border px-3 py-3 text-sm text-left transition " +
                  (selectedSlot === slot
                    ? "bg-sky-500 text-white"
                    : "hover:bg-slate-100")
                }
              >
                <div className="font-medium">
                  {label}
                </div>

                <div className="text-xs mt-1 opacity-80">
                  {getBookingLabel(slot.bookingType)}
                  {slot.requiresPayment && " • Paid"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* USER INPUT */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selectedSlot || submitting}
        className="rounded bg-sky-600 px-6 py-3 text-white disabled:opacity-50"
      >
        {submitting ? "Processing…" : "Confirm Booking"}
      </button>
    </main>
  );
}