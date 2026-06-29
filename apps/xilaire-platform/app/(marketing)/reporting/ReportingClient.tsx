"use client";

import { useEffect, useState } from "react";

import ReportingCore from "./business/ReportingCore";
import ReportingAdvanced from "./business/ReportingAdvanced";
import ReportingEnterprise from "./business/ReportingEnterprise";
import ExperienceFallback from "../services/ExperienceFallback";

import type { CoreReportingSnapshot } from "@/lib/reporting/getCoreReportingSnapshot";
import { getCoreReportingSnapshot } from "@/lib/reporting/getCoreReportingSnapshot";

type Experience = "individual" | "business" | null;
type Tier = "core" | "advanced" | "enterprise";

export default function ReportingClient() {
  const [experience, setExperience] = useState<Experience>(null);
  const [tier, setTier] = useState<Tier>("core");
  const [snapshot, setSnapshot] = useState<CoreReportingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const exp = localStorage.getItem("xilaire_experience");
    if (exp === "individual" || exp === "business") {
      setExperience(exp);
    }

    const storedTier = localStorage.getItem("xilaire_tier") as Tier | null;
    if (storedTier) setTier(storedTier);

    // 🔹 Fetch Core snapshot once (tier-safe baseline)
    getCoreReportingSnapshot()
      .then(data => setSnapshot(data))
      .finally(() => setLoading(false));
  }, []);

  if (!experience) return <ExperienceFallback />;

  if (loading || !snapshot) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-sm text-slate-500">Loading reporting data…</p>
      </section>
    );
  }

  /* -------------------------------------------------
     🧱 TIER-BASED VISIBILITY
  ------------------------------------------------- */
  if (tier === "enterprise") {
    return <ReportingEnterprise snapshot={snapshot} />;
  }

  if (tier === "advanced") {
    return <ReportingAdvanced snapshot={snapshot} />;
  }

  return <ReportingCore snapshot={snapshot} />;
}
