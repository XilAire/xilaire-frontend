// apps/xilaire-security/app/faq/page.tsx

"use client";

import { useState } from "react";
import Link from "next/link";

const FAQ_ITEMS = [
  {
    q: "Are your courses approved for Florida Class D and Class G licenses?",
    a: "XilAire Security courses are built to align with Florida FDACS training requirements for Class D (40 hours) and Class G (28 hours + 4-hour annual refresher). Completion of training does not automatically grant a license — you must still apply directly with FDACS and meet all state requirements.",
  },
  {
    q: "Are the courses 100% online?",
    a: "Class D and refresher content is delivered fully online through our training platform. Class G includes required classroom hours online plus an in-person live-fire qualification with a licensed Class K firearms instructor.",
  },
  {
    q: "How long do I have access to my course?",
    a: "You can log in 24/7 and work at your own pace during your active access period. Most students complete the initial Class D course within 1–2 weeks depending on their schedule.",
  },
  {
    q: "Do I get a certificate when I finish?",
    a: "Yes. After you complete all modules and required quizzes, the system generates a course completion certificate you can download and submit with your license application.",
  },
  {
    q: "Do I need any prior security or firearms experience?",
    a: "No prior experience is required for Class D. For Class G, you must meet all state eligibility requirements and be comfortable safely handling a firearm under the supervision of a licensed instructor.",
  },
  {
    q: "What is your refund policy?",
    a: (
      <>
        Please review our full{" "}
        <Link
          href="/legal/refund-policy"
          className="font-medium text-[#D4A017] underline-offset-2 hover:underline"
        >
          Refund Policy
        </Link>{" "}
        for details. In general, once you have significantly accessed course
        content or downloaded materials, refunds may be limited or unavailable.
      </>
    ),
  },
  {
    q: "Can I take the course on my phone or tablet?",
    a: "Yes. The training platform is mobile-friendly and works on modern phones, tablets, and laptops with a stable internet connection.",
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <header className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-900/70">
          Help &amp; Support
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0a233f]">
          Frequently Asked Questions
        </h1>
        <p className="max-w-2xl text-sm md:text-base text-slate-700">
          Answers to common questions about XilAire Security&apos;s online Class
          D and Class G training programs. If you don&apos;t see your question,
          please reach out using our{" "}
          <Link
            href="/contact"
            className="font-medium text-[#D4A017] underline-offset-2 hover:underline"
          >
            contact form
          </Link>
          .
        </p>
      </header>

      <section className="space-y-3">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <div
              key={item.q}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Question row */}
              <button
                type="button"
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-4 text-left"
                aria-expanded={isOpen}
              >
                <h2 className="text-sm md:text-base font-semibold text-[#0a233f]">
                  {item.q}
                </h2>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    isOpen
                      ? "border-[#0a233f] bg-[#0a233f] text-white"
                      : "border-slate-300 bg-slate-50 text-slate-700"
                  }`}
                >
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {/* Answer block */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isOpen ? "max-h-96 px-4 pb-4 md:px-5 md:pb-5" : "max-h-0 px-4 md:px-5"
                }`}
              >
                {isOpen && (
                  <div className="pt-1 text-sm text-slate-700">
                    {item.a}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
