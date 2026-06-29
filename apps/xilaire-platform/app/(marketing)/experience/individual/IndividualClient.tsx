"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { setStoredExperience } from "@/lib/experience";

export default function IndividualExperienceClient() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-24 space-y-20">

        {/* ================= HERO ================= */}
        <header className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-bold">
            IT support built for{" "}
            <span className="text-sky-600">individuals</span>
          </h1>
          <p className="text-slate-600">
            Secure your devices, manage Microsoft 365, and get expert support —
            without enterprise complexity.
          </p>
        </header>

        {/* ================= CARDS ================= */}
        <section className="grid gap-8 md:grid-cols-2">
          <Card className="p-8 space-y-4">
            <h3 className="text-lg font-semibold">What you get</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              {[
                "Personal device security & monitoring",
                "Microsoft 365 setup & support",
                "Backup & recovery",
                "Priority helpdesk access",
              ].map(item => (
                <li key={item} className="flex gap-3">
                  <span className="text-sky-600">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-8 space-y-4">
            <h3 className="text-lg font-semibold">Who it’s for</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Professionals, freelancers, families, and anyone who wants
              enterprise-grade IT without enterprise overhead.
            </p>
          </Card>
        </section>

        {/* ================= CTA ================= */}
        <div className="flex gap-4">
          <Button
            onClick={() => {
              setStoredExperience("individual");
              window.location.href =
                "/auth/signup?experience=individual";
            }}
          >
            Get started
          </Button>

          <Link href="/">
            <Button variant="outline">Back to home</Button>
          </Link>
        </div>

      </div>
    </section>
  );
}
