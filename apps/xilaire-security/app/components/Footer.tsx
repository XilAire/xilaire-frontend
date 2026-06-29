// apps/xilaire-security/app/components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t mt-12 py-8">
      <div className="mx-auto max-w-7xl px-4 text-center space-y-4 text-sm text-gray-600">
        <p className="font-semibold text-gray-700">XilAire Security</p>

        <div className="flex flex-wrap justify-center gap-6">
          <Link href="/legal/terms" className="hover:text-gray-900">
            Terms of Service
          </Link>

          <Link href="/legal/privacy" className="hover:text-gray-900">
            Privacy Policy
          </Link>

          <Link href="/legal/refund-policy" className="hover:text-gray-900">
            Refund Policy
          </Link>

          <Link href="/legal/disclosures" className="hover:text-gray-900">
            Online Training Disclosure
          </Link>

          <Link href="/legal/complaints" className="hover:text-gray-900">
            Complaint Process
          </Link>

          {/* Use UrlObject form here so TypeScript is happy */}
          <Link
            href={{ pathname: "/school" }}
            className="hover:text-gray-900"
          >
            School Disclosure
          </Link>
        </div>

        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} XilAire Security. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
