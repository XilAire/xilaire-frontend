"use client";

import { useActionState } from "react";

import {
  updateUniversityProfileAction,
  type UniversityFormState,
} from "@/app/actions/university-profile-settings";

const INITIAL_PROFILE_FORM_STATE: UniversityFormState = {
  status: "idle",
  message: "",
};

export default function ProfileEditor({
  fullName,
}: {
  fullName: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateUniversityProfileAction,
    INITIAL_PROFILE_FORM_STATE,
  );

  return (
    <form action={formAction}>
      <label className="block">
        <span className="text-sm font-bold text-[var(--text-primary)]">
          Display name
        </span>

        <input
          name="full_name"
          type="text"
          defaultValue={fullName}
          maxLength={120}
          autoComplete="name"
          className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary-border)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          placeholder="Your name"
        />
      </label>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        This name is used across CASE University, including learner-facing
        certificate displays.
      </p>

      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={[
            "mt-4 rounded-xl border px-4 py-3 text-sm font-semibold",
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
          ].join(" ")}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
