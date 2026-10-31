"use client";

import { useEffect, useState } from "react";
import { getStoredExperience, type XilAireExperience } from "@/lib/experience";

import IndividualServices from "./IndividualServices";
import BusinessServices from "./BusinessServices";
import ExperienceFallback from "./ExperienceFallback";



export default function ServicesClient() {
  const [experience, setExperience] = useState<XilAireExperience | null>(null);
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

  if (experience === "individual") {
    return <IndividualServices />;
  }

  if (experience === "business") {
    return <BusinessServices />;
  }

  return <ExperienceFallback />;
}
