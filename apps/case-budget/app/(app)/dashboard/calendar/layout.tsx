import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Calendar | CASE Budget",
  description:
    "View your CASE Budget financial calendar, including upcoming bills, payments, paydays, and other important financial dates.",
};

type CalendarLayoutProps = {
  children:
    ReactNode;
};

export default function CalendarLayout({
  children,
}: CalendarLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}