// apps/xilaire-platform/app/(marketing)/legal/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Legal | XilAire Technologies",
  description:
    "Access legal documents for XilAire Technologies, including Terms of Service, Privacy Policy, SLA, and Refund information.",
};

export default function LegalIndexPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-3 text-3xl font-bold text-slate-900">Legal</h1>

      <p className="mb-6 text-sm text-slate-600">
        Here you&apos;ll find the core legal documents that govern your use of
        the XilAire Technologies platform and services.
      </p>

      <ul className="space-y-3 text-sm text-sky-700">
        <li>
          <Link href="/legal/privacy" className="hover:underline">
            Privacy Policy
          </Link>
        </li>
        <li>
          <Link href="/legal/terms" className="hover:underline">
            Terms of Service
          </Link>
        </li>
        <li>
          <Link href="/legal/sla" className="hover:underline">
            SLA
          </Link>
        </li>
        <li>
          <Link href="/legal/refund" className="hover:underline">
            Refund
          </Link>
        </li>
      </ul>

      <p className="mt-6 text-[11px] text-slate-400">
        These documents are provided for informational purposes only and do not
        constitute legal advice. For specific questions, please consult your
        legal counsel.
      </p>
    </section>
  );
}
