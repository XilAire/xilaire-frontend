"use client";

import { useState } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import { useRouter } from "next/navigation";

export default function NewTicketModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const supabase = supabasePlatform;

  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: userObj } = await supabase.auth.getUser();

    const { error: insertError } = await supabase
      .from("tickets")
      .insert({
        title,
        email: email || userObj?.user?.email,
        description,
        priority,
        status: "open",
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-white font-semibold">Create new ticket</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {error && <p className="text-red-500 mb-3">{error}</p>}

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-slate-300 text-sm mb-1 block">Title</label>
            <input
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Requester Email */}
          <div>
            <label className="text-slate-300 text-sm mb-1 block">
              Requester Email
            </label>
            <input
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com (optional)"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-slate-300 text-sm mb-1 block">Priority</label>
            <select
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-slate-300 text-sm mb-1 block">
              Description
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
            >
              {loading ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
