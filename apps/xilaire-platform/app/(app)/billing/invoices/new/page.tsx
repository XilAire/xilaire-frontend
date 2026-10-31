
/**
 * ============================================================
 * XILAIRE TECHNOLOGIES
 * XILAIRE PLATFORM
 *
 * BILLING - NEW INVOICE PAGE
 *
 * Route: /billing/invoices/new
 *
 * Temporary placeholder for the invoice creation workflow.
 * No database writes or billing actions are performed.
 * ============================================================
 */

import Link from "next/link";

export const metadata = {
  title: "New Invoice | XilAire Technologies",
  description: "Invoice creation for the XilAire Platform.",
};

export default function NewInvoicePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
            XilAire Technologies
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#002c4c]">
            Create New Invoice
          </h1>

          <p className="mt-3 text-slate-600">
            The invoice creation workflow is currently under
            development.
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-[#002c4c]">
            Feature Not Yet Available
          </h2>

          <p className="mt-2 text-sm text-slate-700">
            Invoice creation is not yet enabled. No billing
            information will be submitted or modified from this page.
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/billing/invoices"
            className="inline-flex items-center rounded-md bg-[#002c4c] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00416e]"
          >
            Back to Invoices
          </Link>
        </div>
      </div>
    </main>
  );
}
