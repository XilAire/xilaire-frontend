"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_SECURITY!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SECURITY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Brand colors (logo)
const brand = {
  navy: "#0A233F",
  gold: "#C8962E",
};

type CertificateRow = {
  id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
  expires_at: string | null;
  hours_completed: number | null;
  fdacs_code: string | null;
  courses: {
    id: string;
    slug: string | null;
    title: string;
    subtitle: string | null;
    hours: number | null;
  } | null;
};

export default function CertificatesPage() {
  const [certs, setCerts] = useState<CertificateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      // 1) Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        setError("Unable to load your account. Please try again.");
        setIsLoading(false);
        return;
      }

      if (!user) {
        setError("You must be signed in to view your certificates.");
        setIsLoading(false);
        return;
      }

      // 2) Load certificates for this user (RLS-safe)
      const { data, error: certsError } = await supabase
        .from("certificates")
        .select(
          `
          id,
          course_id,
          certificate_number,
          issued_at,
          expires_at,
          hours_completed,
          fdacs_code,
          courses:courses (
            id,
            slug,
            title,
            subtitle,
            hours
          )
        `
        )
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      if (certsError) {
        console.error("Error loading certificates:", certsError);
        setError("Unable to load your certificates. Please try again.");
        setIsLoading(false);
        return;
      }

      const raw = (data ?? []) as any[];

      const normalized: CertificateRow[] = raw.map((row) => {
        const course = Array.isArray(row.courses)
          ? row.courses[0]
          : row.courses;

        return {
          id: row.id,
          course_id: row.course_id,
          certificate_number: row.certificate_number,
          issued_at: row.issued_at,
          expires_at: row.expires_at ?? null,
          hours_completed:
            row.hours_completed !== undefined ? row.hours_completed : null,
          fdacs_code: row.fdacs_code ?? null,
          courses: course
            ? {
                id: course.id,
                slug: course.slug ?? null,
                title: course.title,
                subtitle:
                  course.subtitle !== undefined ? course.subtitle : null,
                hours: course.hours !== undefined ? course.hours : null,
              }
            : null,
        };
      });

      setCerts(normalized);
      setIsLoading(false);
    };

    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Page header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: brand.navy }}>
          My Certificates
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          View, download, and print certificates you&apos;ve earned through
          XilAire Security training.
        </p>
      </header>

      {/* States */}
      {isLoading && (
        <p className="text-sm text-gray-500">Loading certificates…</p>
      )}

      {!isLoading && error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && !error && certs.length === 0 && (
        <section className="rounded-2xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
          You don&apos;t have any certificates yet. Complete a course to
          generate your first certificate.
        </section>
      )}

      {!isLoading && !error && certs.length > 0 && (
        <section className="space-y-4">
          {certs.map((c) => (
            <article
              key={c.id}
              className="rounded-2xl border bg-white p-5 shadow-sm"
            >
              {/* Top row: course info + issued/expires */}
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2
                    className="text-base font-semibold"
                    style={{ color: brand.navy }}
                  >
                    {c.courses?.title ?? "Security Training Course"}
                  </h2>

                  {c.courses?.subtitle && (
                    <p className="text-xs text-gray-500">
                      {c.courses.subtitle}
                    </p>
                  )}

                  {c.courses?.hours != null && (
                    <p className="mt-1 text-xs text-gray-500">
                      {c.courses.hours} training hour
                      {c.courses.hours === 1 ? "" : "s"}
                    </p>
                  )}
                </div>

                <div className="text-right text-xs text-gray-500">
                  <p>
                    <span className="font-medium text-gray-700">
                      Certificate #:
                    </span>{" "}
                    <span className="font-mono">
                      {c.certificate_number}
                    </span>
                  </p>
                  <p className="mt-1">
                    <span className="font-medium text-gray-700">Issued:</span>{" "}
                    {new Date(c.issued_at).toLocaleDateString()}
                  </p>
                  {c.expires_at && (
                    <p>
                      <span className="font-medium text-gray-700">
                        Expires:
                      </span>{" "}
                      {new Date(c.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Meta row */}
              <div className="mb-3 text-xs text-gray-500 space-y-0.5">
                {c.hours_completed != null && (
                  <p>
                    <span className="font-medium text-gray-700">
                      Hours credited:
                    </span>{" "}
                    {c.hours_completed}
                  </p>
                )}
                {c.fdacs_code && (
                  <p>
                    <span className="font-medium text-gray-700">
                      FDACS course code:
                    </span>{" "}
                    <span className="font-mono">{c.fdacs_code}</span>
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 text-xs">
                {/* View / print certificate */}
                <Link
                  href={`/certificates/${c.id}`}
                  className="inline-flex items-center rounded-md px-4 py-2 font-medium text-white shadow-sm"
                  style={{
                    background: `linear-gradient(90deg, ${brand.gold}, ${brand.navy})`,
                  }}
                >
                  View / Print certificate
                </Link>

                {/* Review course – uses existing /courses/[courseId] route */}
                <Link
                  href={`/courses/${encodeURIComponent(c.course_id)}`}
                  className="rounded-md border px-3 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Review course
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
