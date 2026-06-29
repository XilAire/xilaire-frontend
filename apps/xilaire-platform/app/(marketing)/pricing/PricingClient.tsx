"use client";

import { useEffect, useState } from "react";
import IndividualPricing from "./individual/PricingIndividual";
import BusinessPricing from "./business/PricingBusiness";
import ExperienceFallback from "../services/ExperienceFallback";

type Experience = "individual" | "business" | null;

export default function PricingClient() {
  const [experience, setExperience] = useState<Experience>(null);

  useEffect(() => {
    const stored = localStorage.getItem("xilaire_experience");
    if (stored === "individual" || stored === "business") {
      setExperience(stored);
    }
  }, []);

  if (!experience) {
    return <ExperienceFallback />;
  }

  return experience === "individual"
    ? <IndividualPricing />
    : <BusinessPricing />;
}
