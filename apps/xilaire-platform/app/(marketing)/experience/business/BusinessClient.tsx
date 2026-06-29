"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { setStoredExperience } from "@/lib/experience";

export default function BusinessExperienceClient() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-24 space-y-20">

        <header className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-bold">
            IT operations built for{" "}
            <span className="text-sky-600">business</span>
          </h1>
          <p className="text-slate-600">
            Secure, automate, and govern your IT environment with a platform
            built to scale.
          </p>
        </header>

        <section className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Operations",
              items: [
                "Managed devices & users",
                "Unified helpdesk",
                "Microsoft 365 administration",
              ],
            },
            {
              title: "Security & Compliance",
              items: [
                "Endpoint security",
                "Identity protection",
                "Audit-ready logs",
              ],
            },
            {
              title: "Automation & Insights",
              items: [
                "Automated onboarding",
                "Alerting & remediation",
                "Executive dashboards",
              ],
            },
          ].map(card => (
            <Card key={card.title} className="p-8 space-y-4">
              <h3 className="text-lg font-semibold">{card.title}</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                {card.items.map(item => (
                  <li key={item} className="flex gap-3">
                    <span className="text-sky-600">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </section>

        <div className="flex gap-4">
          <Button
            onClick={() => {
              setStoredExperience("business");
              window.location.href =
                "/auth/signup?experience=business";
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
