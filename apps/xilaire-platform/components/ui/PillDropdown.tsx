"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function PillDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative select-none" ref={dropdownRef}>
      {/* Trigger pill */}
      <button
        onClick={() => setOpen((p) => !p)}
        className={`
          px-4 py-1.5 rounded-full border text-xs font-medium capitalize 
          flex items-center gap-2 transition
          ${
            value !== "Any"
              ? "bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-900/40"
              : "bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-700/70"
          }
        `}
      >
        {label}: {value}
        <ChevronDown size={14} className="opacity-80" />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className="
            absolute left-0 mt-2 w-40 
            bg-[#0b1120] border border-slate-700 rounded-lg z-50 
            shadow-xl shadow-black/40 py-1
          "
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`
                w-full text-left px-3 py-2 text-xs capitalize
                hover:bg-slate-800 transition
                ${
                  value === opt
                    ? "text-sky-400 font-semibold"
                    : "text-slate-300"
                }
              `}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
