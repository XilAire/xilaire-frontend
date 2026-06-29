"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient, type Session } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL_SECURITY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SECURITY!;

const supabase = createClient(URL, ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Brand colors
const brand = {
  navy: "#0A233F",
};

type CourseRow = {
  id: string;
  slug: string | null;
  title: string | null;
  subtitle: string | null;
};

export default function CoursesPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      // 1) Check auth session (browser-side, same as your other pages)
      const { data: sessData, error: sessErr } =
        await supabase.auth.getSession();

      if (sessErr) {
        console.error("Error getting session on /courses:", sessErr);
        setError("Unable to load your session.");
        setLoading(false);
        return;
      }

      const currentSession = sessData.session ?? null;
      setSession(currentSession);

      if (!currentSession) {
        setError("You must be signed in to view your courses.");
        setLoading(false);
        return;
      }

      // 2) Load courses for the signed-in user (RLS handles visibility)
      const { data, error } = await supabase
        .from("courses")
        .select("id, slug, title, subtitle")
        .order("title", { ascending: true });

      if (error) {
        console.error("Error loading courses:", error);
        setError("Unable to load courses. Please try again later.");
      } else {
        setCourses((data ?? []) as CourseRow[]);
      }

      setLoading(false);
    };

    void load();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1
        className="text-2xl font-semibold"
        style={{ color: brand.navy }}
      >
        Courses
      </h1>

      {loading && (
        <p className="text-sm text-gray-500">Loading courses…</p>
      )}

      {!loading && error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && courses.length === 0 && (
        <p className="text-sm text-gray-500">
          No courses are available yet.
        </p>
      )}

      {!loading && !error && courses.length > 0 && (
        <ul className="space-y-3">
          {courses.map((c) => {
            const slugOrId = encodeURIComponent(c.slug ?? c.id);
            return (
              <li key={c.id}>
                <Link
                  href={`/courses/${slugOrId}`}
                  className="block rounded-lg border bg-white p-4 shadow-sm hover:bg-gray-50 transition"
                >
                  <div className="font-medium text-[#0A233F]">
                    {c.title ?? "Course"}
                  </div>
                  {c.subtitle && (
                    <div className="text-sm text-gray-500 mt-1">
                      {c.subtitle}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
