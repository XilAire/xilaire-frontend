"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  contractId: string;
  amount: number;
};

export default function CreateInvoiceButton({
  contractId,
  amount,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateInvoice() {
    if (loading) return;

    setError(null);

    if (!contractId) {
      setError("Missing contract ID.");
      return;
    }

    if (!amount || amount <= 0) {
      setError("Invoice amount must be greater than zero.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "/api/billing/create-invoice",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contractId,
            amount,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Invoice creation failed");
      }

      const data = await res.json();

      if (!data?.invoiceId) {
        throw new Error(
          "Invoice was created but no ID was returned."
        );
      }

      // ✅ Redirect to invoice detail
      router.push(
        `/billing/invoices/${data.invoiceId}`
      );
    } catch (err: any) {
      console.error(
        "[CreateInvoiceButton] failed:",
        err
      );
      setError(
        err?.message ??
          "Failed to create invoice. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleCreateInvoice}
        disabled={loading}
        className={
          "rounded-md px-3 py-1.5 text-xs font-medium transition " +
          (loading
            ? "bg-slate-400 text-white cursor-not-allowed"
            : "bg-sky-600 text-white hover:bg-sky-700")
        }
      >
        {loading ? "Creating…" : "Create invoice"}
      </button>

      {error && (
        <span className="text-xs text-red-500">
          {error}
        </span>
      )}
    </div>
  );
}
