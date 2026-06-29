import type { Metadata } from "next";
import BusinessClient from "./BusinessClient";

export const metadata: Metadata = {
  title: "XilAire | Business IT Platform",
  description:
    "Managed IT, cloud, cybersecurity, automation, and compliance for modern businesses.",
};

export default function BusinessExperiencePage() {
  return <BusinessClient />;
}
