// apps/xilaire-security/app/school/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "School Disclosure | XilAire Security",
  description:
    "FDACS-required school disclosure including address, instructor licenses, and contact information.",
};

export default function SchoolDisclosurePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          FDACS Compliance
        </p>
        <h1 className="text-3xl font-bold tracking-tight">School Disclosure</h1>
      </header>

      <section className="space-y-4 text-sm leading-relaxed text-gray-800">
        <p>
          This page fulfills the Florida Department of Agriculture and Consumer
          Services (FDACS) requirement for training schools to publicly disclose
          school information, instructor licensing, and contact details.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Official School Information</h2>
        <div className="mt-3 text-sm text-gray-800 space-y-1">
          <p>
            <strong>School Name:</strong> XilAire Security
          </p>
          <p>
            <strong>Address:</strong> 7754 Okeechobee Blvd, Suite 514, West Palm
            Beach, FL 33411
          </p>
          <p>
            <strong>Phone:</strong> (XXX) XXX-XXXX
          </p>
          <p>
            <strong>Email:</strong> support@xilairesecurity.com
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">FDACS Licensing Information</h2>
        <div className="mt-3 space-y-1 text-sm text-gray-800">
          <p>
            <strong>School License:</strong> Pending Approval
          </p>
          <p>
            <strong>DI Instructor:</strong> To Be Assigned
          </p>
          <p>
            <strong>K Instructor:</strong> To Be Assigned
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">Course Catalog</h2>
        <ul className="ml-6 list-disc text-sm text-gray-800 space-y-1 mt-3">
          <li>Class D – 40 Hours (Unarmed Security)</li>
          <li>Class D Refresher – 8 Hours</li>
          <li>Class G – 28 Hours (Statewide Firearm)</li>
          <li>Class G Annual Refresher – 4 Hours</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">Complaint Procedures</h2>
        <p className="text-sm text-gray-800 mt-2">
          Students may file complaints directly with XilAire Security or escalate to
          FDACS if concerns cannot be resolved.
        </p>

        <div className="mt-4 border-l-4 border-gray-300 pl-4 text-sm text-gray-800">
          Florida Department of Agriculture &amp; Consumer Services
          <br />
          Division of Licensing
          <br />
          (850) 245-5691
          <br />
          Email: DLUInvestigations@fdacs.gov
        </div>
      </section>
    </main>
  );
}
