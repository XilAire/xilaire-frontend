import type { ReactNode } from "react";
import "./globals.css";

import { SupabaseDebugClient } from "./SupabaseDebugClient";
import { HeaderNav } from "./HeaderNav";
import Footer from "./components/Footer";

export const metadata = {
  title: "XilAire Security",
  description: "Train. Certify. Protect.",

  // 🔥 Tell Next.js where your icons live
  icons: {
    icon: "/icon.png", // 512×512
    shortcut: "/favicon.ico", // .ico file
    apple: "/apple-touch-icon.png", // 180×180 for iOS home screen
  },

  // 🔥 Add PWA manifest (optional but recommended)
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full bg-[#f8f9fb] text-[#0a233f]">
      <body className="min-h-screen flex flex-col font-sans antialiased">
        {/* Debug panel */}
        <SupabaseDebugClient />

        {/* Global header */}
        <HeaderNav />

        {/* Main content */}
        <main className="w-full max-w-6xl mx-auto px-6 py-6 flex-1">
          {children}
        </main>

        {/* Global footer */}
        <Footer />
      </body>
    </html>
  );
}
