/* -------------------------------------------------
   TYPES
------------------------------------------------- */
export type BusyRange = {
  start: string; // ISO
  end: string;   // ISO
};

export type Slot = {
  label: string;       // "09:15"
  startMinutes: number;
  endMinutes: number;
  disabled: boolean;
};

/* -------------------------------------------------
   CONFIG
------------------------------------------------- */
const START_HOUR = 9;
const END_HOUR = 17;
const SLOT_MINUTES = 15;

/* -------------------------------------------------
   HELPERS
------------------------------------------------- */
function toMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

/* -------------------------------------------------
   SLOT GENERATOR (AUTHORITATIVE)
------------------------------------------------- */
export function generateBookingSlots(
  date: string,
  busy: BusyRange[] = []
): Slot[] {
  const busyRanges = busy.map((b) => ({
    start: toMinutes(new Date(b.start)),
    end: toMinutes(new Date(b.end)),
  }));

  const slots: Slot[] = [];

  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (let min = 0; min < 60; min += SLOT_MINUTES) {
      const startMinutes = hour * 60 + min;
      const endMinutes = startMinutes + SLOT_MINUTES;

      const isBusy = busyRanges.some(
        (b) => startMinutes < b.end && endMinutes > b.start
      );

      slots.push({
        label: `${hour.toString().padStart(2, "0")}:${min
          .toString()
          .padStart(2, "0")}`,
        startMinutes,
        endMinutes,
        disabled: isBusy,
      });
    }
  }

  return slots;
}