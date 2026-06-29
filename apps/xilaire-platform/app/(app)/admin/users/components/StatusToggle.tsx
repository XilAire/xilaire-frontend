"use client";

interface Props {
  value: "active" | "disabled";
  onChange: (value: "active" | "disabled") => void;
  disabled?: boolean;
}

export default function StatusToggle({
  value,
  onChange,
  disabled,
}: Props) {
  return (
    <button
      disabled={disabled}
      onClick={() =>
        onChange(value === "active" ? "disabled" : "active")
      }
      className={`px-2 py-1 text-xs rounded font-medium ${
        value === "active"
          ? "bg-green-100 text-green-700"
          : "bg-gray-200 text-gray-600"
      } disabled:opacity-50`}
    >
      {value}
    </button>
  );
}
