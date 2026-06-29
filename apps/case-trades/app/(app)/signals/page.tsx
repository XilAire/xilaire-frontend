import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const DEFAULT_ORG_SLUG = "case-trades";

export default function SignalsRedirectPage() {
  redirect(`/dashboard/signals?org=${DEFAULT_ORG_SLUG}`);
}