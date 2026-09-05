import type { Metadata } from "next";

import {
  LegalDocument,
  LegalList,
  LegalSection,
} from "../_shared";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | CASE University",
};

export default function AcceptableUsePage() {
  return (
    <LegalDocument
      title="Acceptable Use Policy"
      description="This policy describes permitted and prohibited uses of CASE University and its educational services."
    >
      <LegalSection title="Use the platform lawfully">
        <p>
          You may use CASE University for legitimate personal, educational, and
          other expressly authorized purposes. Your use must comply with
          applicable law, the Terms of Service, and this policy.
        </p>
      </LegalSection>

      <LegalSection title="Prohibited activities">
        <LegalList>
          <li>Attempting to gain unauthorized access to accounts, databases, administrative tools, infrastructure, or restricted features.</li>
          <li>Bypassing subscriptions, entitlements, security controls, rate limits, or technical restrictions.</li>
          <li>Introducing malware, malicious code, automated attacks, or disruptive traffic.</li>
          <li>Using the service for fraud, impersonation, deception, harassment, unlawful discrimination, or other illegal conduct.</li>
          <li>Copying, scraping, reselling, republishing, or redistributing protected curriculum or assessments beyond rights expressly granted to you.</li>
          <li>Sharing account credentials or paid access in a way that defeats account or subscription restrictions.</li>
          <li>Manipulating assessments, certificates, progress records, or verification systems.</li>
          <li>Using CASE University branding or certificates to falsely claim professional licensing, accreditation, endorsement, or investment expertise.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Automated access">
        <p>
          Automated access, scraping, crawling, bulk extraction, or API use is
          prohibited unless expressly authorized by CASE University or made
          available through an approved interface.
        </p>
      </LegalSection>

      <LegalSection title="Enforcement">
        <p>
          We may investigate suspected violations and may restrict, suspend, or
          terminate access when reasonably necessary. We may also preserve or
          disclose information when required by law or necessary to protect the
          platform and its users.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
