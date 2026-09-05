"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUniversityCourseAction } from "@/app/actions/university-admin";

export default function CreateCourseForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createUniversityCourseAction({
        title,
        slug: slug || title,
        shortDescription,
        description,
        difficulty,
        estimatedMinutes:
          estimatedMinutes.trim() === "" ? null : Number(estimatedMinutes),
        thumbnailUrl,
        isFeatured,
      });
      if (!result.success || !result.id) {
        setError(result.message);
        return;
      }
      router.push(`/admin/courses/${result.id}`);
      router.refresh();
    });
  }

  function changeTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(normalizeSlug(value));
  }

  return (
    <details className="group rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-[var(--shadow-sm)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Create course</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Start a new curriculum as a draft.</p>
        </div>
        <span className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white">New course</span>
      </summary>
      <form onSubmit={submit} className="border-t border-[var(--border-subtle)] px-5 py-6 sm:px-6">
        {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{error}</p> : null}
        <div className="grid gap-5 lg:grid-cols-2">
          <Field label="Course title"><input required value={title} onChange={e=>changeTitle(e.target.value)} className={inputClassName}/></Field>
          <Field label="Course slug"><input required value={slug} onChange={e=>{setSlugTouched(true);setSlug(normalizeSlug(e.target.value));}} className={inputClassName}/></Field>
        </div>
        <div className="mt-5"><Field label="Short description"><textarea rows={3} value={shortDescription} onChange={e=>setShortDescription(e.target.value)} className={`${inputClassName} py-3`}/></Field></div>
        <div className="mt-5"><Field label="Description"><textarea rows={5} value={description} onChange={e=>setDescription(e.target.value)} className={`${inputClassName} py-3`}/></Field></div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Field label="Difficulty"><select value={difficulty} onChange={e=>setDifficulty(e.target.value)} className={inputClassName}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></Field>
          <Field label="Estimated minutes"><input type="number" min="1" step="1" value={estimatedMinutes} onChange={e=>setEstimatedMinutes(e.target.value)} className={inputClassName}/></Field>
          <Field label="Thumbnail URL"><input type="url" placeholder="https://..." value={thumbnailUrl} onChange={e=>setThumbnailUrl(e.target.value)} className={inputClassName}/></Field>
        </div>
        <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-[var(--text-primary)]"><input type="checkbox" checked={isFeatured} onChange={e=>setIsFeatured(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]"/>Feature this course</label>
        <div className="mt-6 flex justify-end"><button disabled={pending} className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white disabled:opacity-50">{pending ? "Creating..." : "Create course"}</button></div>
      </form>
    </details>
  );
}
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="block"><span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span><span className="mt-2 block">{children}</span></label>; }

const inputClassName =
  "min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-60";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
