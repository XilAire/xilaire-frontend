import type {
  Metadata,
} from "next";
import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  getCurrentUniversityAdminContext,
} from "@/lib/university/admin-permissions";

export const metadata: Metadata = {
  title:
    "Admin | CASE University",
};

export const dynamic =
  "force-dynamic";

type AdminCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
};

function AdminCard({
  eyebrow,
  title,
  description,
  href,
  cta,
}: AdminCardProps) {
  return (
    <article
      className="
        flex
        h-full
        flex-col
        rounded-2xl
        border
        border-[var(--border-default)]
        bg-[var(--surface-default)]
        p-5
        shadow-[var(--shadow-sm)]
      "
    >
      <p
        className="
          text-[10px]
          font-extrabold
          uppercase
          tracking-[0.14em]
          text-[var(--primary)]
        "
      >
        {eyebrow}
      </p>

      <h2
        className="
          mt-2
          text-xl
          font-black
          text-[var(--text-primary)]
        "
      >
        {title}
      </h2>

      <p
        className="
          mt-2
          flex-1
          text-sm
          leading-6
          text-[var(--text-secondary)]
        "
      >
        {description}
      </p>

      <Link
        href={href}
        className="
          mt-5
          inline-flex
          h-10
          items-center
          justify-center
          rounded-xl
          bg-[var(--primary)]
          px-4
          text-sm
          font-bold
          text-white
          transition
          hover:opacity-90
        "
      >
        {cta}
      </Link>
    </article>
  );
}

export default async function AdminHomePage() {
  const {
    permissions,
  } =
    await getCurrentUniversityAdminContext();

  if (
    !permissions.canAccessAdmin
  ) {
    redirect(
      "/dashboard",
    );
  }

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-[1600px]
        px-4
        py-6
        sm:px-6
        sm:py-8
        lg:px-8
      "
    >
      <p
        className="
          text-xs
          font-extrabold
          uppercase
          tracking-[0.16em]
          text-[var(--primary)]
        "
      >
        Administration
      </p>

      <h1
        className="
          mt-2
          text-3xl
          font-black
          tracking-[-0.03em]
          text-[var(--text-primary)]
          sm:text-4xl
        "
      >
        CASE University Admin
      </h1>

      <p
        className="
          mt-3
          max-w-3xl
          text-sm
          leading-6
          text-[var(--text-secondary)]
          sm:text-base
        "
      >
        Manage the CASE University user population and
        curriculum from the existing administrative
        authorization boundary.
      </p>

      <div
        className="
          mt-7
          grid
          gap-4
          lg:grid-cols-2
        "
      >
        <AdminCard
          eyebrow="Accounts"
          title="Users"
          description="Search all CASE University authentication accounts and review profile, billing, learning, certificate, and security information."
          href="/admin/users"
          cta="Manage Users"
        />

        <AdminCard
          eyebrow="Curriculum"
          title="Courses"
          description="Continue using the existing course, module, lesson, publishing, resource, and assessment administration experience."
          href="/admin/courses"
          cta="Manage Courses"
        />
      </div>
    </div>
  );
}
