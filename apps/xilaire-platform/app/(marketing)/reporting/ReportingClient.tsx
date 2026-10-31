
"use client";

/**
 * ============================================================
 * XILAIRE TECHNOLOGIES
 * XILAIRE PLATFORM
 *
 * REPORTING CLIENT
 *
 * Retrieves reporting data through:
 * GET /api/reporting/core
 *
 * No direct imports of server-only functions.
 * ============================================================
 */

import { useEffect, useState } from "react";

import ReportingCore from "./business/ReportingCore";
import ReportingAdvanced from "./business/ReportingAdvanced";
import ReportingEnterprise from "./business/ReportingEnterprise";
import ExperienceFallback from "../services/ExperienceFallback";

import type { CoreReportingSnapshot } from "@/lib/reporting/getCoreReportingSnapshot";

type Experience = "individual" | "business" | null;
type Tier = "core" | "advanced" | "enterprise";

export default function ReportingClient() {
  const [experience, setExperience] = useState<Experience>(null);
  const [tier, setTier] = useState<Tier>("core");

  const [snapshot, setSnapshot] =
    useState<CoreReportingSnapshot | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // --------------------------------------------------------
    // RESTORE USER EXPERIENCE
    // --------------------------------------------------------

    const storedExperience = localStorage.getItem(
      "xilaire_experience"
    );

    if (
      storedExperience === "individual" ||
      storedExperience === "business"
    ) {
      setExperience(storedExperience);
    }

    // --------------------------------------------------------
    // RESTORE SERVICE TIER
    // --------------------------------------------------------

    const storedTier = localStorage.getItem("xilaire_tier");

    if (
      storedTier === "core" ||
      storedTier === "advanced" ||
      storedTier === "enterprise"
    ) {
      setTier(storedTier);
    }

    // --------------------------------------------------------
    // FETCH AUTHENTICATED REPORTING SNAPSHOT
    // --------------------------------------------------------

    const controller = new AbortController();

    async function loadSnapshot() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/reporting/core", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Your session has expired. Please sign in again."
            );
          }

          if (response.status === 403) {
            throw new Error(
              "Your account does not have an organization assigned."
            );
          }

          throw new Error(
            "Unable to retrieve reporting data."
          );
        }

        const data =
          (await response.json()) as CoreReportingSnapshot;

        if (!controller.signal.aborted) {
          setSnapshot(data);
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Reporting snapshot request failed:", err);

        setError(
          err instanceof Error
            ? err.message
            : "An unexpected reporting error occurred."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadSnapshot();

    return () => {
      controller.abort();
    };
  }, []);

  // ----------------------------------------------------------
  // EXPERIENCE GUARD
  // ----------------------------------------------------------

  if (!experience) {
    return <ExperienceFallback />;
  }

  // ----------------------------------------------------------
  // LOADING STATE
  // ----------------------------------------------------------

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-sm text-slate-500">
          Loading reporting data...
        </p>
      </section>
    );
  }

  // ----------------------------------------------------------
  // ERROR STATE
  // ----------------------------------------------------------

  if (error) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6"
        >
          <h2 className="text-lg font-semibold text-red-800">
            Reporting unavailable
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {error}
          </p>
        </div>
      </section>
    );
  }

  // ----------------------------------------------------------
  // EMPTY DATA STATE
  // ----------------------------------------------------------

  if (!snapshot) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-sm text-slate-500">
          No reporting data is currently available.
        </p>
      </section>
    );
  }

  // ----------------------------------------------------------
  // TIER-BASED REPORTING
  // ----------------------------------------------------------

  if (tier === "enterprise") {
    return <ReportingEnterprise snapshot={snapshot} />;
  }

  if (tier === "advanced") {
    return <ReportingAdvanced snapshot={snapshot} />;
  }

  return <ReportingCore snapshot={snapshot} />;
}
