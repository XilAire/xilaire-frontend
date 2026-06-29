"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Building2, Briefcase } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  setStoredExperience,
  type XilAireExperience,
} from "@/lib/experience";

export default function ExperienceSelector() {
  const [selection, setSelection] = useState<XilAireExperience | null>(null);
  const router = useRouter();

  function handleContinue() {
    if (!selection) return;

    setStoredExperience(selection);
    router.push(`/experience/${selection}`);
  }

  return (
    <section className="mt-24 space-y-10 text-center">
      <div>
        <h2 className="text-2xl font-semibold">
          Choose your XilAire experience
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          We’ll tailor services, onboarding, and automation to how you operate.
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        <Card
          onClick={() => setSelection("individual")}
          className={`cursor-pointer border p-6 transition ${
            selection === "individual"
              ? "border-sky-500 bg-sky-50"
              : "hover:border-slate-400"
          }`}
        >
          <User className="h-6 w-6 text-sky-600" />
          <h3 className="mt-3 font-semibold">Individual</h3>
          <p className="mt-1 text-sm text-slate-600">
            Personal IT support, Microsoft 365, and security for professionals.
          </p>
        </Card>

        <Card
          onClick={() => setSelection("business")}
          className={`cursor-pointer border p-6 transition ${
            selection === "business"
              ? "border-emerald-500 bg-emerald-50"
              : "hover:border-slate-400"
          }`}
        >
          <Building2 className="h-6 w-6 text-emerald-600" />
          <h3 className="mt-3 font-semibold">Business</h3>
          <p className="mt-1 text-sm text-slate-600">
            Managed IT, cloud, cybersecurity, automation, and scalable operations.
          </p>
        </Card>

        <Card
          onClick={() => setSelection("vendor")}
          className={`cursor-pointer border p-6 transition ${
            selection === "vendor"
              ? "border-amber-500 bg-amber-50"
              : "hover:border-slate-400"
          }`}
        >
          <Briefcase className="h-6 w-6 text-amber-600" />
          <h3 className="mt-3 font-semibold">Vendor</h3>
          <p className="mt-1 text-sm text-slate-600">
            Join the XilAire network to manage bid requests, site visits, estimates, and invoices.
          </p>
        </Card>
      </div>

      <Button
        onClick={handleContinue}
        disabled={!selection}
        className="mx-auto"
      >
        Continue →
      </Button>

      <p className="text-xs text-slate-500">
        You can switch experiences at any time.
      </p>
    </section>
  );
}