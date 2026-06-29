import type { Metadata } from "next";
import Card from "@/components/ui/Card";
import ExperienceSelector from "@/components/gates/ExperienceSelector";
import ExperienceAutoRedirect from "@/components/gates/ExperienceAutoRedirect";

export const metadata: Metadata = {
  title: "XilAire Technologies | Cloud, Managed IT & AI Automation",
  description:
    "XilAire Technologies delivers cloud services, managed IT, cybersecurity, and AI-powered automation through a unified platform for individuals and modern businesses.",
};

export default function MarketingHomePage() {
  return (
    <>
      {/* 🔁 Auto-redirect returning users (CLIENT ONLY) */}
      <ExperienceAutoRedirect />

      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 text-slate-900 space-y-28">
          {/* =====================================================
              HERO / VALUE PROPOSITION
          ===================================================== */}
          <div className="grid gap-12 md:grid-cols-[2fr,1.6fr] md:items-start">
            {/* Left: Message */}
            <div className="pt-2">
              <span className="inline-block rounded-full border border-sky-500/40 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-600">
                Cloud • Managed IT • Security • Automation
              </span>

              <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
                Turn your IT into a{" "}
                <span className="text-sky-600">managed SaaS platform.</span>
              </h1>

              <p className="mt-5 max-w-xl text-slate-600">
                XilAire replaces fragmented tools and reactive support with a
                unified, automation-first platform — giving you predictable IT,
                real operational visibility, and enterprise-grade control.
              </p>
            </div>

            {/* Right: Platform Snapshot */}
            <div className="md:pt-8">
              <Card className="bg-white border border-slate-200 shadow-sm px-8 py-7">
                <h3 className="text-sm font-semibold text-slate-900">
                  Platform snapshot
                </h3>

                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <li>• Managed endpoints, users, and identities</li>
                  <li>• Automated onboarding, remediation, and alerts</li>
                  <li>• Unified helpdesk, operations, and reporting</li>
                  <li>• Compliance-ready audit trails and governance</li>
                </ul>

                <p className="mt-5 text-xs text-slate-500">
                  Live metrics and automation data will surface here once
                  connected.
                </p>
              </Card>
            </div>
          </div>

          {/* =====================================================
              CONTEXT / TRANSITION
          ===================================================== */}
          <div className="max-w-3xl text-center mx-auto space-y-4">
            <h2 className="text-2xl font-semibold">
              One platform — tailored to how you operate
            </h2>
            <p className="text-slate-600">
              XilAire adapts its workflows, automation, and tooling based on who
              you are and how you work. Choose the experience that best fits your
              needs — you can switch at any time.
            </p>
          </div>

          {/* =====================================================
              EXPERIENCE GATE
          ===================================================== */}
          <div id="choose-experience">
            <ExperienceSelector />
          </div>
        </div>
      </section>
    </>
  );
}
