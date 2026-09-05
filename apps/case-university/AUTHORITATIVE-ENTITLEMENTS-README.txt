CASE University — Authoritative Entitlement Fix

Copy these files into C:\Development\xilaire-frontend-old\apps\case-university.

Files:
- lib/university/entitlements.ts
- app/(app)/courses/[slug]/page.tsx
- app/(app)/courses/[slug]/lessons/[lessonSlug]/page.tsx (included when available)

What this fixes:
- Next.js now uses get_current_university_access() as the authoritative access source.
- The database master_admin -> Pro override is honored by the application.
- No role/subscription duplication exists in the app resolver.
- Admin-created development courses such as /courses/test are treated as accessible to effective Pro users even though their slug is not one of the three production course entitlement mappings.
- Ordinary Free/Plus users do NOT gain access to arbitrary unmapped courses.
- Course and lesson pages are force-dynamic to avoid stale entitlement rendering after the override change.

No SQL changes are required.

After copying:
  npx tsc --noEmit

Then restart the dev server so there is no stale Turbopack server state:
  Ctrl+C
  npm run dev

Refresh /courses/test.
Expected: the Plus-required panel disappears and the completed course can show Issue certificate.
