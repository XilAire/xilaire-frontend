import type { Metadata } from "next";

import Link from "next/link";

import {
  LegalDocument,
  LegalList,
  LegalNotice,
  LegalSection,
} from "../_shared";

export const metadata: Metadata = {
  title: "Legal Contact | CASE University",
};

export default function LegalContactPage() {
  return (
    <LegalDocument
      title="Legal Contact"
      description="Use the appropriate CASE University support channel for privacy, data, security, intellectual-property, or other legal inquiries."
    >
      <LegalNotice>
        Do not include passwords, payment-card numbers, authentication tokens,
        Social Security numbers, or other unnecessary sensitive information in
        a legal or support request.
      </LegalNotice>

      <LegalSection title="Contact email">
        <p>
          General legal, privacy, and data-rights inquiries may be sent to:
        </p>

        <p>
          <a
            href="mailto:support@xilairetechnologies.com"
            className="font-bold text-[var(--primary)] hover:underline"
          >
            support@xilairetechnologies.com
          </a>
        </p>
      </LegalSection>

      <LegalSection title="When contacting us">
        <LegalList>
          <li>Identify CASE University in the subject or message.</li>
          <li>
            Provide the email address associated with your account when account
            verification is needed.
          </li>
          <li>
            Describe the request clearly, such as Privacy Request, Data
            Deletion, Security Report, or Copyright/Trademark Inquiry.
          </li>
          <li>
            Provide only the information reasonably necessary for us to
            understand and process the request.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Data deletion">
        <p>
          For account-deletion information, review the{" "}
          <Link
            href="/legal/data-deletion"
            className="font-bold text-[var(--primary)] hover:underline"
          >
            Data Deletion
          </Link>{" "}
          page before submitting your request.
        </p>
      </LegalSection>

      <LegalSection title="Security reports">
        <p>
          If reporting a suspected vulnerability or account compromise, clearly
          mark the message as a security issue and include enough information to
          reproduce or investigate the concern without unnecessarily exposing
          sensitive user data.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
