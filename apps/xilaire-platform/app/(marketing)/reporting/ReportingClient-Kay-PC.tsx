"use client";

import { useEffect, useState } from "react";

import ReportingCore from "./business/ReportingCore";
import ReportingAdvanced from "./business/ReportingAdvanced";
import ReportingEnterprise from "./business/ReportingEnterprise";
import ExperienceFallback from "../services/ExperienceFallback";

import {
  getStoredExperience,
  getStoredTier,
  XilAireExperience,
  XilAireTier,
} from "@/lib/experience";

export default function ReportingClient() {
  const [experience, setExperience] = useState<XilAireExperience | null>(null);
  const [tier, setTier] = useState<XilAireTier>("core");

  useEffect(() => {
    setExperience(getStoredExperience());
    setTier(getStoredTier());
  }, []);

  /* -------------------------------------------
     EXPERIENCE GUARD
  ------------------------------------------- */
  if (!experience) {
    return <ExperienceFallback />;
  }

  /* -------------------------------------------
     TIER-BASED VISIBILITY
  ------------------------------------------- */
  if (tier === "enterprise") {
    return <ReportingEnterprise />;
  }

  if (tier === "advanced") {
    return <ReportingAdvanced />;
  }

  return <ReportingCore />;
}
