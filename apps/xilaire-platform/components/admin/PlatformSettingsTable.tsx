"use client";

import { useTransition } from "react";
import { togglePlatformSetting } from "@/lib/togglePlatformSetting";

type PlatformSetting = {
  key: string;
  value: boolean;
  description: string | null;
};

export default function PlatformSettingsTable({
  settings,
}: {
  settings: PlatformSetting[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      {settings.map((setting) => (
        <div
          key={setting.key}
          className="flex items-center justify-between px-6 py-4"
        >
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {setting.key}
            </p>
            {setting.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {setting.description}
              </p>
            )}
          </div>

          <button
            disabled={isPending}
            onClick={() =>
              startTransition(() =>
                togglePlatformSetting(setting.key, !setting.value)
              )
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              setting.value ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                setting.value ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
