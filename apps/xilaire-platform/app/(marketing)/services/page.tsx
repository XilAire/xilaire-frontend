import type { Metadata } from "next";
import ServicesClient from "./ServicesClient";

export const metadata: Metadata = {
  title: "XilAire | Services",
  description:
    "Cloud, managed IT, cybersecurity, and automation — tailored to how you work.",
};

export default function ServicesPage() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-20 space-y-16 text-slate-900">

        {/* =====================================================
            PAGE INTRO (SERVER-RENDERED)
        ===================================================== */}
        <header className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-bold">
            Services built around{" "}
            <span className="text-sky-600">how you operate</span>
          </h1>

          <p className="text-slate-600">
            XilAire adapts its platform based on whether you’re managing personal
            technology or running a business — delivering the right tools,
            automation, and support for your needs.
          </p>
        </header>

        {/* =====================================================
            EXPERIENCE-AWARE CONTENT (CLIENT)
        ===================================================== */}
        <ServicesClient />

      </div>
    </section>
  );
}
