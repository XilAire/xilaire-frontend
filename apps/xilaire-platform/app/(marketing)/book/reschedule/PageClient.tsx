"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type AvailabilitySlot = {
  bookingType: string;
  duration: number;
  start: string;
  end: string;
};

type AvailabilityResponse = {
  date: string;
  timezone: string;
  availability: AvailabilitySlot[];
};

/* -------------------------------------------------
   PAGE
------------------------------------------------- */
export default function ReschedulePage() {
  const params = useSearchParams();
  const token = params.get("token");

  const cancelUrl = token
    ? `/api/booking/cancel?token=${token}`
    : null;

  const todayIso = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(todayIso);
  const [duration, setDuration] = useState<15 | 30 | 60>(30);

  const [availability, setAvailability] =
    useState<AvailabilitySlot[]>([]);

  const [selectedSlot, setSelectedSlot] =
    useState<AvailabilitySlot | null>(null);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "saving" | "done" | "error"
  >("idle");

  /* ---------------------------------------------
     TOKEN GUARD
  --------------------------------------------- */
  if (!token) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold">Invalid Link</h1>
        <p className="mt-4">
          This reschedule link is missing or invalid.
        </p>
      </main>
    );
  }

  /* ---------------------------------------------
     LOAD AVAILABILITY (AUTHORITATIVE)
  --------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      setLoading(true);
      setSelectedSlot(null);

      try {
        const res = await fetch(
          `/api/booking/availability?date=${date}`
        );

        if (!res.ok) {
          setAvailability([]);
          return;
        }

        const data =
          (await res.json()) as AvailabilityResponse;

        if (!cancelled) {
          setAvailability(
            (data.availability ?? []).filter(
              (s) => s.duration === duration
            )
          );
        }
      } catch {
        if (!cancelled) setAvailability([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [date, duration]);

  /* ---------------------------------------------
     SUBMIT
  --------------------------------------------- */
  async function submit() {
    if (!selectedSlot || !token) return;

    setStatus("saving");

    const slotDate = new Date(selectedSlot.start);
    const hours = slotDate
      .getHours()
      .toString()
      .padStart(2, "0");
    const minutes = slotDate
      .getMinutes()
      .toString()
      .padStart(2, "0");

    const time = `${hours}:${minutes}`;

    try {
      const res = await fetch("/api/booking/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          date,
          time,
          duration,
        }),
      });

      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  /* ---------------------------------------------
     SUCCESS
  --------------------------------------------- */
  if (status === "done") {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-3xl font-bold">Rescheduled</h1>
        <p className="mt-4">
          Your meeting has been updated successfully.
        </p>

        <a
          href="/book"
          className="mt-6 inline-block text-sky-600 hover:underline"
        >
          Book another call
        </a>
      </main>
    );
  }

  /* ---------------------------------------------
     UI
  --------------------------------------------- */
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold">
        Reschedule Your Call
      </h1>

      <p className="mb-4 text-sm text-slate-500">
        All times shown are Eastern Time (ET)
      </p>

      <div className="mb-6 flex gap-4">
        <input
          type="date"
          value={date}
          min={todayIso}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border px-3 py-2"
        />

        <select
          value={duration}
          onChange={(e) =>
            setDuration(
              Number(e.target.value) as 15 | 30 | 60
            )
          }
          className="rounded border px-3 py-2"
        >
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
          <option value={60}>60 min</option>
        </select>
      </div>

      {loading && (
        <p className="mb-6 text-sm text-slate-500">
          Loading availability…
        </p>
      )}

      {!loading && availability.length === 0 && (
        <p className="mb-6 text-sm text-slate-500">
          No available times for this date.
        </p>
      )}

      {!loading && availability.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {availability.map((slot, idx) => {
            const start = new Date(slot.start);
            const end = new Date(slot.end);

            const label = `${start.toLocaleTimeString(
              "en-US",
              {
                timeZone: "America/New_York",
                hour: "numeric",
                minute: "2-digit",
              }
            )} – ${end.toLocaleTimeString(
              "en-US",
              {
                timeZone: "America/New_York",
                hour: "numeric",
                minute: "2-digit",
              }
            )}`;

            const afterHours =
              start.getHours() < 9 ||
              start.getHours() >= 17 ||
              start.getDay() === 0 ||
              start.getDay() === 6;

            const isSelected =
              selectedSlot?.start === slot.start;

            return (
              <button
                key={`${slot.start}-${idx}`}
                onClick={() => setSelectedSlot(slot)}
                disabled={status === "saving"}
                className={
                  "rounded border px-3 py-3 text-sm text-left transition " +
                  (afterHours
                    ? "border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    : "hover:bg-slate-100") +
                  (isSelected
                    ? " ring-2 ring-sky-500"
                    : "")
                }
              >
                {label}
                {afterHours && (
                  <span className="ml-1">💲</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={submit}
        disabled={status === "saving" || !selectedSlot}
        className="rounded bg-sky-600 px-6 py-3 text-white disabled:opacity-50"
      >
        {status === "saving"
          ? "Updating…"
          : "Confirm Reschedule"}
      </button>

      {cancelUrl && (
        <div className="mt-6">
          <a
            href={cancelUrl}
            className="text-sm text-red-600 hover:underline"
          >
            Cancel this call instead
          </a>
        </div>
      )}

      {status === "error" && (
        <p className="mt-4 text-red-600">
          Unable to reschedule. Please try again.
        </p>
      )}
    </main>
  );
}