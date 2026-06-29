"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function PriorityPillDropdown({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={ref}>
      {/* INLINE LABEL AND VALUE INSIDE THE PILL */}
      <button
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full px-4 py-2 rounded-full border flex items-center gap-2
          text-xs font-medium bg-slate-800/60 border-slate-700 text-slate-200
          hover:bg-slate-700/60 transition justify-between
          ${disabled ? "opacity-40 cursor-not-allowed" : ""}
        `}
      >
        {/* LEFT SIDE: inline label + value */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Level</span>
          <span className="capitalize text-slate-100">{value}</span>
        </div>

        {/* Chevron */}
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* DROPDOWN MENU */}
      {open && (
        <div
          className="
            absolute left-0 right-0 mt-2 rounded-xl overflow-hidden z-[9999]
            bg-slate-900 border border-slate-700 shadow-xl
          "
        >
          {["low", "medium", "high", "critical"].map((p) => (
            <button
              key={p}
              onClick={() => select(p)}
              disabled={disabled}
              className={`w-full text-left px-4 py-2 text-xs capitalize
                hover:bg-slate-700/50 transition
                ${
                  value === p
                    ? "text-sky-300 font-semibold"
                    : "text-slate-300"
                }
              `}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
