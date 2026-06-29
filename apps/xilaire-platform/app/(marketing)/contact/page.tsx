// apps/xilaire-platform/app/(marketing)/contact/page.tsx

import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact | XilAire Technologies",
  description:
    "Get in touch with XilAire Technologies about cloud, managed IT, cybersecurity, VoIP, and AI automation.",
};

// Shape of search params for this page
type ContactPageProps = {
  searchParams?: {
    service_sku?: string | string[];
    service_name?: string | string[];
    [key: string]: string | string[] | undefined;
  };
};

export default function ContactPage({ searchParams }: ContactPageProps) {
  // Normalize query params (arrays -> first value)
  const rawSku = searchParams?.service_sku;
  const rawName = searchParams?.service_name;

  const serviceSku =
    typeof rawSku === "string" ? rawSku : Array.isArray(rawSku) ? rawSku[0] : undefined;

  const serviceName =
    typeof rawName === "string" ? rawName : Array.isArray(rawName) ? rawName[0] : undefined;

  return (
    <section className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="mb-3 text-3xl font-bold text-slate-900">Contact</h1>
      <p className="mb-8 max-w-2xl text-sm text-slate-600">
        Tell us a bit about your environment and what you’re looking for. We’ll
        follow up with next steps and a recommended plan.
      </p>

      <div className="grid gap-8 md:grid-cols-[1.5fr,1fr]">
        {/* Form card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <ContactForm
            serviceSku={serviceSku}
            serviceName={serviceName}
          />
        </div>

        {/* Sidebar card */}
        <aside className="space-y-4 text-sm text-slate-700">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              What happens next?
            </h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-slate-700">
              <li>We review your environment and goals.</li>
              <li>We schedule a discovery call if needed.</li>
              <li>
                You receive a recommended bundle for licenses, services, and
                automations.
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Prefer email?
            </h2>
            <p className="mt-2 text-xs text-slate-700">
              You can also reach us at{" "}
              <span className="font-medium text-slate-900">
                support@xilairetechnologies.com
              </span>{" "}
              and we’ll route your request to the right team.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
