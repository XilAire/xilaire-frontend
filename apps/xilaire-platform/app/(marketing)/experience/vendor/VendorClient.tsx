"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { setStoredExperience } from "@/lib/experience";

export default function VendorClient() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-24 space-y-20">
        <header className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-bold">
            Built for trusted{" "}
            <span className="text-amber-600">vendor partners</span>
          </h1>

          <p className="text-slate-600">
            Join the XilAire vendor network to receive project invitations,
            confirm site visits, submit estimates, upload invoices, and keep
            your company profile and documents current.
          </p>
        </header>

        <section className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Project Opportunities",
              items: [
                "Receive bid invitations",
                "Review project scope details",
                "Track awarded and active jobs",
              ],
            },
            {
              title: "Site Visits & Estimating",
              items: [
                "Confirm walkthrough requests",
                "Submit estimates and revisions",
                "Track estimate review status",
              ],
            },
            {
              title: "Invoices & Compliance",
              items: [
                "Upload invoices and backup",
                "Maintain company documents",
                "Stay current on vendor requirements",
              ],
            },
          ].map((card) => (
            <Card key={card.title} className="p-8 space-y-4">
              <h3 className="text-lg font-semibold">{card.title}</h3>

              <ul className="space-y-3 text-sm text-slate-600">
                {card.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-amber-600">✓</span>
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
              setStoredExperience("vendor");
              window.location.href = "/auth/signup?experience=vendor";
            }}
          >
            Join as a vendor
          </Button>

          <Link href="/">
            <Button variant="outline">Back to home</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}