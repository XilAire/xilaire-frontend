/* -------------------------------------------------
   EXPERIENCE + TIER STORAGE (CLIENT)
------------------------------------------------- */

export type XilAireExperience = "individual" | "business" | "vendor";
export type XilAireTier = "core" | "advanced" | "enterprise";

/* -------------------------------------------------
   STORAGE KEYS (NAMESPACED)
------------------------------------------------- */

const EXPERIENCE_KEY = "xilaire_experience";
const TIER_KEY = "xilaire_tier";

/* -------------------------------------------------
   EXPERIENCE
------------------------------------------------- */

export function getStoredExperience(): XilAireExperience | null {
  if (typeof window === "undefined") return null;

  const value = localStorage.getItem(EXPERIENCE_KEY);

  if (
    value === "individual" ||
    value === "business" ||
    value === "vendor"
  ) {
    return value;
  }

  return null;
}

export function setStoredExperience(value: XilAireExperience) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EXPERIENCE_KEY, value);
}

export function clearStoredExperience() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(EXPERIENCE_KEY);
}

/* -------------------------------------------------
   TIER
------------------------------------------------- */

export function getStoredTier(): XilAireTier {
  if (typeof window === "undefined") return "core";

  const value = localStorage.getItem(TIER_KEY);

  if (value === "advanced" || value === "enterprise") {
    return value;
  }

  return "core";
}

export function setStoredTier(value: XilAireTier) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TIER_KEY, value);
}

export function clearStoredTier() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TIER_KEY);
}