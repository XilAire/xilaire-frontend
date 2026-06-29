"use client";

import { useRouter } from "next/navigation";

type NewAutomationButtonProps = {
  size?: "sm" | "md";
};

export function NewAutomationButton({ size = "md" }: NewAutomationButtonProps) {
  const router = useRouter();

  const base =
    "inline-flex items-center justify-center rounded-md text-sm font-medium shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 " +
    "disabled:opacity-70 disabled:cursor-not-allowed";
  const padding = size === "sm" ? "px-3 py-1.5" : "px-4 py-2";

  return (
    <button
      type="button"
      onClick={() => router.push("/automations/new")}
      className={`${base} ${padding} border border-sky-500/40 bg-slate-900 text-sky-100 hover:bg-slate-800`}
    >
      New automation
    </button>
  );
}
