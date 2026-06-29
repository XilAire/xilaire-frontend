/* -------------------------------------------------
   EASTERN TIME FORMATTER
------------------------------------------------- */
export function formatEasternRange(startUtc: string, endUtc: string) {
  const start = new Date(startUtc);
  const end = new Date(endUtc);

  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };

  const date = new Intl.DateTimeFormat("en-US", opts).format(start);

  const endTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(end);

  return `${date} – ${endTime} ET`;
}