"use client";

import { useState } from "react";

export default function CommentBox({ ticketId, onPost }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitComment() {
    if (!message.trim()) return;

    setLoading(true);

    const res = await fetch("/api/tickets/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId,
        message,
        userEmail: "helpdesk-agent@xilaire.com", // or get from session
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (json.ok) {
      setMessage("");
      if (onPost) onPost(json.comment);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      <textarea
        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200"
        placeholder="Write a comment..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
      />

      <button
        disabled={loading}
        onClick={submitComment}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
      >
        {loading ? "Posting..." : "Post Comment"}
      </button>
    </div>
  );
}
