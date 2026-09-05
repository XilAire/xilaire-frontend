CASE University — Assessment Wiring

Copy these files into:
C:\Development\xilaire-frontend-old\apps\case-university

No additional Supabase SQL is required for this package.
The assessment tables/RPCs and assessment-aware progress RPC must already be installed.

Files:
- app/actions/university-assessments.ts
- app/(app)/admin/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/page.tsx
- app/(app)/courses/[slug]/lessons/[lessonSlug]/page.tsx
- components/admin/courses/LessonAssessmentBuilder.tsx
- components/university/LessonAssessment.tsx
- lib/university/admin-assessments.ts
- lib/university/assessments.ts

Security:
- Admin correct answers are loaded server-only after role_rank >= 4 verification.
- Learners only receive sanitized answer choices through get_current_lesson_assessment().
- Grading remains server-side through submit_current_lesson_assessment().
- Required published assessments gate learner completion in both the UI and the progress RPC.

After copying:
npx tsc --noEmit
