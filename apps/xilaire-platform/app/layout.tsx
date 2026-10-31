import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

export const metadata = {
  title: "XilAire Technologies",
  description: "Cloud, Managed IT, Cybersecurity, VoIP & AI automation.",
};

// Runs before React hydration to prevent a light/dark flash on navigation or reload.
const themeBootstrap = `(function(){try{var s=localStorage.getItem('xilaire-theme');if(s!=='light'&&s!=='dark'){s=localStorage.getItem('marketing-theme')||localStorage.getItem('app-theme')||localStorage.getItem('theme');}if(s!=='light'&&s!=='dark'){s='light';}document.documentElement.classList.toggle('dark',s==='dark');document.documentElement.style.colorScheme=s;}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
