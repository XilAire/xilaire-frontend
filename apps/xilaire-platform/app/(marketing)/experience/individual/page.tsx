import type { Metadata } from "next";
import IndividualClient from "./IndividualClient";

export const metadata: Metadata = {
  title: "XilAire | Individual IT Services",
  description:
    "Personal IT support, Microsoft 365, device security, and automation for individuals and professionals.",
};

export default function IndividualExperiencePage() {
  return <IndividualClient />;
}
