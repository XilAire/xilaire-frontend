CASE University — master_admin certificate claim wiring

Prerequisite already completed:
- get_current_university_tier() returns Pro for master_admin.
- get_current_university_access() delegates to the central tier resolver.

This package does NOT add another entitlement bypass.
The certificate RPC remains authoritative.

Files:
- app/(app)/courses/[slug]/page.tsx
- app/actions/university-certificates.ts
- components/university/CertificateClaimPanel.tsx
- lib/university/certificates.ts

Behavior:
- 100% complete + no certificate => Issue certificate
- certificate already exists => View certificate
- incomplete => certificate progress / locked
- issuing calls the reconciliation server action, which calls the secure issue_university_certificate RPC.

After copying:
  npx tsc --noEmit

Then refresh /courses/test. The completed test course should show Issue certificate.
