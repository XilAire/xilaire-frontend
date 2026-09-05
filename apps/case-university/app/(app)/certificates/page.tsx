import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import {
  getCurrentUserCertificates,
} from "@/lib/university/certificates";

function AwardIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="5"
      />

      <path d="m8.5 12.5-1.5 8 5-3 5 3-1.5-8" />
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

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function formatIssuedDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  ).format(date);
}

function formatDuration(
  minutes:
    | number
    | null,
) {
  if (
    !minutes ||
    minutes <= 0
  ) {
    return null;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  const remainingMinutes =
    minutes % 60;

  if (
    hours > 0 &&
    remainingMinutes > 0
  ) {
    return `${hours}h ${remainingMinutes}m`;
  }

  if (
    hours > 0
  ) {
    return `${hours}h`;
  }

  return `${remainingMinutes}m`;
}

export const dynamic =
  "force-dynamic";

export default async function CertificatesPage() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/auth/signin?redirect=/certificates",
    );
  }

  const certificates =
    await getCurrentUserCertificates();

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
        lg:py-10
      "
    >
      <section
        className="
          overflow-hidden
          rounded-2xl
          border
          border-[var(--achievement-border)]
          bg-[var(--achievement-soft)]
          shadow-[var(--shadow-sm)]
        "
      >
        <div
          className="
            p-5
            sm:p-6
            lg:p-8
          "
        >
          <div
            className="
              flex
              flex-col
              gap-5
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            <div
              className="
                flex
                items-start
                gap-4
              "
            >
              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-[var(--achievement-border)]
                  bg-[var(--surface-default)]
                  text-[var(--achievement)]
                  shadow-[var(--shadow-xs)]
                "
              >
                <AwardIcon />
              </div>

              <div
                className="
                  min-w-0
                "
              >
                <p
                  className="
                    text-xs
                    font-extrabold
                    uppercase
                    tracking-[0.18em]
                    text-[var(--achievement)]
                  "
                >
                  Achievements
                </p>

                <h1
                  className="
                    mt-1
                    text-2xl
                    font-bold
                    tracking-tight
                    text-[var(--text-primary)]
                    sm:text-3xl
                  "
                >
                  Certificates
                </h1>

                <p
                  className="
                    mt-2
                    max-w-2xl
                    text-sm
                    leading-6
                    text-[var(--text-secondary)]
                    sm:text-base
                  "
                >
                  View the CASE University certificates you have earned by completing your courses.
                </p>
              </div>
            </div>

            <div
              className="
                inline-flex
                items-center
                gap-3
                self-start
                rounded-xl
                border
                border-[var(--achievement-border)]
                bg-[var(--surface-default)]
                px-4
                py-3
                shadow-[var(--shadow-xs)]
                lg:self-auto
              "
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-[var(--achievement-soft)]
                  text-[var(--achievement)]
                "
              >
                <CheckIcon />
              </div>

              <div>
                <p
                  className="
                    text-xs
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-[var(--text-muted)]
                  "
                >
                  Earned
                </p>

                <p
                  className="
                    text-xl
                    font-black
                    text-[var(--text-primary)]
                  "
                >
                  {
                    certificates.length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {certificates.length ===
      0 ? (
        <section
          className="
            mt-8
            rounded-2xl
            border
            border-dashed
            border-[var(--border-default)]
            bg-[var(--surface-default)]
            px-5
            py-10
            text-center
            shadow-[var(--shadow-xs)]
            sm:px-8
            sm:py-14
          "
        >
          <div
            className="
              mx-auto
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              bg-[var(--surface-muted)]
              text-[var(--text-muted)]
            "
          >
            <AwardIcon />
          </div>

          <h2
            className="
              mt-5
              text-xl
              font-bold
              tracking-tight
              text-[var(--text-primary)]
            "
          >
            No certificates yet
          </h2>

          <p
            className="
              mx-auto
              mt-2
              max-w-xl
              text-sm
              leading-6
              text-[var(--text-secondary)]
            "
          >
            Complete every required lesson in a CASE University course to unlock and claim its certificate.
          </p>

          <Link
            href="/learning"
            className="
              mt-6
              inline-flex
              min-h-11
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[var(--primary)]
              px-5
              py-2.5
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
            Continue learning

            <ArrowRightIcon />
          </Link>
        </section>
      ) : (
        <section
          className="
            mt-8
          "
        >
          <div
            className="
              mb-5
              flex
              items-end
              justify-between
              gap-4
            "
          >
            <div>
              <p
                className="
                  text-xs
                  font-extrabold
                  uppercase
                  tracking-[0.18em]
                  text-[var(--primary)]
                "
              >
                Earned certificates
              </p>

              <h2
                className="
                  mt-1
                  text-xl
                  font-bold
                  tracking-tight
                  text-[var(--text-primary)]
                  sm:text-2xl
                "
              >
                Your achievements
              </h2>
            </div>
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-5
              md:grid-cols-2
              xl:grid-cols-3
            "
          >
            {certificates.map(
              ({
                certificate,
                course,
              }) => {
                const duration =
                  formatDuration(
                    course?.estimated_minutes ??
                      null,
                  );

                return (
                  <article
                    key={
                      certificate.id
                    }
                    className="
                      flex
                      min-h-full
                      flex-col
                      overflow-hidden
                      rounded-2xl
                      border
                      border-[var(--achievement-border)]
                      bg-[var(--surface-default)]
                      shadow-[var(--shadow-sm)]
                      transition
                      hover:-translate-y-0.5
                      hover:shadow-[var(--shadow-md)]
                    "
                  >
                    <div
                      className="
                        border-b
                        border-[var(--achievement-border)]
                        bg-[var(--achievement-soft)]
                        p-5
                        sm:p-6
                      "
                    >
                      <div
                        className="
                          flex
                          items-start
                          justify-between
                          gap-4
                        "
                      >
                        <div
                          className="
                            flex
                            h-11
                            w-11
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-[var(--achievement-border)]
                            bg-[var(--surface-default)]
                            text-[var(--achievement)]
                            shadow-[var(--shadow-xs)]
                          "
                        >
                          <AwardIcon />
                        </div>

                        <span
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-full
                            border
                            border-[var(--achievement-border)]
                            bg-[var(--surface-default)]
                            px-2.5
                            py-1
                            text-[10px]
                            font-extrabold
                            uppercase
                            tracking-[0.08em]
                            text-[var(--achievement)]
                          "
                        >
                          <CheckIcon />
                          Earned
                        </span>
                      </div>

                      <p
                        className="
                          mt-5
                          text-xs
                          font-bold
                          uppercase
                          tracking-[0.14em]
                          text-[var(--achievement)]
                        "
                      >
                        CASE University
                      </p>

                      <h3
                        className="
                          mt-1
                          text-xl
                          font-bold
                          tracking-tight
                          text-[var(--text-primary)]
                        "
                      >
                        {course?.title ??
                          "Course Certificate"}
                      </h3>

                      {course?.short_description ? (
                        <p
                          className="
                            mt-2
                            line-clamp-3
                            text-sm
                            leading-6
                            text-[var(--text-secondary)]
                          "
                        >
                          {
                            course.short_description
                          }
                        </p>
                      ) : null}
                    </div>

                    <div
                      className="
                        flex
                        flex-1
                        flex-col
                        p-5
                        sm:p-6
                      "
                    >
                      <dl
                        className="
                          space-y-4
                        "
                      >
                        <div>
                          <dt
                            className="
                              text-[10px]
                              font-extrabold
                              uppercase
                              tracking-[0.14em]
                              text-[var(--text-muted)]
                            "
                          >
                            Certificate number
                          </dt>

                          <dd
                            className="
                              mt-1
                              break-all
                              font-mono
                              text-xs
                              font-bold
                              leading-5
                              text-[var(--text-primary)]
                            "
                          >
                            {
                              certificate.certificate_number
                            }
                          </dd>
                        </div>

                        <div
                          className="
                            grid
                            grid-cols-2
                            gap-4
                          "
                        >
                          <div>
                            <dt
                              className="
                                text-[10px]
                                font-extrabold
                                uppercase
                                tracking-[0.14em]
                                text-[var(--text-muted)]
                              "
                            >
                              Issued
                            </dt>

                            <dd
                              className="
                                mt-1
                                text-sm
                                font-semibold
                                text-[var(--text-primary)]
                              "
                            >
                              {
                                formatIssuedDate(
                                  certificate.issued_at,
                                )
                              }
                            </dd>
                          </div>

                          <div>
                            <dt
                              className="
                                text-[10px]
                                font-extrabold
                                uppercase
                                tracking-[0.14em]
                                text-[var(--text-muted)]
                              "
                            >
                              Level
                            </dt>

                            <dd
                              className="
                                mt-1
                                text-sm
                                font-semibold
                                capitalize
                                text-[var(--text-primary)]
                              "
                            >
                              {course?.difficulty ??
                                "Course"}
                            </dd>
                          </div>
                        </div>

                        {duration ? (
                          <div>
                            <dt
                              className="
                                text-[10px]
                                font-extrabold
                                uppercase
                                tracking-[0.14em]
                                text-[var(--text-muted)]
                              "
                            >
                              Course duration
                            </dt>

                            <dd
                              className="
                                mt-1
                                text-sm
                                font-semibold
                                text-[var(--text-primary)]
                              "
                            >
                              {
                                duration
                              }
                            </dd>
                          </div>
                        ) : null}
                      </dl>

                      <div
                        className="
                          mt-auto
                          grid
                          gap-2
                          pt-6
                        "
                      >
                        <Link
                          href={`/certificates/${certificate.id}`}
                          className="
                            inline-flex
                            min-h-11
                            w-full
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            bg-[var(--achievement)]
                            px-4
                            py-2.5
                            text-sm
                            font-bold
                            text-white
                            shadow-[var(--shadow-sm)]
                            outline-none
                            transition
                            hover:opacity-90
                            focus-visible:ring-2
                            focus-visible:ring-[var(--focus-ring)]
                          "
                        >
                          <AwardIcon />

                          View certificate

                          <ArrowRightIcon />
                        </Link>

                        {course?.slug ? (
                          <Link
                            href={`/courses/${course.slug}`}
                            className="
                              inline-flex
                              min-h-11
                              w-full
                              items-center
                              justify-center
                              gap-2
                              rounded-xl
                              border
                              border-[var(--border-default)]
                              bg-[var(--surface-default)]
                              px-4
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
                            Review course

                            <ArrowRightIcon />
                          </Link>
                        ) : (
                          <div
                            className="
                              flex
                              min-h-11
                              items-center
                              justify-center
                              rounded-xl
                              border
                              border-[var(--border-subtle)]
                              bg-[var(--surface-muted)]
                              px-4
                              text-sm
                              font-semibold
                              text-[var(--text-muted)]
                            "
                          >
                            Course unavailable
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        </section>
      )}
    </div>
  );
}