"use client";

import { useState, useEffect } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import ContactRequestTicketCell from "./ContactRequestTicketCell";

export default function ContactRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabasePlatform
        .from("contact_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) setRequests(data || []);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">
        Contact Requests
      </h1>
      <p className="text-slate-400 mb-6">
        View all inbound contact form submissions.
      </p>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">

        {loading && <p className="text-slate-500">Loading...</p>}

        {!loading && requests.length === 0 && (
          <p className="text-slate-600">No contact requests found.</p>
        )}

        {!loading && requests.length > 0 && (
          <div className="flex flex-col divide-y divide-slate-800">
            {requests.map((req) => (
              <ContactRequestTicketCell key={req.id} request={req} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
