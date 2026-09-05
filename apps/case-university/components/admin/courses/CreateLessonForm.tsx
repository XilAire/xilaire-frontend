"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUniversityLessonAction } from "@/app/actions/university-admin";

export default function CreateLessonForm({courseId,moduleId}:{courseId:string;moduleId:string}) {
  const router=useRouter(); const [pending,startTransition]=useTransition();
  const [title,setTitle]=useState(""); const [slug,setSlug]=useState(""); const [slugTouched,setSlugTouched]=useState(false);
  const [shortDescription,setShortDescription]=useState(""); const [lessonType,setLessonType]=useState("lesson");
  const [estimatedMinutes,setEstimatedMinutes]=useState(""); const [videoUrl,setVideoUrl]=useState(""); const [isPreview,setIsPreview]=useState(false);
  const [error,setError]=useState<string|null>(null);
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError(null);startTransition(async()=>{
    const result=await createUniversityLessonAction({courseId,moduleId,title,slug:slug||title,shortDescription,lessonType,estimatedMinutes:estimatedMinutes.trim()===""?null:Number(estimatedMinutes),videoUrl,isPreview});
    if(!result.success||!result.id){setError(result.message);return;}
    router.push(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${result.id}`);router.refresh();
  });}
  return <details className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-[var(--shadow-sm)]">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 sm:px-6">
      <div><h2 className="text-lg font-bold text-[var(--text-primary)]">Add lesson</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Create a draft lesson and continue directly into its editor.</p></div>
      <span className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white">New lesson</span>
    </summary>
    <form onSubmit={submit} className="space-y-5 border-t border-[var(--border-subtle)] px-5 py-6 sm:px-6">
      {error?<p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{error}</p>:null}
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Lesson title"><input required value={title} onChange={e=>{setTitle(e.target.value);if(!slugTouched)setSlug(normalizeSlug(e.target.value));}} className={inputClassName}/></Field>
        <Field label="Lesson slug"><input required value={slug} onChange={e=>{setSlugTouched(true);setSlug(normalizeSlug(e.target.value));}} className={inputClassName}/></Field>
      </div>
      <Field label="Short description"><textarea rows={3} value={shortDescription} onChange={e=>setShortDescription(e.target.value)} className={`${inputClassName} py-3`}/></Field>
      <div className="grid gap-5 md:grid-cols-3">
        <Field label="Lesson type"><input required value={lessonType} onChange={e=>setLessonType(e.target.value.toLowerCase().replace(/\s+/g,"_"))} className={inputClassName}/></Field>
        <Field label="Estimated minutes"><input type="number" min="1" step="1" value={estimatedMinutes} onChange={e=>setEstimatedMinutes(e.target.value)} className={inputClassName}/></Field>
        <Field label="Video URL"><input type="url" placeholder="https://..." value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} className={inputClassName}/></Field>
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold text-[var(--text-primary)]"><input type="checkbox" checked={isPreview} onChange={e=>setIsPreview(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]"/>Allow this lesson as a preview</label>
      <div className="flex justify-end"><button disabled={pending} className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white disabled:opacity-50">{pending?"Creating...":"Create lesson"}</button></div>
    </form>
  </details>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span><span className="mt-2 block">{children}</span></label>;}

const inputClassName =
  "min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-60";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
