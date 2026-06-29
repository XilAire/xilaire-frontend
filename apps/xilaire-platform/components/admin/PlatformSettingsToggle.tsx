// apps/xilaire-platform/components/admin/PlatformSettingsToggle.tsx

"use client";

import { useTransition } from "react";
import { updatePlatformSetting } from "@/lib/updatePlatformSetting";

type Props = {
  settingKey: string;
  value: boolean;
  description?: string | null;
};

export default function PlatformSettingsToggle({
  settingKey,
  value,
  description,
}: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-800">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {settingKey}
        </p>
        {description && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>

      <button
        disabled={isPending}
        onClick={() =>
          startTransition(() =>
            updatePlatformSetting({
              key: settingKey,
              value: !value,
            })
          )
        }
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition
          ${value ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}
          ${isPending ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition
            ${value ? "translate-x-6" : "translate-x-1"}
          `}
        />
      </button>
    </div>
  );
}
