"use client";

import React from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils"; // same helper we used for Button

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export default function Input({ className, error, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      <input
        className={cn(
          "w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-50",
          "border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
