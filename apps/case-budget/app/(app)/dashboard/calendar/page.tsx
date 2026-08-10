import CalendarEventModal from "@/components/calendar/CalendarEventModal";
import CalendarOverview from "@/components/calendar/CalendarOverview";
import CalendarProvider from "@/components/providers/CalendarProvider";

export default function CalendarPage() {
  return (
    <CalendarProvider>
      <CalendarOverview />

      <CalendarEventModal />
    </CalendarProvider>
  );
}