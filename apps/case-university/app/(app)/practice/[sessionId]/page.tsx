import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PracticeSession from "@/components/university/PracticeSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserPracticeSession } from "@/lib/university/practice";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PracticeSessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function PracticeSessionPage({
  params,
}: PracticeSessionPageProps) {
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/signin?redirect=/practice/${sessionId}`);
  }

  const session = await getCurrentUserPracticeSession(sessionId);

  if (!session) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5">
        <Link
          href="/practice"
          className="text-sm font-bold text-[var(--primary)] hover:underline"
        >
          ← Back to Practice
        </Link>
      </div>

      <PracticeSession session={session} />
    </main>
  );
}
