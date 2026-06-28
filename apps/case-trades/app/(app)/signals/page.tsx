import { redirect } from "next/navigation";

const DEFAULT_ORG_SLUG = "case-trades";

export default function SignalsRedirectPage() {
  redirect(`/dashboard/signals?org=${DEFAULT_ORG_SLUG}`);
}