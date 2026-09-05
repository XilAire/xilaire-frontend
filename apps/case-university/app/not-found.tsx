import Link from "next/link";

function SearchIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m19 12-14 0" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <main
      className="
        flex
        min-h-screen
        w-full
        items-center
        justify-center
        bg-[var(--background)]
        px-4
        py-10
        sm:px-6
        sm:py-14
        lg:px-8
      "
    >
      <section
        className="
          w-full
          max-w-4xl
          overflow-hidden
          rounded-3xl
          border
          border-[var(--border-default)]
          bg-[var(--surface-default)]
          shadow-[var(--shadow-md)]
        "
      >
        <div
          className="
            border-b
            border-[var(--border-subtle)]
            bg-[var(--surface-muted)]
            px-5
            py-10
            text-center
            sm:px-8
            sm:py-12
          "
        >
          <div
            className="
              mx-auto
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              bg-[var(--primary)]
              text-xl
              font-black
              text-[var(--primary-foreground)]
              shadow-[var(--shadow-primary)]
            "
          >
            CU
          </div>

          <p
            className="
              mt-5
              text-xs
              font-extrabold
              uppercase
              tracking-[0.22em]
              text-[var(--primary)]
            "
          >
            CASE University
          </p>

          <p
            className="
              mt-1
              text-xs
              font-bold
              uppercase
              tracking-[0.12em]
              text-[var(--text-muted)]
            "
          >
            Investing Academy
          </p>

          <div
            className="
              mx-auto
              mt-8
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              border
              border-[var(--border-default)]
              bg-[var(--surface-default)]
              text-[var(--text-muted)]
              shadow-[var(--shadow-xs)]
            "
          >
            <SearchIcon />
          </div>

          <p
            className="
              mt-6
              text-sm
              font-black
              uppercase
              tracking-[0.22em]
              text-[var(--text-muted)]
            "
          >
            Error 404
          </p>

          <h1
            className="
              mt-2
              text-3xl
              font-black
              tracking-tight
              text-[var(--text-primary)]
              sm:text-4xl
            "
          >
            Page Not Found
          </h1>

          <p
            className="
              mx-auto
              mt-4
              max-w-2xl
              text-sm
              leading-7
              text-[var(--text-secondary)]
              sm:text-base
            "
          >
            The page you&apos;re looking for doesn&apos;t exist,
            may have moved, or is no longer available.
          </p>
        </div>

        <div
          className="
            px-5
            py-8
            sm:px-8
            sm:py-10
          "
        >
          <div
            className="
              mx-auto
              max-w-2xl
              rounded-2xl
              border
              border-[var(--border-subtle)]
              bg-[var(--surface-muted)]
              p-5
              text-center
              sm:p-6
            "
          >
            <h2
              className="
                text-base
                font-bold
                text-[var(--text-primary)]
              "
            >
              Continue learning
            </h2>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-[var(--text-secondary)]
              "
            >
              Return to CASE University or browse the course
              catalog to continue your investing education.
            </p>
          </div>

          <div
            className="
              mx-auto
              mt-6
              flex
              max-w-2xl
              flex-col
              gap-3
              sm:flex-row
              sm:justify-center
            "
          >
            <Link
              href="/"
              className="
                inline-flex
                min-h-12
                flex-1
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[var(--primary)]
                px-5
                py-3
                text-sm
                font-bold
                text-[var(--primary-foreground)]
                shadow-[var(--shadow-primary)]
                outline-none
                transition
                hover:bg-[var(--primary-hover)]
                focus-visible:ring-2
                focus-visible:ring-[var(--focus-ring)]
                sm:flex-none
              "
            >
              <HomeIcon />

              CASE University Home
            </Link>

            <Link
              href="/courses"
              className="
                inline-flex
                min-h-12
                flex-1
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-[var(--border-default)]
                bg-[var(--surface-default)]
                px-5
                py-3
                text-sm
                font-bold
                text-[var(--text-primary)]
                outline-none
                transition
                hover:bg-[var(--surface-hover)]
                focus-visible:ring-2
                focus-visible:ring-[var(--focus-ring)]
                sm:flex-none
              "
            >
              <BookIcon />

              Browse Courses
            </Link>
          </div>

          <div
            className="
              mt-8
              flex
              justify-center
            "
          >
            <Link
              href="/"
              className="
                inline-flex
                items-center
                gap-2
                rounded-lg
                px-3
                py-2
                text-sm
                font-semibold
                text-[var(--text-muted)]
                outline-none
                transition
                hover:bg-[var(--surface-hover)]
                hover:text-[var(--text-primary)]
                focus-visible:ring-2
                focus-visible:ring-[var(--focus-ring)]
              "
            >
              <ArrowLeftIcon />

              Back to CASE University
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}