"use client";

import { useState } from "react";
import { updateChangeRequest } from "../actions";
import { X } from "lucide-react";

export default function EditChangeRequestModal({
  open,
  onClose,
  change,
}: {
  open: boolean;
  onClose: () => void;
  change: any;
}) {
  const [title, setTitle] = useState(change.title);
  const [description, setDescription] = useState(change.description);
  const [implementationPlan, setImplementationPlan] = useState(change.implementation_plan);
  const [rollbackPlan, setRollbackPlan] = useState(change.rollback_plan);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSave() {
    setLoading(true);

    await updateChangeRequest(change.id, {
      title,
      description,
      implementation_plan: implementationPlan,
      rollback_plan: rollbackPlan,
    });

    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-xl p-6 relative">
        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold text-white mb-4">Edit Change Request</h2>

        {/* FORM */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-300">Title</label>
            <input
              type="text"
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Description</label>
            <textarea
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white h-24"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Implementation Plan</label>
            <textarea
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white h-24"
              value={implementationPlan}
              onChange={(e) => setImplementationPlan(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Rollback Plan</label>
            <textarea
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white h-24"
              value={rollbackPlan}
              onChange={(e) => setRollbackPlan(e.target.value)}
            />
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
            onClick={handleSave}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
