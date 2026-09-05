import type { Metadata } from "next";

import {
  LegalDocument,
  LegalList,
  LegalNotice,
  LegalSection,
} from "../_shared";

export const metadata: Metadata = {
  title: "Privacy Policy | CASE University",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="This Privacy Policy explains how CASE University collects, uses, discloses, and protects information when you use our websites, applications, educational services, and related features."
    >
      <LegalNotice>
        This policy describes CASE University&apos;s general privacy practices.
        Specific features may provide additional notices at the point where
        information is collected.
      </LegalNotice>

      <LegalSection title="1. Information we collect">
        <p>Depending on how you use CASE University, we may collect:</p>

        <LegalList>
          <li>
            Account information such as your name, email address,
            authentication identifiers, profile information, and preferences.
          </li>
          <li>
            Learning information such as enrollments, lesson progress,
            assessment attempts, scores, completion status, and certificates.
          </li>
          <li>
            Subscription and transaction metadata needed to manage paid
            services. Payment-card details may be processed directly by our
            payment provider rather than stored by CASE University.
          </li>
          <li>
            Technical information such as device, browser, IP address,
            timestamps, diagnostic events, and security logs.
          </li>
          <li>
            Communications and support information you voluntarily provide.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="2. How we use information">
        <LegalList>
          <li>Provide, operate, authenticate, and secure CASE University.</li>
          <li>
            Maintain course enrollment, progress, assessments, and
            certificates.
          </li>
          <li>
            Manage subscriptions, entitlements, billing status, and customer
            support.
          </li>
          <li>
            Detect fraud, abuse, unauthorized access, and technical problems.
          </li>
          <li>
            Improve platform reliability, usability, curriculum, and learner
            experience.
          </li>
          <li>Comply with applicable law and enforce our agreements.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. How information may be shared">
        <p>
          We do not sell personal information in exchange for money. We may
          share information with service providers that help us host, secure,
          authenticate, communicate, process payments, analyze performance, or
          otherwise operate the platform, subject to appropriate contractual or
          legal protections.
        </p>

        <p>
          Information may also be disclosed when required by law, when
          reasonably necessary to protect rights or safety, in connection with
          a corporate transaction, or when you direct or authorize us to share
          it.
        </p>
      </LegalSection>

      <LegalSection title="4. Learning records and certificates">
        <p>
          CASE University stores learning progress and assessment records to
          provide course functionality. Certificate verification may expose
          limited certificate information necessary to confirm that a
          certificate is valid. Public verification is designed to avoid
          exposing unnecessary account identifiers or contact information.
        </p>
      </LegalSection>

      <LegalSection title="5. Data retention">
        <p>
          We retain information for as long as reasonably necessary to provide
          the services, maintain legitimate business and security records,
          comply with legal obligations, resolve disputes, and enforce
          agreements. Retention periods may vary by data type.
        </p>
      </LegalSection>

      <LegalSection title="6. Your choices and rights">
        <p>
          Depending on your location, you may have rights to request access,
          correction, deletion, portability, or other treatment of eligible
          personal information. Requests may require identity verification. See
          our Data Deletion page for deletion instructions.
        </p>
      </LegalSection>

      <LegalSection title="7. Children and younger learners">
        <p>
          CASE University may offer educational material suitable for a broad
          audience, but account eligibility and consent requirements depend on
          applicable law. Parents or legal guardians should supervise minors
          where required. We do not knowingly use the service to solicit
          sensitive personal information from children in violation of
          applicable law.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We use administrative, technical, and organizational safeguards
          designed to protect information. No online system can guarantee
          absolute security. See our Security page for additional information.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to this policy">
        <p>
          We may update this Privacy Policy as the service, law, or our
          practices evolve. The updated date shown on this page identifies the
          current version.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Privacy questions and requests can be submitted using the information
          on the CASE University Legal Contact page.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
