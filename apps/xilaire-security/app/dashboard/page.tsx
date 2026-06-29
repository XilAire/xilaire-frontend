"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

type Profile = {
  id: string;
  full_name: string | null;
  role: "student" | "admin" | string;
};

type EnrollmentRow = {
  course_id: string;
  progress: number | null;
  completed_at: string | null;
  courses: {
    id: string;
    slug: string | null;
    title: string;
    subtitle: string | null;
    hours: number | null;
  } | null;
};

type CertificateRow = {
  id: string;
  course_id: string;
};

type DashboardCourse = {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  hours: number | null;
  progress: number;
  completed_at: string | null;
  certificate_id: string | null;
};

export default function StudentDashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
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
        setError(userError.message);
        setIsLoading(false);
        return;
      }

      if (!user) {
        setError("You must be signed in to view your dashboard.");
        setIsLoading(false);
        return;
      }

      // 2) Load profile (for name + role)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle<Profile>();

      if (profileError) {
        console.error("Error loading profile:", profileError);
        setError(profileError.message);
        setIsLoading(false);
        return;
      }

      if (profileData) {
        setProfile(profileData);
      }

      // 3) Load enrollments for this user
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select(
          `
          course_id,
          progress,
          completed_at,
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
        .order("created_at", { ascending: true });

      if (enrollmentsError) {
        console.error("Error loading enrollments:", enrollmentsError);
        setError(enrollmentsError.message);
        setIsLoading(false);
        return;
      }

      // Normalize nested courses (Supabase returns arrays for joins)
      const rawEnrollments = (enrollmentsData ?? []) as any[];

      const enrollments: EnrollmentRow[] = rawEnrollments.map((row) => {
        const course = Array.isArray(row.courses)
          ? row.courses[0]
          : row.courses;

        return {
          course_id: row.course_id,
          progress: row.progress,
          completed_at: row.completed_at,
          courses: course
            ? {
                id: course.id,
                slug: course.slug,
                title: course.title,
                subtitle:
                  course.subtitle !== undefined ? course.subtitle : null,
                hours:
                  course.hours !== undefined ? course.hours : null,
              }
            : null,
        };
      });

      // 4) Load certificates for this user and map by course
      const {
        data: certsData,
        error: certsError,
      } = await supabase
        .from("certificates")
        .select("id, course_id")
        .eq("user_id", user.id);

      if (certsError) {
        console.error("Error loading certificates:", certsError);
        setError(certsError.message);
        setIsLoading(false);
        return;
      }

      const certs = (certsData ?? []) as CertificateRow[];
      const certByCourse = new Map<string, string>();
      for (const c of certs) {
        certByCourse.set(c.course_id, c.id);
      }

      // 5) Build dashboard course list
      const dashCourses: DashboardCourse[] = enrollments
        .filter((e) => e.courses) // only courses that still exist
        .map((e) => {
          const c = e.courses!;
          return {
            id: c.id,
            slug: c.slug,
            title: c.title,
            subtitle: c.subtitle,
            hours: c.hours,
            progress: e.progress ?? 0,
            completed_at: e.completed_at,
            certificate_id: certByCourse.get(e.course_id) ?? null,
          };
        });

      setCourses(dashCourses);
      setIsLoading(false);
    };

    load();
  }, []);

  const handleGoToCourse = (c: DashboardCourse) => {
    if (!c.slug) return;
    router.push(`/courses/${c.slug}`);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {profile?.full_name
              ? `Welcome, ${profile.full_name}`
              : "My Training Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            View your enrolled courses, track progress, and access your
            certificates.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href={{ pathname: "/certificates" }}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            My certificates
          </Link>

          {profile?.role === "admin" && (
            <>
              <Link
                href={{ pathname: "/admin/progress" }}
                className="rounded-md border px-3 py-1.5 hover:bg-muted"
              >
                Admin: course progress
              </Link>
              <Link
                href={{ pathname: "/admin/certificates" }}
                className="rounded-md border px-3 py-1.5 hover:bg-muted"
              >
                Admin: certificates
              </Link>
            </>
          )}
        </div>
      </header>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading your courses…</p>
      )}

      {error && (
        <p className="mb-4 text-sm text-red-600">Error: {error}</p>
      )}

      {!isLoading && !error && courses.length === 0 && (
        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            You are not enrolled in any courses yet.
          </p>
        </section>
      )}

      {!isLoading && !error && courses.length > 0 && (
        <section className="space-y-4">
          {courses.map((c) => {
            const progress = Math.round(c.progress);
            const isComplete = progress >= 100 || !!c.completed_at;

            return (
              <div
                key={c.id}
                className="rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-semibold">{c.title}</h2>
                    {c.subtitle && (
                      <p className="text-xs text-muted-foreground">
                        {c.subtitle}
                      </p>
                    )}
                    {c.hours != null && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.hours} training hour{c.hours === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>
                      Progress:{" "}
                      <span className="font-medium">{progress}%</span>
                    </p>
                    <p>
                      Status:{" "}
                      <span className="font-medium">
                        {isComplete ? "Completed" : "In progress"}
                      </span>
                    </p>
                    {c.completed_at && (
                      <p className="mt-1">
                        Completed:{" "}
                        {new Date(c.completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, Math.max(0, progress))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    disabled={!c.slug}
                    onClick={() => handleGoToCourse(c)}
                    className="rounded-md border px-3 py-1.5 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isComplete ? "Review course" : "Resume course"}
                  </button>

                  {c.certificate_id && (
                    <Link
                      href={`/certificates/${c.certificate_id}`}
                      className="rounded-md border px-3 py-1.5 hover:bg-muted"
                    >
                      View certificate
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
