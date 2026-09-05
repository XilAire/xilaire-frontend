"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  QRCodeSVG,
} from "qrcode.react";

type CertificateQrCodeProps = {
  certificateNumber: string;
};

function LinkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15" />
      <path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15" />
    </svg>
  );
}

function normalizeBaseUrl(
  value: string,
) {
  return value
    .trim()
    .replace(
      /\/+$/,
      "",
    );
}

export default function CertificateQrCode({
  certificateNumber,
}: CertificateQrCodeProps) {
  const [
    browserOrigin,
    setBrowserOrigin,
  ] =
    useState("");

  useEffect(() => {
    setBrowserOrigin(
      window.location.origin,
    );
  }, []);

  const configuredBaseUrl =
    normalizeBaseUrl(
      process.env
        .NEXT_PUBLIC_CASE_UNIVERSITY_APP_URL ??
        "",
    );

  const baseUrl =
    configuredBaseUrl ||
    normalizeBaseUrl(
      browserOrigin,
    );

  const verificationUrl =
    useMemo(() => {
      if (!baseUrl) {
        return "";
      }

      return `${baseUrl}/verify/${encodeURIComponent(
        certificateNumber,
      )}`;
    }, [
      baseUrl,
      certificateNumber,
    ]);

  return (
    <div
      className="
        mx-auto
        mt-8
        grid
        max-w-2xl
        gap-5
        rounded-2xl
        border
        border-[var(--achievement-border)]
        bg-[var(--achievement-soft)]
        p-5
        text-left
        sm:grid-cols-[auto_1fr]
        sm:items-center
        sm:p-6
        print:grid-cols-[auto_1fr]
        print:border-black
        print:bg-white
      "
    >
      <div
        className="
          mx-auto
          flex
          h-[156px]
          w-[156px]
          items-center
          justify-center
          rounded-2xl
          border
          border-[var(--achievement-border)]
          bg-white
          p-3
          shadow-[var(--shadow-xs)]
          sm:mx-0
          print:border-black
          print:shadow-none
        "
      >
        {verificationUrl ? (
          <QRCodeSVG
            value={
              verificationUrl
            }
            size={128}
            level="H"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#000000"
            title="CASE University certificate verification QR code"
          />
        ) : (
          <div
            className="
              h-32
              w-32
              animate-pulse
              rounded-lg
              bg-[var(--surface-muted)]
              print:hidden
            "
            aria-hidden="true"
          />
        )}
      </div>

      <div
        className="
          min-w-0
          text-center
          sm:text-left
          print:text-left
        "
      >
        <p
          className="
            text-[10px]
            font-extrabold
            uppercase
            tracking-[0.16em]
            text-[var(--achievement)]
            print:text-black
          "
        >
          Scan to verify
        </p>

        <h3
          className="
            mt-1
            text-lg
            font-black
            tracking-tight
            text-[var(--text-primary)]
            print:text-black
          "
        >
          Verify this credential
        </h3>

        <p
          className="
            mt-2
            text-sm
            leading-6
            text-[var(--text-secondary)]
            print:text-black
          "
        >
          Scan the QR code or use the verification link to confirm this CASE University credential.
        </p>

        {verificationUrl ? (
          <div
            className="
              mt-3
              flex
              items-start
              justify-center
              gap-2
              sm:justify-start
              print:justify-start
            "
          >
            <span
              className="
                mt-0.5
                shrink-0
                text-[var(--text-muted)]
                print:text-black
              "
            >
              <LinkIcon />
            </span>

            <a
              href={
                verificationUrl
              }
              target="_blank"
              rel="noreferrer"
              className="
                min-w-0
                break-all
                font-mono
                text-[11px]
                font-semibold
                leading-5
                text-[var(--primary)]
                underline-offset-4
                transition
                hover:underline
                focus-visible:rounded
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[var(--focus-ring)]
                print:text-black
                print:no-underline
              "
            >
              {
                verificationUrl
              }
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}