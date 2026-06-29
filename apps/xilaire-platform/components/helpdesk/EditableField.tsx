"use client";

import { useState } from "react";

type Option = { value: string; label: string };

// ------------------------
// Editable Select
// ------------------------
export function EditableSelect({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string;
  options: Option[];
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
      onChange={(e) => {
        // Auto-submit parent form safely
        const form = e.currentTarget.form;
        form?.requestSubmit();
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ------------------------
// Editable Input
// ------------------------
export function EditableInput({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  return (
    <input
      name={name}
      defaultValue={defaultValue}
      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
      onBlur={(e) => {
        // Auto-submit on blur
        const form = e.currentTarget.form;
        form?.requestSubmit();
      }}
    />
  );
}

// ------------------------
// Editable TextArea
// ------------------------
export function EditableTextArea({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  return (
    <textarea
      name={name}
      defaultValue={defaultValue}
      rows={5}
      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
      onBlur={(e) => {
        // Auto-submit on blur
        const form = e.currentTarget.form;
        form?.requestSubmit();
      }}
    />
  );
}
