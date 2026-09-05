import Link from "next/link";

function AwardIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="5" />
      <path d="m8.5 12.5-1.5 8 5-3 5 3-1.5-8" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.8 2.8 8.3 7 10 4.2-1.7 7-5.2 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3z" />
      <path d="M19 14h2v2" />
      <path d="M17 19h4v2h-4" />
      <path d="M14 19v2" />
    </svg>
  );
}

function ArrowRightIcon() {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

const certificateBenefits = [
  {
    title: "Completion-based",
    description:
      "Certificates are tied to completed course requirements rather than simple enrollment.",
    icon: AwardIcon,
  },
  {
    title: "Publicly verifiable",
    description:
      "Each issued credential can be checked through a dedicated public verification page.",
    icon: ShieldCheckIcon,
  },
  {
    title: "QR-enabled",
    description:
      "Certificate QR codes point directly to the public verification record for quick validation.",
    icon: QrIcon,
  },
];

export default function CertificateSection() {
  return (
    <section
      id="certificates"
      className="
        border-y
        border-[var(--border-subtle)]
        bg-[var(--background)]
        py-16
        sm:py-20
        lg:py-24
      "
    >
      <div
        className="
          mx-auto
          grid
          w-full
          max-w-[1600px]
          gap-12
          px-4
          sm:px-6
          lg:grid-cols-[minmax(0,0.9fr)_minmax(460px,1.1fr)]
          lg:items-center
          lg:gap-16
          lg:px-8
        "
      >
        <div className="min-w-0">
          <p
            className="
              text-xs
              font-extrabold
              uppercase
              tracking-[0.18em]
              text-[var(--achievement)]
            "
          >
            Earn More Than Progress
          </p>

          <h2
            className="
              mt-3
              max-w-3xl
              text-3xl
              font-black
              tracking-[-0.03em]
              text-[var(--text-primary)]
              sm:text-4xl
              lg:text-5xl
            "
          >
            Turn completed learning into a verifiable credential.
          </h2>

          <p
            className="
              mt-5
              max-w-2xl
              text-base
              leading-7
              text-[var(--text-secondary)]
              sm:text-lg
              sm:leading-8
            "
          >
            CASE University certificates are designed to represent
            actual course completion. Each issued credential receives
            its own certificate number and can be validated through a
            public verification page.
          </p>

          <div className="mt-8 grid gap-4">
            {certificateBenefits.map(
              ({
                title,
                description,
                icon: Icon,
              }) => (
                <div
                  key={title}
                  className="
                    flex
                    gap-4
                    rounded-2xl
                    border
                    border-[var(--border-subtle)]
                    bg-[var(--surface-default)]
                    p-4
                    shadow-[var(--shadow-xs)]
                  "
                >
                  <div
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-[var(--achievement-soft)]
                      text-[var(--achievement)]
                    "
                  >
                    <Icon />
                  </div>

                  <div>
                    <h3
                      className="
                        text-base
                        font-black
                        text-[var(--text-primary)]
                      "
                    >
                      {title}
                    </h3>

                    <p
                      className="
                        mt-1
                        text-sm
                        leading-6
                        text-[var(--text-secondary)]
                      "
                    >
                      {description}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>

          <div
            className="
              mt-8
              flex
              flex-col
              gap-3
              sm:flex-row
            "
          >
            <Link
              href="/courses"
              className="
                inline-flex
                min-h-12
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
              "
            >
              Explore Courses

              <ArrowRightIcon />
            </Link>

            <Link
              href="/auth/signin"
              className="
                inline-flex
                min-h-12
                items-center
                justify-center
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
              "
            >
              View My Certificates
            </Link>
          </div>
        </div>

        <div
          className="
            relative
            mx-auto
            w-full
            max-w-3xl
          "
        >
          <div
            aria-hidden="true"
            className="
              absolute
              -inset-8
              rounded-[2.5rem]
              bg-[var(--achievement-soft)]
              opacity-70
              blur-3xl
            "
          />

          <div
            className="
              relative
              overflow-hidden
              rounded-[2rem]
              border
              border-[var(--achievement-border)]
              bg-[var(--surface-elevated)]
              p-4
              shadow-[var(--shadow-md)]
              sm:p-6
            "
          >
            <div
              className="
                relative
                overflow-hidden
                rounded-2xl
                border
                border-[var(--border-default)]
                bg-[var(--surface-default)]
                p-6
                sm:p-8
                lg:p-10
              "
            >
              <div
                aria-hidden="true"
                className="
                  absolute
                  inset-x-0
                  top-0
                  h-1.5
                  bg-[var(--achievement)]
                "
              />

              <div
                className="
                  flex
                  flex-col
                  items-center
                  text-center
                "
              >
                <div
                  className="
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-[var(--achievement-border)]
                    bg-[var(--achievement-soft)]
                    text-[var(--achievement)]
                  "
                >
                  <AwardIcon />
                </div>

                <p
                  className="
                    mt-5
                    text-[10px]
                    font-extrabold
                    uppercase
                    tracking-[0.2em]
                    text-[var(--achievement)]
                  "
                >
                  CASE University
                </p>

                <h3
                  className="
                    mt-2
                    text-2xl
                    font-black
                    tracking-tight
                    text-[var(--text-primary)]
                    sm:text-3xl
                  "
                >
                  Certificate of Completion
                </h3>

                <p
                  className="
                    mt-5
                    text-sm
                    text-[var(--text-muted)]
                  "
                >
                  This certifies that
                </p>

                <p
                  className="
                    mt-2
                    text-2xl
                    font-black
                    tracking-tight
                    text-[var(--text-primary)]
                    sm:text-3xl
                  "
                >
                  CASE University Learner
                </p>

                <p
                  className="
                    mt-4
                    max-w-lg
                    text-sm
                    leading-6
                    text-[var(--text-secondary)]
                  "
                >
                  has successfully completed the required curriculum
                  for
                </p>

                <div
                  className="
                    mt-4
                    rounded-xl
                    border
                    border-[var(--primary-border)]
                    bg-[var(--primary-soft)]
                    px-4
                    py-3
                  "
                >
                  <p
                    className="
                      text-lg
                      font-black
                      text-[var(--primary)]
                    "
                  >
                    Investing Foundations
                  </p>
                </div>

                <div
                  className="
                    mt-8
                    grid
                    w-full
                    gap-5
                    border-t
                    border-[var(--border-subtle)]
                    pt-6
                    sm:grid-cols-[1fr_auto]
                    sm:items-center
                  "
                >
                  <div className="text-left">
                    <p
                      className="
                        text-[10px]
                        font-extrabold
                        uppercase
                        tracking-[0.14em]
                        text-[var(--text-muted)]
                      "
                    >
                      Certificate Number
                    </p>

                    <p
                      className="
                        mt-1
                        font-mono
                        text-sm
                        font-bold
                        text-[var(--text-primary)]
                      "
                    >
                      CASEU-XXXX-XXXXXX
                    </p>

                    <div
                      className="
                        mt-3
                        inline-flex
                        items-center
                        gap-2
                        rounded-full
                        border
                        border-[var(--primary-border)]
                        bg-[var(--primary-soft)]
                        px-3
                        py-1.5
                        text-xs
                        font-bold
                        text-[var(--primary)]
                      "
                    >
                      <ShieldCheckIcon />

                      Publicly verifiable
                    </div>
                  </div>

                  <div
                    className="
                      mx-auto
                      flex
                      h-28
                      w-28
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-[var(--border-default)]
                      bg-white
                      p-3
                      text-black
                      shadow-[var(--shadow-xs)]
                    "
                    aria-label="Certificate QR code preview"
                  >
                    <div
                      className="
                        grid
                        h-full
                        w-full
                        grid-cols-5
                        grid-rows-5
                        gap-1
                      "
                      aria-hidden="true"
                    >
                      {[
                        true,
                        true,
                        true,
                        false,
                        true,
                        true,
                        false,
                        true,
                        true,
                        false,
                        true,
                        true,
                        false,
                        true,
                        true,
                        false,
                        true,
                        true,
                        false,
                        true,
                        true,
                        false,
                        true,
                        true,
                        true,
                      ].map(
                        (
                          filled,
                          index,
                        ) => (
                          <span
                            key={index}
                            className={
                              filled
                                ? "rounded-[2px] bg-black"
                                : "rounded-[2px] bg-transparent"
                            }
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="
                mt-4
                flex
                items-start
                gap-3
                rounded-2xl
                border
                border-[var(--primary-border)]
                bg-[var(--primary-soft)]
                p-4
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-[var(--surface-default)]
                  text-[var(--primary)]
                  shadow-[var(--shadow-xs)]
                "
              >
                <QrIcon />
              </div>

              <div>
                <p
                  className="
                    text-sm
                    font-black
                    text-[var(--text-primary)]
                  "
                >
                  Scan. Verify. Confirm.
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    leading-6
                    text-[var(--text-secondary)]
                  "
                >
                  Issued certificates include a QR code that opens
                  their public CASE University verification record.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}