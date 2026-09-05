function UniversityLoaderMark() {
  return (
    <div
      className="
        relative
        flex
        h-16
        w-16
        items-center
        justify-center
      "
    >
      <div
        className="
          absolute
          inset-0
          animate-spin
          rounded-full
          border-[3px]
          border-[var(--border-subtle)]
          border-t-[var(--primary)]
        "
        aria-hidden="true"
      />

      <div
        className="
          flex
          h-11
          w-11
          items-center
          justify-center
          rounded-2xl
          border
          border-[var(--primary-border)]
          bg-[var(--primary-soft)]
          text-sm
          font-black
          tracking-tight
          text-[var(--primary)]
          shadow-[var(--shadow-xs)]
        "
      >
        CU
      </div>
    </div>
  );
}

function LoadingBar() {
  return (
    <div
      className="
        relative
        h-1
        w-full
        max-w-[180px]
        overflow-hidden
        rounded-full
        bg-[var(--border-subtle)]
      "
      aria-hidden="true"
    >
      <div
        className="
          absolute
          inset-y-0
          left-0
          w-1/2
          animate-[university-loading-bar_1.2s_ease-in-out_infinite]
          rounded-full
          bg-[var(--primary)]
        "
      />
    </div>
  );
}

export default function Loading() {
  return (
    <>
      <style>
        {`
          @keyframes university-loading-bar {
            0% {
              transform: translateX(-120%);
            }

            50% {
              transform: translateX(100%);
            }

            100% {
              transform: translateX(320%);
            }
          }
        `}
      </style>

      <div
        className="
          flex
          min-h-[calc(100dvh-5rem)]
          w-full
          items-center
          justify-center
          px-4
          py-12
          sm:px-6
          lg:px-8
        "
        role="status"
        aria-live="polite"
        aria-label="Loading CASE University"
      >
        <div
          className="
            flex
            w-full
            max-w-sm
            flex-col
            items-center
            text-center
          "
        >
          <UniversityLoaderMark />

          <p
            className="
              mt-6
              text-xs
              font-extrabold
              uppercase
              tracking-[0.18em]
              text-[var(--primary)]
            "
          >
            CASE University
          </p>

          <h2
            className="
              mt-2
              text-lg
              font-bold
              tracking-tight
              text-[var(--text-primary)]
              sm:text-xl
            "
          >
            Loading your learning experience
          </h2>

          <p
            className="
              mt-2
              max-w-xs
              text-sm
              leading-6
              text-[var(--text-secondary)]
            "
          >
            Preparing your course content and progress.
          </p>

          <div className="mt-6 flex w-full justify-center">
            <LoadingBar />
          </div>
        </div>
      </div>
    </>
  );
}