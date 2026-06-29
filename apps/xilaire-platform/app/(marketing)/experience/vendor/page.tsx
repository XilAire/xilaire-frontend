import type { Metadata } from "next";
import VendorClient from "./VendorClient";

export const metadata: Metadata = {
  title: "XilAire | Vendor Network",
  description:
    "Join the XilAire vendor network to manage bid invitations, site visits, estimates, invoices, and compliance documents.",
};

export default function VendorExperiencePage() {
  return <VendorClient />;
}