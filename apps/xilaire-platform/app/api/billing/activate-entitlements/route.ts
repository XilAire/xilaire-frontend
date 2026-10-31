// AUTH-04M: TEMPORARY SECURITY HOLD
// Original implementation retained in the verified AUTH-04M backup.
// Do not re-enable without authenticated caller validation,
// tenant authorization, payment-state verification, and error handling.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return new Response(
    "Billing entitlement operation temporarily unavailable.",
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    }
  );
}
