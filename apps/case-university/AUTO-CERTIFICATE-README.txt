CASE University — Automatic Certificate Issuance

Working files:
- app/actions/university-progress.ts
- app/actions/university-certificates.ts

What changes:
- Completing a lesson now checks authoritative course completion.
- If the course has just become fully complete, CASE University attempts the existing secure issue_university_certificate RPC automatically.
- Successful issuance revalidates /certificates, /progress, /dashboard, and the course page.
- Certificate failure never rolls back valid lesson completion.
- No entitlement bypass is added. The existing database RPC remains authoritative for course access and course_certificates entitlement.
- reconcileCompletedCourseCertificateAction is included for courses completed before this update.

No SQL changes are required.

After copying:
  npx tsc --noEmit

For an already completed course, either complete its final lesson again through the normal lesson UI or invoke the existing certificate claim/reconciliation flow.
