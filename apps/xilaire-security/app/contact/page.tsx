"use client";

import { useState } from "react";

export default function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");

  // Honeypot (hidden field for bots)
  const [honeypot, setHoneypot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setWarning(null);

    if (!fullName || !email || !topic || !message) {
      setError("Please fill out all fields.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/contact/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          topic,
          message,
          honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Unable to send your message. Please try again.");
        setSubmitting(false);
        return;
      }

      if (data.warning) {
        setWarning(
          data.warning ||
            "Your message was saved, but we were unable to send notification emails."
        );
      } else {
        setSuccess("Your message has been sent! Our team will contact you shortly.");
      }

      // Reset form
      setFullName("");
      setEmail("");
      setTopic("");
      setMessage("");
      setHoneypot("");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <header className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-900/70">
          Contact XilAire Security
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0a233f]">
          Get in touch with our training team
        </h1>
        <p className="max-w-2xl text-sm md:text-base text-slate-700">
          Have questions about Class D or Class G training, scheduling, or
          group enrollment? Send us a message and we&apos;ll get back to you as
          soon as possible.
        </p>
      </header>

      <section className="grid gap-8 md:grid-cols-[2fr,1.3fr]">
        {/* Contact form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot (hidden) */}
            <input
              type="text"
              name="company"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            {/* Full name */}
            <div className="space-y-1">
              <label
                htmlFor="name"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                Full name
              </label>
              <input
                id="name"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Topic */}
            <div className="space-y-1">
              <label
                htmlFor="topic"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                Topic
              </label>
              <select
                id="topic"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="">Choose a topic…</option>
                <option value="Class D training">Class D training</option>
                <option value="Class G / firearms">Class G / firearms</option>
                <option value="Group / corporate enrollment">
                  Group / corporate enrollment
                </option>
                <option value="Technical support / login">
                  Technical support / login
                </option>
                <option value="Other">Other question</option>
              </select>
            </div>

            {/* Message */}
            <div className="space-y-1">
              <label
                htmlFor="message"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                How can we help?
              </label>
              <textarea
                id="message"
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Tell us a bit about what you need…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Alerts */}
            {error && (
              <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
            {warning && !error && (
              <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                {warning}
              </p>
            )}
            {success && !error && (
              <p className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                {success}
              </p>
            )}

            <p className="text-[11px] text-slate-500">
              This form is for general questions about XilAire Security
              training. Do not submit sensitive personal information or payment
              details here.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 inline-flex w-full items-center justify-center rounded-md bg-[#0a233f] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#0f315c] disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send message"}
            </button>
          </form>
        </div>

        {/* Contact info */}
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
          <h2 className="text-base font-semibold text-[#0a233f]">
            School contact information
          </h2>
          <p>
            XilAire Security is based in South Florida and provides online
            training aligned with Florida FDACS requirements for security
            officers.
          </p>

          <div className="space-y-2 text-sm">
            <div>
              <p className="font-semibold text-slate-800">Email</p>
              <p>support@xilairesecurity.com</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Phone</p>
              <p>(866) 566-0331</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Hours</p>
              <p>Monday – Friday, 9:00 AM – 5:00 PM (Eastern)</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            For urgent safety issues or emergencies, contact local law
            enforcement — do not use this form.
          </p>
        </aside>
      </section>
    </main>
  );
}
