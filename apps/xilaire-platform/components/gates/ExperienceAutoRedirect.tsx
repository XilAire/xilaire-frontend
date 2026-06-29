"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredExperience } from "@/lib/experience";

export default function ExperienceAutoRedirect() {
  const router = useRouter();

  useEffect(() => {
    const experience = getStoredExperience();
    if (!experience) return;

    router.replace(`/experience/${experience}`);
  }, [router]);

  return null;
}