"use client";

import { useEffect, useMemo, useState } from "react";

type AvailabilitySlot = {
  bookingType: string;
  duration: number;
  start: string;
  end: string;
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

// BOOKING-SAFETY-08: UI-only maintenance lock. The booking-create API remains
// the authoritative enforcement point and MUST stay disabled independently.
const BOOKING_CREATION_LOCKED = true;
const BOOKING_MAINTENANCE_MESSAGE =
  "Online booking is temporarily unavailable while we complete system updates. Please check back soon.";

const EASTERN = "America/New_York";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function easternDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function dateParts(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTimeET(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: EASTERN,
  }).format(new Date(iso));
}

function formatDateTimeET(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: EASTERN,
  }).format(new Date(iso));
}

function formatSelectedDate(key: string) {
  const { year, month, day } = dateParts(key);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function getBookingLabel(type: string): string {
  const labels: Record<string, string> = {
    technical_consult: "Technical consultation",
    technical_consult_after_hours: "After-hours technical consultation",
    ai_strategy_session: "AI strategy session",
    security_assessment_call: "Security assessment",
    m365_implementation_session: "Microsoft 365 implementation",
    enterprise_architecture_review: "Enterprise architecture review",
    priority_support_block: "Priority support",
    priority_support_block_after_hours: "After-hours priority support",
    free_consult: "Free consultation",
    demo: "Product demo",
    sales: "Sales consultation",
  };
  if (labels[type]) return labels[type];
  return type.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function sameSlot(a: AvailabilitySlot | null, b: AvailabilitySlot) {
  return !!a && a.start === b.start && a.end === b.end &&
    a.bookingType === b.bookingType && a.duration === b.duration;
}

export default function BookingPage() {
  const [todayKey] = useState(() => easternDateKey());
  const [date, setDate] = useState(() => easternDateKey());
  const [visibleMonth, setVisibleMonth] = useState(() => easternDateKey().slice(0, 7));
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [serviceFilter, setServiceFilter] = useState("all");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const month = useMemo(() => {
    const [year, number] = visibleMonth.split("-").map(Number);
    const firstWeekday = new Date(Date.UTC(year, number - 1, 1, 12)).getUTCDay();
    const days = new Date(Date.UTC(year, number, 0, 12)).getUTCDate();
    return { year, number, firstWeekday, days };
  }, [visibleMonth]);

  const services = useMemo(() => {
    return Array.from(new Set(availability.map((slot) => slot.bookingType))).sort();
  }, [availability]);

  const filteredSlots = useMemo(() => {
    return availability
      .filter((slot) => serviceFilter === "all" || slot.bookingType === serviceFilter)
      .slice()
      .sort((a, b) => a.start.localeCompare(b.start) || a.bookingType.localeCompare(b.bookingType));
  }, [availability, serviceFilter]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSelectedSlot(null);
    setServiceFilter("all");
    setAvailability([]);

    async function loadAvailability() {
      try {
        const response = await fetch(`/api/booking/availability?date=${encodeURIComponent(date)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("AVAILABILITY_FETCH_FAILED");
        const payload = (await response.json()) as AvailabilityResponse;
        if (!Array.isArray(payload.availability)) throw new Error("INVALID_AVAILABILITY_RESPONSE");
        if (!controller.signal.aborted) setAvailability(payload.availability);
      } catch (caught) {
        if (controller.signal.aborted) return;
        console.error("BOOKING_AVAILABILITY_UI_ERROR", caught);
        setError("We couldn't load appointment times. Please try another date or refresh the page.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadAvailability();
    return () => controller.abort();
  }, [date]);

  function shiftMonth(delta: number) {
    const shifted = new Date(Date.UTC(month.year, month.number - 1 + delta, 1, 12));
    const next = dateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 1).slice(0, 7);
    if (next >= todayKey.slice(0, 7)) setVisibleMonth(next);
  }

  function selectDate(key: string) {
    if (key < todayKey || submitting) return;
    setDate(key);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Defense in depth: block even a programmatic form submission.
    // Never rely on this UI guard as a replacement for the server lock.
    if (BOOKING_CREATION_LOCKED) {
      setError(BOOKING_MAINTENANCE_MESSAGE);
      return;
    }
    if (loading || submitting || !selectedSlot || !name.trim() || !email.trim()) {
      setError("Select an appointment and complete your contact details.");
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
        timeZone: EASTERN,
      });
      const response = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          time: timeString,
          name: name.trim(),
          email: email.trim(),
          bookingType: selectedSlot.bookingType,
          duration: selectedSlot.duration,
        }),
      });
      const data = (await response.json()) as BookingResponse;
      if (!response.ok) {
        setError(
          response.status === 503 && data.error === "BOOKING_CREATION_DISABLED_PENDING_SAFETY_REVIEW"
            ? BOOKING_MAINTENANCE_MESSAGE
            : data.error ?? "Booking failed. Please try again."
        );
        return;
      }
      if (data.requiresPayment) {
        if (!data.checkoutUrl) {
          setError("Checkout is temporarily unavailable. Please contact support.");
          return;
        }
        window.location.href = data.checkoutUrl;
        return;
      }
      setConfirmation({ start: selectedSlot.start, end: selectedSlot.end });
    } catch (caught) {
      console.error("BOOKING_SUBMIT_ERROR", caught);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <section className="rounded-3xl border border-border bg-surface p-8 text-center shadow-sm sm:p-14">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 text-3xl text-sky-600 dark:text-sky-300" aria-hidden="true">✓</div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">XilAire Technologies</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Your booking is confirmed</h1>
          <p className="mt-4 text-muted-foreground">Your consultation is scheduled for</p>
          <p className="mt-3 text-xl font-semibold text-foreground">{formatDateTimeET(confirmation.start)}</p>
          <p className="mt-2 text-sm text-muted-foreground">Eastern Time (ET)</p>
          <p className="mt-8 text-sm text-muted-foreground">Please save the appointment details. Email delivery is processed separately.</p>
          <a href="/" className="mt-8 inline-flex rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700 focus-visible:outline-offset-4">Back to home</a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-180px)] bg-background px-4 py-8 text-foreground sm:px-6 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> XilAire consultations
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Let's make something exceptional.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Find the right time to connect with our team. Choose a date, select an appointment, and tell us how to reach you.</p>
          {BOOKING_CREATION_LOCKED && (
            <div role="status" aria-live="polite" className="mt-5 rounded-2xl border border-amber-300/60 bg-amber-500/10 px-5 py-4 text-sm text-foreground">
              <p className="font-semibold">Online booking is temporarily paused</p>
              <p className="mt-1 text-muted-foreground">{BOOKING_MAINTENANCE_MESSAGE} Available times are shown for reference only; no appointment can be reserved.</p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span>◷ All times in Eastern Time (ET)</span>
            <span>✓ Choose a time that works for you</span>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
          <div className="space-y-6">
            <section aria-labelledby="date-heading" className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
              <div className="border-b border-border px-5 py-5 sm:px-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sm font-bold text-sky-700 dark:text-sky-300">01</span>
                  <div>
                    <h2 id="date-heading" className="text-lg font-bold">Choose your date</h2>
                    <p className="text-sm text-muted-foreground">Select a day to view appointment availability.</p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-bold">{MONTHS[month.number - 1]} {month.year}</h3>
                  <div className="flex gap-2">
                    <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)} disabled={visibleMonth <= todayKey.slice(0, 7)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-lg transition hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-30">‹</button>
                    <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-lg transition hover:bg-surface-secondary">›</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2" role="group" aria-label="Choose a booking date">
                  {WEEKDAYS.map((day) => <div key={day} className="pb-2 text-center text-xs font-semibold text-muted-foreground">{day}</div>)}
                  {Array.from({ length: month.firstWeekday }, (_, index) => <div key={`blank-${index}`} />)}
                  {Array.from({ length: month.days }, (_, index) => {
                    const day = index + 1;
                    const key = dateKey(month.year, month.number, day);
                    const selected = key === date;
                    const disabled = key < todayKey || submitting;
                    return (
                      <button key={key} type="button" disabled={disabled} aria-pressed={selected} aria-label={formatSelectedDate(key)} onClick={() => selectDate(key)} className={`flex h-11 sm:h-12 items-center justify-center rounded-xl border text-sm font-semibold transition focus-visible:outline-offset-2 ${selected ? "border-sky-600 bg-sky-600 text-white shadow-sm" : "border-transparent hover:border-border hover:bg-surface-secondary"} ${disabled ? "cursor-not-allowed opacity-30" : ""}`}>
                        {day}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 rounded-xl bg-surface-secondary px-4 py-3 text-sm text-muted-foreground">Selected: <strong className="text-foreground">{formatSelectedDate(date)}</strong></div>
              </div>
            </section>

            <section aria-labelledby="time-heading" className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
              <div className="border-b border-border px-5 py-5 sm:px-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sm font-bold text-sky-700 dark:text-sky-300">02</span>
                  <div>
                    <h2 id="time-heading" className="text-lg font-bold">Select your session</h2>
                    <p className="text-sm text-muted-foreground">Times and services returned by our live calendar.</p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                {!loading && services.length > 1 && (
                  <div className="mb-5">
                    <label htmlFor="booking-service-filter" className="mb-2 block text-sm font-semibold">Filter by consultation type</label>
                    <select id="booking-service-filter" value={serviceFilter} onChange={(event) => { setServiceFilter(event.target.value); setSelectedSlot(null); }} className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground focus-visible:outline-offset-2 sm:max-w-md">
                      <option value="all">All available services</option>
                      {services.map((service) => <option key={service} value={service}>{getBookingLabel(service)}</option>)}
                    </select>
                  </div>
                )}
                {loading ? (
                  <div role="status" className="rounded-2xl border border-dashed border-border bg-surface-secondary p-8 text-center text-sm text-muted-foreground">Checking availability…</div>
                ) : error && availability.length === 0 ? (
                  <div role="alert" className="rounded-2xl border border-red-300/50 bg-red-500/5 p-6 text-sm text-red-700 dark:text-red-300">{error}</div>
                ) : filteredSlots.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-secondary p-8 text-center">
                    <h3 className="font-semibold">No sessions available</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Try another date or service type.</p>
                  </div>
                ) : (
                  <div className="grid max-h-[510px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2" role="group" aria-label="Available appointment times">
                    {filteredSlots.map((slot, index) => {
                      const selected = sameSlot(selectedSlot, slot);
                      return (
                        <button key={`${slot.start}-${slot.end}-${slot.bookingType}-${index}`} type="button" aria-pressed={selected} onClick={() => { setSelectedSlot(slot); setError(null); }} className={`rounded-2xl border p-4 text-left transition focus-visible:outline-offset-2 ${selected ? "border-sky-600 bg-sky-500/10 ring-1 ring-sky-600" : "border-border bg-surface hover:border-sky-400 hover:bg-surface-secondary"}`}>
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <span className="text-sm font-bold">{formatTimeET(slot.start)} – {formatTimeET(slot.end)}</span>
                            {selected && <span className="text-sky-600 dark:text-sky-300" aria-hidden="true">✓</span>}
                          </div>
                          <p className="text-sm font-medium">{getBookingLabel(slot.bookingType)}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="rounded-lg bg-surface-secondary px-2 py-1">{slot.duration} min</span>
                            <span className="rounded-lg bg-surface-secondary px-2 py-1">{slot.requiresPayment ? "Paid session" : "No payment required"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm" aria-labelledby="details-heading">
              <div className="border-b border-border px-5 py-5 sm:px-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sm font-bold text-sky-700 dark:text-sky-300">03</span>
                  <div>
                    <h2 id="details-heading" className="text-lg font-bold">Complete your booking</h2>
                    <p className="text-sm text-muted-foreground">Your details and appointment summary.</p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <div className="mb-6 rounded-2xl bg-surface-secondary p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Your selection</p>
                  <p className="font-semibold">{selectedSlot ? getBookingLabel(selectedSlot.bookingType) : "No session selected"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{formatSelectedDate(date)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedSlot ? `${formatTimeET(selectedSlot.start)} – ${formatTimeET(selectedSlot.end)} ET` : "Choose an available time"}</p>
                  {selectedSlot && <p className="mt-3 inline-flex rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold">{selectedSlot.requiresPayment ? "Payment required at checkout" : "No payment required"}</p>}
                </div>
                <form onSubmit={(event) => { void handleSubmit(event); }} className="space-y-4">
                  <div>
                    <label htmlFor="booking-name" className="mb-2 block text-sm font-semibold">Full name</label>
                    <input id="booking-name" name="name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus-visible:outline-offset-2" />
                  </div>
                  <div>
                    <label htmlFor="booking-email" className="mb-2 block text-sm font-semibold">Email address</label>
                    <input id="booking-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus-visible:outline-offset-2" />
                  </div>
                  {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
                  <button type="submit" disabled={BOOKING_CREATION_LOCKED || !selectedSlot || submitting || loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3.5 font-bold text-white transition hover:bg-sky-700 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50">
                    {BOOKING_CREATION_LOCKED ? "Booking temporarily unavailable" : submitting ? "Processing…" : selectedSlot?.requiresPayment ? "Continue to checkout →" : "Confirm appointment →"}
                  </button>
                  <p className="text-center text-xs leading-5 text-muted-foreground">
                    {BOOKING_CREATION_LOCKED
                      ? "Booking requests and checkout are disabled while system updates are in progress."
                      : "By continuing, you request a booking for the appointment shown above. Paid sessions continue to secure checkout."}
                  </p>
                </form>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
