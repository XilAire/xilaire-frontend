import type { Metadata } from "next";

import {
  LegalDocument,
  LegalList,
  LegalSection,
} from "../_shared";

export const metadata: Metadata = {
  title: "Cookie Policy | CASE University",
};

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Cookie Policy"
      description="This policy explains how CASE University may use cookies and similar technologies when you visit or use the platform."
    >
      <LegalSection title="1. What cookies are">
        <p>
          Cookies are small data files stored by a browser or device. Similar
          technologies may include local browser mechanisms, pixels, SDKs, or
          server-side identifiers used to operate and understand a service.
        </p>
      </LegalSection>

      <LegalSection title="2. How CASE University may use them">
        <LegalList>
          <li>Authenticate users and maintain secure sessions.</li>
          <li>Remember essential preferences such as interface or session settings.</li>
          <li>Protect the platform against fraud, abuse, and unauthorized access.</li>
          <li>Measure reliability, diagnose errors, and understand platform performance.</li>
          <li>Support permitted analytics or product-improvement functions.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Essential technologies">
        <p>
          Some cookies or similar technologies are necessary for authentication,
          security, session continuity, and core platform functionality.
          Disabling them may prevent portions of CASE University from working.
        </p>
      </LegalSection>

      <LegalSection title="4. Third-party services">
        <p>
          Service providers used for hosting, authentication, payments,
          communications, security, or analytics may set or receive technical
          identifiers according to their own terms and privacy practices.
        </p>
      </LegalSection>

      <LegalSection title="5. Your controls">
        <p>
          Browser settings may allow you to delete or block cookies. Where
          required by applicable law, additional consent or preference controls
          may be provided for non-essential technologies.
        </p>
      </LegalSection>

      <LegalSection title="6. Changes">
        <p>
          We may update this policy as our technology and service providers
          change. The last-updated date identifies the current version.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
