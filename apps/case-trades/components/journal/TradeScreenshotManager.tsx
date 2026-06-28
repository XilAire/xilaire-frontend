"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import { uploadTradeScreenshot } from "@/lib/journal/uploadTradeScreenshot";
import { deleteTradeScreenshot } from "@/lib/journal/deleteTradeScreenshot";

type ScreenshotType = "BEFORE" | "DURING" | "AFTER" | "BROKER_CONFIRMATION";

export type TradeScreenshot = {
  id: string;
  execution_id: string;
  signal_id?: string | null;
  screenshot_type: ScreenshotType | string;
  file_url: string;
  file_path?: string | null;
  caption?: string | null;
  created_at?: string | null;
};

type TradeScreenshotManagerProps = {
  tradeId: string;
  signalId: string;
  initialScreenshots?: TradeScreenshot[];
};

const SCREENSHOT_TYPES: {
  value: ScreenshotType;
  label: string;
  description: string;
}[] = [
  {
    value: "BEFORE",
    label: "Before",
    description: "Setup before entry.",
  },
  {
    value: "DURING",
    label: "During",
    description: "Trade management while active.",
  },
  {
    value: "AFTER",
    label: "After",
    description: "Final result after exit.",
  },
  {
    value: "BROKER_CONFIRMATION",
    label: "Broker Confirmation",
    description: "Broker fill or order confirmation.",
  },
];

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getScreenshotTypeLabel(type: string) {
  return (
    SCREENSHOT_TYPES.find((item) => item.value === type)?.label ??
    type.replaceAll("_", " ")
  );
}

export default function TradeScreenshotManager({
  tradeId,
  signalId,
  initialScreenshots = [],
}: TradeScreenshotManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();

  const [screenshots, setScreenshots] =
    useState<TradeScreenshot[]>(initialScreenshots);
  const [selectedType, setSelectedType] = useState<ScreenshotType>("BEFORE");
  const [caption, setCaption] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const groupedScreenshots = useMemo(() => {
    return SCREENSHOT_TYPES.map((type) => ({
      ...type,
      screenshots: screenshots.filter(
        (screenshot) => screenshot.screenshot_type === type.value
      ),
    }));
  }, [screenshots]);

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFileName(file?.name ?? null);
    setMessage(null);
  }

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0] ?? null;

    if (!file) {
      setMessage({
        type: "error",
        text: "Please choose a screenshot first.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("tradeId", tradeId);
    formData.append("signalId", signalId);
    formData.append("screenshotType", selectedType);
    formData.append("caption", caption);
    formData.append("file", file);

    setMessage(null);

    startTransition(async () => {
      const result = await uploadTradeScreenshot(formData);

      if (!result.success) {
        setMessage({
          type: "error",
          text: result.error,
        });
        return;
      }

      setScreenshots((current) => [...current, result.screenshot]);
      setCaption("");
      setSelectedFileName(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setMessage({
        type: "success",
        text: "Screenshot uploaded successfully.",
      });

      router.refresh();
    });
  }

  function handleDelete(screenshotId: string) {
    setMessage(null);

    startTransition(async () => {
      const result = await deleteTradeScreenshot({
        screenshotId,
      });

      if (!result.success) {
        setMessage({
          type: "error",
          text: result.error,
        });
        return;
      }

      setScreenshots((current) =>
        current.filter((item) => item.id !== screenshotId)
      );

      setMessage({
        type: "success",
        text: "Screenshot deleted.",
      });

      router.refresh();
    });
  }

  return (
    <section className="space-y-5 rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <Camera className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Trade Screenshots
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
              Attach before, during, after, and broker confirmation screenshots
              to this execution.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950 p-4 lg:min-w-[360px]">
          <div className="grid gap-3">
            <div>
              <label className="text-sm font-medium text-slate-200">
                Screenshot Type
              </label>

              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(e.target.value as ScreenshotType)
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/50"
              >
                {SCREENSHOT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-200">
                Caption
              </label>

              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Example: Clean VWAP reclaim before entry"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handlePickFile}
                disabled={isPending}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ImagePlus className="h-4 w-4" />
                {selectedFileName ?? "Choose File"}
              </button>

              <button
                type="button"
                onClick={handleUpload}
                disabled={isPending}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isPending ? "Uploading..." : "Upload Screenshot"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={
            "rounded-lg border px-4 py-3 text-sm " +
            (message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : message.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-sky-500/30 bg-sky-500/10 text-sky-300")
          }
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {groupedScreenshots.map((group) => (
          <div
            key={group.value}
            className="rounded-xl border border-white/10 bg-slate-950 p-4"
          >
            <div className="mb-4">
              <h3 className="font-semibold text-slate-100">{group.label}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {group.description}
              </p>
            </div>

            {group.screenshots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 bg-slate-900/60 p-4 text-center">
                <Camera className="mx-auto h-5 w-5 text-slate-600" />
                <p className="mt-2 text-xs text-slate-500">
                  No screenshot yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {group.screenshots.map((screenshot) => (
                  <div
                    key={screenshot.id}
                    className="overflow-hidden rounded-lg border border-white/10 bg-slate-900"
                  >
                    <a
                      href={screenshot.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={screenshot.file_url}
                        alt={
                          screenshot.caption ||
                          getScreenshotTypeLabel(screenshot.screenshot_type)
                        }
                        className="h-40 w-full object-cover"
                      />
                    </a>

                    <div className="space-y-2 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          {getScreenshotTypeLabel(
                            screenshot.screenshot_type
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDelete(screenshot.id)}
                          disabled={isPending}
                          className="rounded-md border border-red-500/20 p-1.5 text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="Delete screenshot"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {screenshot.caption && (
                        <p className="text-xs leading-5 text-slate-300">
                          {screenshot.caption}
                        </p>
                      )}

                      <p className="text-[11px] text-slate-600">
                        {formatDateTime(screenshot.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}