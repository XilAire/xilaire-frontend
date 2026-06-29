"use client";

import CertificateButton from "../components/CertificateButton";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient, type Session } from "@supabase/supabase-js";

// Supabase browser client (same env vars you already use elsewhere)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL_SECURITY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SECURITY!;

const supabase = createClient(URL, ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

type ModuleItem = {
  id: string;
  title: string;
  position: number | null;
  watched_percent: number;
  is_passed: boolean;
};

type CourseItem = {
  id: string;
  title: string;
  subtitle: string | null;
  progress: number; // overall %
  modules: ModuleItem[];
};

type ProgressData = {
  courses: CourseItem[];
};

type EnrollmentRow = {
  course_id: string;
  progress: number | null;
  completed_at: string | null;
  courses: {
    id: string;
    title: string;
    subtitle: string | null;
  } | null;
};

type ModuleRow = {
  id: string;
  title: string | null;
  position: number | null;
  course_id: string;
};

type ModuleProgressRow = {
  module_id: string;
  watched_percent: number | null;
  is_passed: boolean | null;
};

function moduleStatus(m: ModuleItem) {
  if (m.is_passed || m.watched_percent >= 100) return "Completed";
  if (m.watched_percent > 0) return "In progress";
  return "Not started";
}

export default function ProgressPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // 1) Ensure user is signed in
        const { data: sessData } = await supabase.auth.getSession();
        const currentSession = sessData.session ?? null;
        setSession(currentSession);

        if (!currentSession) {
          setError("You must be signed in to view your progress.");
          return;
        }

        // 2) Get enrollments (filtered by RLS to this user)
        const { data: enrollRows, error: enrollErr } = await supabase
          .from("enrollments")
          .select(
            "course_id, progress, completed_at, courses ( id, title, subtitle )"
          )
          .order("updated_at", { ascending: false });

        if (enrollErr) throw enrollErr;

        // Normalize Supabase rows into our EnrollmentRow shape
        const enrollments: EnrollmentRow[] = (enrollRows ?? []).map(
          (row: any) => {
            const rawCourse = Array.isArray(row.courses)
              ? row.courses[0]
              : row.courses;

            return {
              course_id: row.course_id,
              progress: row.progress,
              completed_at: row.completed_at,
              courses: rawCourse
                ? {
                    id: rawCourse.id,
                    title: rawCourse.title,
                    subtitle: rawCourse.subtitle,
                  }
                : null,
            };
          }
        );

        if (!enrollments.length) {
          setData({ courses: [] });
          return;
        }

        const courseIds = Array.from(
          new Set(enrollments.map((e) => e.course_id))
        );

        // 3) Get modules for those courses
        const { data: moduleRows, error: moduleErr } = await supabase
          .from("modules")
          .select("id, title, position, course_id")
          .in("course_id", courseIds);

        if (moduleErr) throw moduleErr;
        const modules = (moduleRows ?? []) as ModuleRow[];

        const moduleIds = modules.map((m) => m.id);
        if (!moduleIds.length) {
          const courses: CourseItem[] = enrollments
            .filter((e) => e.courses)
            .map((e) => ({
              id: e.courses!.id,
              title: e.courses!.title,
              subtitle: e.courses!.subtitle,
              progress: e.progress ?? 0,
              modules: [],
            }));
          setData({ courses });
          return;
        }

        // 4) Get per-module progress for this user
        const { data: progRows, error: progErr } = await supabase
          .from("modules_progress")
          .select("module_id, watched_percent, is_passed")
          .in("module_id", moduleIds);

        if (progErr) throw progErr;
        const progressRows = (progRows ?? []) as ModuleProgressRow[];

        const progressByModuleId = new Map<
          string,
          { watched_percent: number; is_passed: boolean }
        >();

        for (const p of progressRows) {
          progressByModuleId.set(p.module_id, {
            watched_percent: p.watched_percent ?? 0,
            is_passed: !!p.is_passed,
          });
        }

        // 5) Assemble final course list
        const courses: CourseItem[] = [];

        for (const e of enrollments) {
          if (!e.courses) continue;

          const courseModules = modules.filter(
            (m) => m.course_id === e.course_id
          );

          const moduleItems: ModuleItem[] = courseModules
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((m) => {
              const prog = progressByModuleId.get(m.id) ?? {
                watched_percent: 0,
                is_passed: false,
              };
              return {
                id: m.id,
                title: m.title ?? "Module",
                position: m.position,
                watched_percent: prog.watched_percent,
                is_passed: prog.is_passed,
              };
            });

          const totalModules = moduleItems.length || 1;
          const completedModules = moduleItems.filter(
            (m) => m.is_passed || m.watched_percent >= 100
          ).length;

          const computedPercent = Math.round(
            (completedModules / totalModules) * 100
          );

          courses.push({
            id: e.courses.id,
            title: e.courses.title,
            subtitle: e.courses.subtitle,
            progress: e.progress ?? computedPercent,
            modules: moduleItems,
          });
        }

        setData({ courses });
      } catch (err) {
        console.error(err);
        setError("Unable to load your progress right now.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-sm text-gray-500">Loading your progress…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 space-y-3">
        <p className="text-sm text-red-600">{error}</p>
        <Link
          href="/"
          className="text-xs underline underline-offset-2 text-gray-700"
        >
          ← Back to courses
        </Link>
      </main>
    );
  }

  const courses = data?.courses ?? [];

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">My Progress</h1>
        <p className="text-sm text-gray-600">
          Track your progress across all enrolled courses.
        </p>
        <div className="mt-2">
          <Link
            href="/"
            className="text-xs underline underline-offset-2 text-gray-700"
          >
            ← Back to courses
          </Link>
        </div>
      </header>

      {!session && (
        <p className="text-sm text-gray-500">
          You are not signed in. Please log in to view your progress.
        </p>
      )}

      {session && courses.length === 0 && (
        <p className="text-sm text-gray-500">
          You are not enrolled in any courses yet.
        </p>
      )}

      {session && courses.length > 0 && (
        <div className="space-y-4">
          {courses.map((course) => {
            const totalModules = course.modules.length || 1;
            const completedModules = course.modules.filter(
              (m) => m.is_passed || m.watched_percent >= 100
            ).length;

            const percent = course.progress;
            const isCourseCompleted =
              totalModules > 0 && completedModules === totalModules;

            return (
              <section
                key={course.id}
                className="border rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{course.title}</h2>
                    {course.subtitle && (
                      <p className="text-xs text-gray-600">
                        {course.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="text-right space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Course progress</p>
                      <p className="text-base font-semibold">{percent}%</p>
                      <p className="text-[11px] text-gray-500">
                        {completedModules}/{totalModules} modules completed
                      </p>
                    </div>

                    {isCourseCompleted ? (
                      <CertificateButton
                        courseId={course.id}
                        courseTitle={course.title}
                      />
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">
                        Complete all modules to unlock certificate.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  {course.modules.map((m, idx) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-4 text-sm border-t pt-2 first:border-t-0 first:pt-0"
                    >
                      <div>
                        <p className="font-medium">
                          Module {idx + 1}: {m.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {moduleStatus(m)} • {Math.round(m.watched_percent)}%
                        </p>
                      </div>
                      <Link
                        href={`/modules/${m.id}`}
                        className="text-xs underline underline-offset-2"
                      >
                        {m.watched_percent > 0 ? "Resume" : "Start"}
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
