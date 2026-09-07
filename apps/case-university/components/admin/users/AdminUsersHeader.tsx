import Link from "next/link";

export default function AdminUsersHeader() {
  return (
    <div
      className="
        flex
        flex-col
        gap-4
        lg:flex-row
        lg:items-end
        lg:justify-between
      "
    >
      <div>
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
          CASE University Users
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
          Find and review everyone who has signed up
          for CASE University. Authentication is the
          authoritative user population; profile,
          billing, learning, and certificate data are
          layered onto each account.
        </p>
      </div>

      <div
        className="
          flex
          flex-wrap
          gap-2
        "
      >
        <Link
          href="/admin"
          className="
            inline-flex
            min-h-10
            items-center
            justify-center
            rounded-xl
            border
            border-[var(--border-default)]
            bg-[var(--surface-default)]
            px-4
            text-sm
            font-bold
            text-[var(--text-primary)]
            transition
            hover:border-[var(--border-strong)]
            hover:bg-[var(--surface-hover)]
          "
        >
          Admin Home
        </Link>

        <Link
          href="/admin/courses"
          className="
            inline-flex
            min-h-10
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
          Manage Courses
        </Link>
      </div>
    </div>
  );
}
