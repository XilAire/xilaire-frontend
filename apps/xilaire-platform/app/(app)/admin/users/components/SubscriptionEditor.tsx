"use client";

interface Props {
  subscriptions: string[];
  onChange: (subs: string[]) => void;
  disabled?: boolean;
}

const ALL_SUBS = ["helpdesk", "claims", "ai_dashboard"];

export default function SubscriptionEditor({
  subscriptions,
  onChange,
  disabled,
}: Props) {
  function toggle(sub: string) {
    if (subscriptions.includes(sub)) {
      onChange(subscriptions.filter((s) => s !== sub));
    } else {
      onChange([...subscriptions, sub]);
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {ALL_SUBS.map((sub) => (
        <button
          key={sub}
          disabled={disabled}
          onClick={() => toggle(sub)}
          className={`px-2 py-1 text-xs rounded ${
            subscriptions.includes(sub)
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {sub}
        </button>
      ))}
    </div>
  );
}
