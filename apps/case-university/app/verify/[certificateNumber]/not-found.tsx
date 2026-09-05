import Link from "next/link";

function SearchIcon() {
  return (
    <svg
      width="28"
      height="28"
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

export default function CertificateNotFound() {
  return (
    <div
      className="
        mx-auto
        flex
        w-full
        max-w-5xl
        flex-1
        items-center
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
            py-8
            text-center
            sm:px-8
            sm:py-10
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
              mt-5
              text-xs
              font-extrabold
              uppercase
              tracking-[0.2em]
              text-[var(--text-muted)]
            "
          >
            CASE University
          </p>

          <h1
            className="
              mt-2
              text-2xl
              font-black
              tracking-tight
              text-[var(--text-primary)]
              sm:text-3xl
            "
          >
            Credential Not Found
          </h1>

          <p
            className="
              mx-auto
              mt-3
              max-w-2xl
              text-sm
              leading-6
              text-[var(--text-secondary)]
              sm:text-base
            "
          >
            We could not find a CASE University certificate matching that verification reference.
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
              Check the certificate reference
            </h2>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-[var(--text-secondary)]
              "
            >
              Make sure the full verification URL or certificate number was entered exactly as shown on the credential. If you scanned a QR code, try scanning it again from the original certificate.
            </p>
          </div>

          <div
            className="
              mt-6
              flex
              justify-center
            "
          >
            <Link
              href="/"
              className="
                inline-flex
                min-h-11
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-[var(--border-default)]
                bg-[var(--surface-default)]
                px-5
                py-2.5
                text-sm
                font-bold
                text-[var(--text-primary)]
                outline-none
                transition
                hover:bg-[var(--surface-hover)]
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
    </div>
  );
}