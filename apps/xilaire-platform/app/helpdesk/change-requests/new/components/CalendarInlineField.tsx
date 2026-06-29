"use client";

import { useRef } from "react";
import { Calendar } from "lucide-react";

export default function CalendarInlineField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-300">
        {label}
      </label>

      <div
        className="relative"
        onClick={() => inputRef.current?.showPicker?.()}
      >
        <Calendar
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />

        <input
          ref={inputRef}
          type="datetime-local"
          name={name}
          defaultValue={defaultValue ?? ""}
          className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 pl-9
                     text-slate-100 placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
