"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";

import {
  importBrokerTrades,
  previewBrokerImport,
  type ImportPreviewResult,
  type ImportTradesResult,
} from "./actions";
import type { ParsedBrokerTrade } from "@/lib/journal/import/parseBrokerCsv";

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}$${Math.abs(value).toFixed(2)}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString();
}

function isPreviewSuccess(
  preview: ImportPreviewResult | null
): preview is Extract<ImportPreviewResult, { success: true }> {
  return Boolean(preview && preview.success === true);
}

function isPreviewFailure(
  preview: ImportPreviewResult | null
): preview is Extract<ImportPreviewResult, { success: false }> {
  return Boolean(preview && preview.success === false);
}

function isImportSuccess(
  result: ImportTradesResult | null
): result is Extract<ImportTradesResult, { success: true }> {
  return Boolean(result && result.success === true);
}

function isImportFailure(
  result: ImportTradesResult | null
): result is Extract<ImportTradesResult, { success: false }> {
  return Boolean(result && result.success === false);
}

export default function JournalImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportTradesResult | null>(
    null
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isImportPending, startImportTransition] = useTransition();

  const previewSuccess = isPreviewSuccess(preview);
  const previewFailure = isPreviewFailure(preview);
  const importSuccess = isImportSuccess(importResult);
  const importFailure = isImportFailure(importResult);

  const trades = useMemo<ParsedBrokerTrade[]>(() => {
    if (!previewSuccess) return [];
    return preview.trades;
  }, [previewSuccess, preview]);

  async function handleFile(file: File) {
    setFileName(file.name);
    setPreview(null);
    setImportResult(null);

    const text = await file.text();
    setCsvText(text);

    startPreviewTransition(async () => {
      const result = await previewBrokerImport(text);
      setPreview(result);
    });
  }

  function handleImport() {
    if (!previewSuccess || preview.trades.length === 0) return;

    startImportTransition(async () => {
      const result = await importBrokerTrades(preview.trades);
      setImportResult(result);
    });
  }

  function handleReset() {
    setCsvText("");
    setPreview(null);
    setImportResult(null);
    setFileName(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6 overflow-hidden">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
              Journal Import
            </p>

            <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">
              Import Trades
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Upload a broker CSV from Charles Schwab, Robinhood, Fidelity, or a
              generic trade export. CASE Trades will parse the file, preview the
              trades, detect duplicates, and import them into your journal.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-200 xl:max-w-md">
            Supported: Schwab, Robinhood, Fidelity, Webull, IBKR, Tastytrade,
            E*TRADE, TradeStation, ThinkOrSwim, Generic CSV
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="min-w-0 rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <Upload className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Upload CSV
              </h2>
              <p className="text-sm text-slate-400">
                Select a broker export file to preview.
              </p>
            </div>
          </div>

          <div
            className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-slate-950/70 p-8 text-center transition hover:border-emerald-500/40 hover:bg-slate-950"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();

              const file = event.dataTransfer.files?.[0];

              if (file) {
                void handleFile(file);
              }
            }}
          >
            <FileSpreadsheet className="h-10 w-10 text-slate-500" />
            <p className="mt-4 text-sm font-medium text-slate-200">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-slate-500">CSV files only</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void handleFile(file);
                }
              }}
            />
          </div>

          {fileName ? (
            <div className="mt-4 truncate rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
              <span className="font-medium text-slate-100">
                Selected file:
              </span>{" "}
              {fileName}
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPreviewPending || isImportPending}
            >
              {isPreviewPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing…
                </>
              ) : (
                "Choose CSV"
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex w-full items-center justify-center rounded-lg border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!csvText || isPreviewPending || isImportPending}
            >
              Reset
            </button>
          </div>

          {previewFailure ? (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                Import preview failed
              </div>

              <ul className="list-inside list-disc space-y-1">
                {preview.errors.map((error: string) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {previewSuccess && preview.warnings.length > 0 ? (
            <div className="mt-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                Warnings
              </div>

              <ul className="list-inside list-disc space-y-1">
                {preview.warnings.map((warning: string) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {importResult ? (
            <div
              className={
                importSuccess
                  ? "mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
                  : "mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
              }
            >
              <div className="mb-2 flex items-center gap-2 font-semibold">
                {importSuccess ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {importSuccess ? "Import complete" : "Import failed"}
              </div>

              {importSuccess ? (
                <p>
                  Imported {importResult.imported} trades. Skipped{" "}
                  {importResult.skipped} duplicates or invalid rows.
                </p>
              ) : null}

              {importFailure ? (
                <ul className="list-inside list-disc space-y-1">
                  {importResult.errors.map((error: string) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-sm">
          <div className="border-b border-white/10 p-5 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-100">
                  Import Preview
                </h2>
                <p className="text-sm text-slate-400">
                  Review parsed trades before saving them to your journal.
                </p>
              </div>

              {previewSuccess ? (
                <div className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-300 lg:w-auto lg:max-w-xs">
                  <span className="text-slate-500">Broker:</span>{" "}
                  <span className="break-words font-semibold text-emerald-300">
                    {preview.broker}
                  </span>{" "}
                  · {preview.totalTrades} trades
                </div>
              ) : null}
            </div>
          </div>

          {!preview ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center text-slate-500">
              <FileSpreadsheet className="h-12 w-12" />
              <p className="mt-4 text-sm font-medium text-slate-300">
                Upload a CSV to preview trades.
              </p>
            </div>
          ) : null}

          {previewSuccess && trades.length > 0 ? (
            <>
              <div className="hidden md:block">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="border-b border-white/10 bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-[20%] px-4 py-3">Symbol</th>
                      <th className="w-[12%] px-4 py-3">Type</th>
                      <th className="w-[10%] px-4 py-3">Side</th>
                      <th className="w-[17%] px-4 py-3">Entry</th>
                      <th className="w-[17%] px-4 py-3">Exit</th>
                      <th className="w-[10%] px-4 py-3">Qty</th>
                      <th className="w-[14%] px-4 py-3 text-right">P/L</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {trades
                      .slice(0, 100)
                      .map((trade: ParsedBrokerTrade, index: number) => (
                        <tr
                          key={`${trade.symbol}-${index}`}
                          className="text-slate-300"
                        >
                          <td className="truncate px-4 py-3 font-semibold text-slate-100">
                            {trade.symbol}
                          </td>
                          <td className="truncate px-4 py-3">
                            {trade.instrument_type}
                          </td>
                          <td className="truncate px-4 py-3">{trade.side}</td>
                          <td className="px-4 py-3">
                            <div className="truncate">
                              {formatDate(trade.entry_date)}
                            </div>
                            <div className="truncate text-xs text-slate-500">
                              {formatMoney(trade.entry_price)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="truncate">
                              {formatDate(trade.exit_date)}
                            </div>
                            <div className="truncate text-xs text-slate-500">
                              {formatMoney(trade.exit_price)}
                            </div>
                          </td>
                          <td className="truncate px-4 py-3">
                            {trade.quantity ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="truncate font-medium">
                              {formatMoney(trade.profit_loss)}
                            </div>
                            <div className="truncate text-xs text-slate-500">
                              {formatPercent(trade.profit_loss_pct)}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-4 md:hidden">
                {trades
                  .slice(0, 100)
                  .map((trade: ParsedBrokerTrade, index: number) => (
                    <div
                      key={`${trade.symbol}-${index}`}
                      className="rounded-xl border border-white/10 bg-slate-950/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-slate-100">
                            {trade.symbol}
                          </div>
                          <div className="text-xs text-slate-500">
                            {trade.instrument_type} · {trade.side}
                          </div>
                        </div>

                        <div className="shrink-0 text-right text-sm font-medium text-slate-200">
                          {formatMoney(trade.profit_loss)}
                          <div className="text-xs text-slate-500">
                            {formatPercent(trade.profit_loss_pct)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">
                            Entry
                          </div>
                          <div className="mt-1 text-slate-200">
                            {formatDate(trade.entry_date)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatMoney(trade.entry_price)}
                          </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">
                            Exit
                          </div>
                          <div className="mt-1 text-slate-200">
                            {formatDate(trade.exit_date)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatMoney(trade.exit_price)}
                          </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">
                            Quantity
                          </div>
                          <div className="mt-1 text-slate-200">
                            {trade.quantity ?? "—"}
                          </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">
                            Broker
                          </div>
                          <div className="mt-1 text-slate-200">
                            {trade.broker}
                          </div>
                        </div>
                      </div>

                      {trade.notes ? (
                        <p className="mt-3 line-clamp-2 text-xs text-slate-500">
                          {trade.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
              </div>

              {trades.length > 100 ? (
                <div className="border-t border-white/10 p-4 text-sm text-slate-500">
                  Showing first 100 of {trades.length} parsed trades.
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <p className="text-sm text-slate-400">
                  Ready to import {trades.length} trades into your journal.
                </p>

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isImportPending}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isImportPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    "Import Trades"
                  )}
                </button>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}