// components/CourseOutline.tsx
// Server component: lists modules and shows per-module + overall progress.

import Link from "next/link";
import { supabaseServer } from "../lib/supabaseServer";

interface CourseOutlineProps {
  courseId?: string;
  userId?: string;
}

type ModuleRow = {
  id: string;
  title: string;
  position?: number | null;
  video_url?: string | null;
};

type ProgressRow = {
  module_id: string;
  watched_percent: number | null;
};

export default async function CourseOutline({ courseId, userId }: CourseOutlineProps) {
  const supabase = await supabaseServer();

  // Resolve the logged-in user (optional)
  let resolvedUserId: string | null = userId ?? null;
  if (!resolvedUserId) {
    const { data } = await supabase.auth.getUser();
    resolvedUserId = data?.user?.id ?? null;
  }

  // --- Fetch modules (sorted by position ascending) ---
  let modQuery = supabase
    .from("modules")
    .select("id, title, position, video_url");

  if (courseId) modQuery = modQuery.eq("course_id", courseId);

  const { data: modulesData, error: modulesErr } = await modQuery.order("position", { ascending: true });

  if (modulesErr) {
    return (
      <div className="rounded-2xl border p-4 text-sm text-red-600">
        Failed to load modules: {modulesErr.message}
      </div>
    );
  }

  const modules: ModuleRow[] = modulesData ?? [];

  // --- Fetch module progress (falls back to 0%) ---
  const progressMap = new Map<string, number>();
  if (resolvedUserId) {
    const { data: progressData } = await supabase
      .from("modules_progress")
      .select("module_id, watched_percent")
      .eq("user_id", resolvedUserId);

    (progressData as ProgressRow[] | null)?.forEach((p) => {
      progressMap.set(p.module_id, Number(p.watched_percent ?? 0));
    });
  }

  // --- Compute overall percentage ---
  const percents = modules.map((m) => progressMap.get(m.id) ?? 0);
  const overall =
    percents.length > 0
      ? Math.round((percents.reduce((a, b) => a + b, 0) / percents.length) * 100) / 100
      : 0;

  // --- Render ---
  return (
    <section className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Course outline</h2>
          <p className="text-sm text-muted-foreground">
            Overall progress: {overall}% complete
          </p>
        </div>
        <div className="w-48 h-2 rounded bg-muted overflow-hidden">
          <div className="h-full rounded bg-primary" style={{ width: `${overall}%` }} />
        </div>
      </header>

      <ul className="grid gap-3">
        {modules.map((m) => {
          const pct = progressMap.get(m.id) ?? 0;
          return (
            <li key={m.id} className="rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-medium leading-none">{m.title}</h3>
                  {m.video_url && (
                    <p className="text-xs text-muted-foreground">
                      🎥 Video available
                    </p>
                  )}
                </div>
                <div className="text-sm font-medium">{pct}%</div>
              </div>

              <div className="mt-3 w-full h-2 rounded bg-muted overflow-hidden">
                <div className="h-full rounded bg-primary" style={{ width: `${pct}%` }} />
              </div>

              <div className="mt-3">
                <Link href={`/modules/${m.id}`} className="text-sm underline">
                  Open module
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
