"use client";

import { useEffect, useState } from "react";
import { getStoredExperience } from "@/lib/experience";

import IndividualServices from "./IndividualServices";
import BusinessServices from "./BusinessServices";
import ExperienceFallback from "./ExperienceFallback";

type Experience = "individual" | "business";

export default function ServicesClient() {
  const [experience, setExperience] = useState<Experience | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setExperience(getStoredExperience());
    setMounted(true);
  }, []);

  // 🔒 Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  if (!experience) {
    return <ExperienceFallback />;
  }

  return experience === "individual"
    ? <IndividualServices />
    : <BusinessServices />;
}
