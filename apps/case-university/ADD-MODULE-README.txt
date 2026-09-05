CASE University — Add Module Fix

Copy both files into the existing CASE University app.

This restores a visible Add Module form above the Curriculum section on the admin course detail page.
The form is open by default and redirects to the new module editor after creation.

No Supabase SQL changes are required.
The existing createUniversityModuleAction in app/actions/university-admin.ts is reused.

After copying:
  npx tsc --noEmit
