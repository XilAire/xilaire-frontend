"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type LicenseTier = "standard" | "premium";

type CapabilityRow = [
  label: string,
  core: boolean,
  advanced: boolean,
  premiumRequired?: boolean
];

const capabilityMatrix: CapabilityRow[] = [
  ["Device protection & monitoring", true, true],
  ["Microsoft 365 setup & support", true, true],
  ["Backup & recovery", true, true],
  ["Usage & health reporting", true, true],

  // Premium-gated
  ["Identity & account security", false, true, true],
  ["Automated device onboarding", false, true, true],
  ["Security alerts & remediation", false, true, true],
];

export default function IndividualServices() {
  const [license, setLicense] = useState<LicenseTier>("standard");
  const isPremium = license === "premium";

  return (
    <div className="space-y-32">

      {/* =========================
          LICENSE SELECTOR
      ========================= */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          What Microsoft 365 license do you have?
        </h2>
        <p className="text-slate-600 text-sm">
          Service availability is based on your Microsoft 365 license.
        </p>

        <div className="flex gap-3">
          <Button
            variant={license === "standard" ? "primary" : "outline"}
            onClick={() => setLicense("standard")}
          >
            Business Standard
          </Button>

          <Button
            variant={license === "premium" ? "primary" : "outline"}
            onClick={() => setLicense("premium")}
          >
            Business Premium
          </Button>
        </div>
      </section>

      {/* =========================
          SERVICE TIERS
      ========================= */}
      <section className="space-y-12">
        <header className="max-w-3xl space-y-4">
          <h2 className="text-2xl font-semibold">Individual service tiers</h2>
          <p className="text-slate-600">
            Professional-grade IT support for individuals, freelancers, and
            households — aligned to your Microsoft 365 license.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2 items-stretch">

          {/* CORE */}
          <Card className="flex flex-col justify-between p-8">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Core</h3>
              <p className="text-sm text-slate-600">
                Essential support for everyday technology.
              </p>

              <ul className="space-y-3 text-sm">
                {[
                  "Device protection & monitoring",
                  "Microsoft 365 setup & support",
                  "Backup & recovery",
                  "Usage & health reporting",
                ].map(item => (
                  <li key={item} className="flex gap-3">
                    <span className="text-sky-600">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Button className="mt-10 w-full">
              Start Core
            </Button>
          </Card>

          {/* ADVANCED */}
          <Card className="relative flex flex-col justify-between p-8 border-2 border-sky-500 shadow-lg">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-600 px-3 py-1 text-xs text-white font-semibold">
              Requires Business Premium
            </span>

            <div className="space-y-6 pt-4">
              <h3 className="text-lg font-semibold text-sky-600">
                Advanced
              </h3>
              <p className="text-sm text-slate-600">
                Security-first automation and proactive protection.
              </p>

              <ul className="space-y-3 text-sm">
                {[
                  "Everything in Core",
                  "Identity & account security",
                  "Automated device onboarding",
                  "Security alerts & remediation",
                  "Advanced health reporting",
                ].map(item => (
                  <li
                    key={item}
                    className={`flex gap-3 ${
                      !isPremium && item !== "Everything in Core"
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    <span className="text-sky-600">
                      {!isPremium && item !== "Everything in Core" ? "🔒" : "✓"}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {isPremium ? (
              <Button className="mt-10 w-full bg-sky-600 hover:bg-sky-700">
                Start Advanced
              </Button>
            ) : (
              <Button className="mt-10 w-full" variant="outline">
                Upgrade to Business Premium
              </Button>
            )}
          </Card>

        </div>
      </section>

      {/* =========================
          COMPARISON TABLE
      ========================= */}
      <section className="space-y-8">
        <h2 className="text-xl font-semibold">
          Compare individual capabilities
        </h2>

        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Capability</th>
                <th className="px-4 py-3 text-center">Core</th>
                <th className="px-4 py-3 text-center text-sky-600">
                  Advanced
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {capabilityMatrix.map(([label, core, adv, premium]) => (
                <tr key={label}>
                  <td className="px-4 py-3">
                    {label}
                    {premium && (
                      <span className="ml-2 text-xs text-slate-400">
                        (Business Premium)
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {core ? "✓" : "—"}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {adv ? (premium && !isPremium ? "🔒" : "✓") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
