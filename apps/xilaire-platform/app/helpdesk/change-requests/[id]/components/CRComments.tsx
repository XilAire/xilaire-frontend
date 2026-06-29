"use client";

import { useEffect, useState } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import { Send, MessageCircle } from "lucide-react";

interface CRCommentsProps {
  changeId: string;
}

export default function CRComments({ changeId }: CRCommentsProps) {
  const supabase = supabasePlatform;

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  // ------------------------------------------------------------
  // LOAD COMMENTS
  // ------------------------------------------------------------
  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async () => {
    const { data } = await supabase
      .from("change_request_comments")
      .select("*, profiles(full_name, avatar_url)")
      .eq("change_request_id", changeId)
      .order("created_at", { ascending: false });

    setComments(data || []);
  };

  // ------------------------------------------------------------
  // ADD A NEW COMMENT
  // ------------------------------------------------------------
  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("change_request_comments").insert({
      change_request_id: changeId,
      user_id: user?.id,
      comment: newComment.trim(),
    });

    setNewComment("");
    setLoading(false);
    loadComments();
  };

  return (
    <div className="space-y-6">

      {/* INPUT BOX */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4" /> Add Comment
        </h2>

        <textarea
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
          rows={3}
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />

        <div className="flex justify-end mt-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            {loading ? "Posting..." : <><Send className="h-4 w-4" /> Post</>}
          </button>
        </div>
      </div>

      {/* COMMENT LIST */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-white mb-4">Comment History</h2>

        {comments.length === 0 ? (
          <p className="text-slate-400 text-sm">No comments yet.</p>
        ) : (
          <div className="space-y-5">
            {comments.map((cmt) => (
              <div
                key={cmt.id}
                className="bg-slate-800/40 border border-slate-700 p-3 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-200">
                    {cmt.profiles?.full_name || "Unknown User"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(cmt.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-slate-300 text-sm whitespace-pre-line">
                  {cmt.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
