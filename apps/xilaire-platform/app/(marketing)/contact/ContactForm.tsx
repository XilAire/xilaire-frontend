"use client";

import { FormEvent, useEffect, useState } from "react";

type ContactFormProps = {
  serviceSku?: string;
  serviceName?: string;
};

export default function ContactForm({ serviceSku, serviceName }: ContactFormProps) {
  const [name, setName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [company, setCompany] = useState("");
  const [employees, setEmployees] = useState("");
  const [services, setServices] = useState("Managed IT & Cloud");
  const [message, setMessage] = useState("");

  // Honeypot (hidden field for bots)
  const [honeypot, setHoneypot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prefill from /services clickthrough
  useEffect(() => {
    if (!serviceSku && !serviceName) return;

    // If user hasn’t typed a message yet, seed it with context
    setMessage((prev) => {
      if (prev.trim().length > 0) return prev;

      const parts: string[] = [];
      if (serviceName) parts.push(`Service: ${serviceName}`);
      if (serviceSku) parts.push(`SKU: ${serviceSku}`);

      const header = parts.length > 0 ? parts.join(" | ") + "\n\n" : "";
      return (
        header +
        "Tell us a bit about your environment, user count, and any timelines or goals."
      );
    });

    // Optionally tweak the “Interested in” dropdown if it’s still on the default
    setServices((prev) => {
      if (prev !== "Managed IT & Cloud") return prev;

      if (serviceName?.toLowerCase().includes("security")) return "Cybersecurity";
      if (serviceName?.toLowerCase().includes("voip")) return "VoIP & Communications";
      if (
        serviceName?.toLowerCase().includes("automation") ||
        serviceName?.toLowerCase().includes("bot") ||
        serviceName?.toLowerCase().includes("ai")
      ) {
        return "AI & Automation";
      }

      return prev;
    });
  }, [serviceSku, serviceName]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setSuccess(null);
    setWarning(null);
    setError(null);

    try {
      const res = await fetch("/api/contact/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name,
          email: workEmail,
          topic: services,
          serviceSku,
          serviceName,
          // Pack extra fields into the message body so you see them in the email
          message: `
Service: ${serviceName || "N/A"}
SKU: ${serviceSku || "N/A"}
Company: ${company || "N/A"}
Employees: ${employees || "N/A"}
Interested in: ${services}

Message:
${message}
          `.trim(),
          honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        if (data.warning) {
          setWarning(
            data.warning ||
              "We saved your message, but could not send notification emails."
          );
        } else {
          setSuccess("Thank you! We’ve received your message.");
        }

        // Clear form on success
        setName("");
        setWorkEmail("");
        setCompany("");
        setEmployees("");
        setServices("Managed IT & Cloud");
        setMessage("");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {/* Honeypot – hidden from humans */}
      <input
        type="text"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-700"
        >
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="Calix St Hilaire"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700"
        >
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="you@company.com"
          value={workEmail}
          onChange={(e) => setWorkEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label
          htmlFor="company"
          className="block text-sm font-medium text-slate-700"
        >
          Company
        </label>
        <input
          id="company"
          name="company"
          type="text"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="Your company name"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="employees"
            className="block text-sm font-medium text-slate-700"
          >
            # of employees
          </label>
          <input
            id="employees"
            name="employees"
            type="text"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="e.g. 25"
            value={employees}
            onChange={(e) => setEmployees(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="services"
            className="block text-sm font-medium text-slate-700"
          >
            Interested in
          </label>
          <select
            id="services"
            name="services"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            value={services}
            onChange={(e) => setServices(e.target.value)}
          >
            <option>Managed IT & Cloud</option>
            <option>Cybersecurity</option>
            <option>VoIP & Communications</option>
            <option>AI & Automation</option>
            <option>Full XilAire Platform</option>
            <option>Not sure yet</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-slate-700"
        >
          How can we help?
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="Share a bit about your current setup and goals."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>

      {/* Status messages */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {warning && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {warning}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending…" : "Submit request"}
      </button>
    </form>
  );
}
