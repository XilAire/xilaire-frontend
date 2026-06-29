"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceForContract } from "@/app/(app)/billing/actions/createInvoice";

export default function CreateInvoiceButton({
  contractId,
}: {
  contractId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    try {
      setLoading(true);
      const invoiceId = await createInvoiceForContract(contractId);
      router.push(`/billing/invoices/${invoiceId}`);
    } catch (err) {
      console.error("[Invoice] Create failed", err);
      alert("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="px-3 py-1 text-xs rounded border hover:bg-muted disabled:opacity-50"
    >
      {loading ? "Creating…" : "Create Invoice"}
    </button>
  );
}
