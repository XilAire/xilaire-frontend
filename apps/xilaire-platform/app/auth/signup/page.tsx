import { Suspense } from "react";
import PageClient from "./PageClient";

export default function Page() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-xl px-6 py-20 text-center" role="status">Loading...</main>}>
      <PageClient />
    </Suspense>
  );
}
