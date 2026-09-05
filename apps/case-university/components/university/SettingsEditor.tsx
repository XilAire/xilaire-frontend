"use client";

import { useActionState } from "react";

import {
  updateUniversitySettingsAction,
  type UniversityFormState,
} from "@/app/actions/university-profile-settings";

import type {
  UniversityUserPreferences,
} from "@/lib/university/profile-settings";

const INITIAL_SETTINGS_FORM_STATE: UniversityFormState = {
  status: "idle",
  message: "",
};

function Toggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <span>
        <span className="block text-sm font-bold text-[var(--text-primary)]">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </span>
      </span>

      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]"
      />
    </label>
  );
}

export default function SettingsEditor({
  theme,
  preferences,
}: {
  theme: string;
  preferences: UniversityUserPreferences;
}) {
  const [state, formAction, pending] = useActionState(
    updateUniversitySettingsAction,
    INITIAL_SETTINGS_FORM_STATE,
  );

  const themeOptions = Array.from(
    new Set([
      theme,
      "light",
      "dark",
    ]),
  ).filter(Boolean);

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      <div>
        <label className="block">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Theme
          </span>

          <select
            name="theme"
            defaultValue={theme}
            className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            {themeOptions.map(
              (option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option.charAt(0).toUpperCase() +
                    option.slice(1)}
                </option>
              ),
            )}
          </select>
        </label>

        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Your saved CASE profile theme preference.
        </p>
      </div>

      <div>
        <label className="block">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Default Practice question count
          </span>

          <select
            name="default_practice_question_count"
            defaultValue={
              preferences.default_practice_question_count
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            {[
              5,
              10,
              15,
              20,
            ].map(
              (count) => (
                <option
                  key={count}
                  value={count}
                >
                  {count} questions
                </option>
              ),
            )}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        <Toggle
          name="show_learning_streak"
          label="Show learning streak"
          description="Display your current and longest learning streak in CASE University."
          defaultChecked={
            preferences.show_learning_streak
          }
        />

        <Toggle
          name="show_recent_activity"
          label="Show recent activity"
          description="Display recent lessons, assessments, Practice sessions, and certificates on supported dashboards."
          defaultChecked={
            preferences.show_recent_activity
          }
        />

        <Toggle
          name="email_learning_updates"
          label="Learning updates"
          description="Save your preference for CASE University learning-update emails."
          defaultChecked={
            preferences.email_learning_updates
          }
        />

        <Toggle
          name="email_course_updates"
          label="Course updates"
          description="Save your preference for CASE University course-update emails."
          defaultChecked={
            preferences.email_course_updates
          }
        />
      </div>

      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={[
            "rounded-xl border px-4 py-3 text-sm font-semibold",
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
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending
          ? "Saving..."
          : "Save settings"}
      </button>
    </form>
  );
}
