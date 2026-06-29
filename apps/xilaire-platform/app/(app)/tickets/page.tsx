import { redirect } from "next/navigation";

/**
 * 🚨 CANONICAL REDIRECT
 *
 * Tickets are owned by Help Desk.
 * Platform-level /tickets must never render UI.
 */
export default function PlatformTicketsRedirectPage() {
  redirect("/helpdesk/tickets");
}
