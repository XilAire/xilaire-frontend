import type { Metadata } from "next";

import Link from "next/link";

import {
  LegalDocument,
  LegalList,
  LegalNotice,
  LegalSection,
} from "../_shared";

export const metadata: Metadata = {
  title: "Data Deletion | CASE University",
};

export default function DataDeletionPage() {
  return (
    <LegalDocument
      title="Data Deletion"
      description="Learn how to request deletion of eligible CASE University account information and what may be retained after a request."
    >
      <LegalNotice>
        Deleting an account can permanently remove access to learning history,
        assessment records, and other account-linked features. Some records may
        need to be retained for legal, security, fraud-prevention, transaction,
        or legitimate business purposes.
      </LegalNotice>

      <LegalSection title="How to request deletion">
        <p>
          Submit a request using the contact method listed on our{" "}
          <Link
            href="/legal/contact"
            className="font-bold text-[var(--primary)] hover:underline"
          >
            Legal Contact
          </Link>{" "}
          page. Clearly state that you are requesting deletion of your CASE
          University account and identify the email address associated with the
          account.
        </p>
      </LegalSection>

      <LegalSection title="Identity verification">
        <p>
          To protect accounts from unauthorized deletion, we may require
          reasonable steps to verify that the requester controls the account or
          is otherwise authorized to make the request.
        </p>
      </LegalSection>

      <LegalSection title="Information that may be deleted or de-identified">
        <LegalList>
          <li>Eligible profile information.</li>
          <li>Learning progress associated with the account.</li>
          <li>
            Assessment attempts and course-enrollment records where deletion is
            legally and operationally permitted.
          </li>
          <li>
            Other account-linked information that is not required to be
            retained.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Information we may retain">
        <LegalList>
          <li>
            Records required by law, accounting, tax, payment, dispute, or
            regulatory obligations.
          </li>
          <li>
            Security, fraud-prevention, audit, and abuse-prevention records.
          </li>
          <li>
            Backups that are isolated from ordinary production use until
            overwritten according to applicable retention processes.
          </li>
          <li>
            Information that has been aggregated or de-identified so it no
            longer reasonably identifies you.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Certificates">
        <p>
          Deletion of an account may affect access to certificates and public
          verification. Where a certificate record must or may legitimately be
          retained, we may minimize the information associated with that record
          consistent with applicable requirements.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
