import type { Metadata } from "next";

import {
  LegalDocument,
  LegalList,
  LegalNotice,
  LegalSection,
} from "../_shared";

export const metadata: Metadata = {
  title: "Security | CASE University",
};

export default function SecurityPage() {
  return (
    <LegalDocument
      title="Security"
      description="CASE University uses layered safeguards designed to protect learner accounts, educational records, and platform services."
    >
      <LegalNotice>
        Security is a shared responsibility. Use a strong, unique password,
        protect access to your email account, and report suspicious activity.
      </LegalNotice>

      <LegalSection title="Our security approach">
        <LegalList>
          <li>
            Authentication and authorization controls designed to restrict
            access to protected functionality.
          </li>
          <li>
            Role-based restrictions for administrative capabilities.
          </li>
          <li>
            Database access controls and server-side enforcement for sensitive
            learning and entitlement operations.
          </li>
          <li>
            Encrypted network connections where supported by our infrastructure
            and service providers.
          </li>
          <li>
            Logging, monitoring, validation, and error handling intended to
            detect or reduce misuse.
          </li>
          <li>
            Use of specialized service providers for infrastructure,
            authentication, payments, and communications.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Payment information">
        <p>
          CASE University may rely on a third-party payment processor for
          subscription transactions. Payment-card information submitted through
          a payment provider is subject to that provider&apos;s security and
          privacy practices.
        </p>
      </LegalSection>

      <LegalSection title="No absolute guarantee">
        <p>
          No system, network, transmission, or storage method can be guaranteed
          to be completely secure. We therefore cannot promise that unauthorized
          parties will never defeat security measures.
        </p>
      </LegalSection>

      <LegalSection title="Reporting a security concern">
        <p>
          If you believe a CASE University account, service, or data set may
          have been compromised, contact us promptly using the Legal Contact
          page. Please do not publicly disclose sensitive exploit details before
          we have had a reasonable opportunity to investigate.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
