"use client";

import { useEffect, useState } from "react";
import NewTicketModal from "@/components/helpdesk/NewTicketModal";

export default function NewTicketPage() {
  const [ready, setReady] = useState(false);

  // Fix: ensure page renders **AFTER** client hydration
  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="p-6 text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6">
      <NewTicketModal onClose={() => window.history.back()} />
    </div>
  );
}
