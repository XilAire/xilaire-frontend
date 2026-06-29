import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type BookingType =
  | "free_consult"
  | "demo"
  | "sales"
  | "tech_support";

/* -------------------------------------------------
   ENTERPRISE ELIGIBILITY CHECK
------------------------------------------------- */
export async function consumeBookingEligibility(
  email: string,
  bookingType: BookingType
) {
  // Only enforce limits for free offerings
  if (
    bookingType !== "free_consult" &&
    bookingType !== "demo"
  ) {
    return;
  }

  /* ---------------------------------------------
     Check existing ACTIVE future bookings
  --------------------------------------------- */
  const { count, error } = await supabaseAdmin
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("attendee_email", email)
    .eq("status", "scheduled")
    .gt("scheduled_start", new Date().toISOString());

  if (error) {
    console.error(
      "BOOKING_ELIGIBILITY_QUERY_FAILED",
      error
    );
    throw new Error("ELIGIBILITY_SYSTEM_ERROR");
  }

  if ((count ?? 0) >= 1) {
    throw new Error("BOOKING_LIMIT_REACHED");
  }

  return;
}