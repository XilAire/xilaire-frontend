"use client";

import { useEffect, useState } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

export default function ContactRequestDetailPage({ params }) {
  const [req, setReq] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabasePlatform
        .from("contact_requests")
        .select("*")
        .eq("id", params.id)
        .single();

      setReq(data);
    };

    load();
  }, [params.id]);

  if (!req)
    return <p className="text-slate-500">Loading request...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">
        {req.full_name || "Contact Request"}
      </h1>

      <div className="text-slate-400 mb-6">
        {new Date(req.created_at).toLocaleString()}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <p className="text-slate-300 mb-4">
          <strong>Email:</strong> {req.email}
        </p>

        <p className="text-slate-300 mb-4">
          <strong>Topic:</strong> {req.topic}
        </p>

        <p className="text-slate-200 whitespace-pre-wrap">
          {req.message}
        </p>
      </div>
    </div>
  );
}
