// apps/xilaire-platform/app/layout.tsx
import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "XilAire Technologies",
  description: "Cloud, Managed IT, Cybersecurity, VoIP & AI automation.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
