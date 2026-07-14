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
import type { GroupedBrokerStrategyTrade } from "@/lib/journal/import/groupStrategies";

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

function formatDisplayText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "—";
  }

  if (normalized.toLowerCase() === "leap") {
    return "LEAP";
  }

  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDebitCredit(
  value: string | null | undefined,
) {
  const normalized =
    String(value ?? "")
      .trim()
      .toUpperCase();

  if (normalized === "DEBIT") {
    return "Net Debit";
  }

  if (normalized === "CREDIT") {
    return "Net Credit";
  }

  if (normalized === "EVEN") {
    return "Net Entry";
  }

  return "Entry";
}

function getTradeKey(
  trade: GroupedBrokerStrategyTrade,
  index: number,
) {
  return [
    trade.symbol,
    trade.strategy_type,
    trade.entry_date,
    trade.exit_date,
    trade.leg_count,
    index,
  ].join("-");
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

  const trades = useMemo<GroupedBrokerStrategyTrade[]>(() => {
    if (!previewSuccess) {
      return [];
    }

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
              trades, reconstruct lifecycle activity, group related option
              contracts into multi-leg strategies, detect strategy and execution
              metadata, identify duplicates, and import them into your journal.
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

          {previewFailure && preview.warnings.length > 0 ? (
            <div className="mt-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                Preview warnings
              </div>

              <ul className="list-inside list-disc space-y-1">
                {preview.warnings.map((warning: string) => (
                  <li key={warning}>{warning}</li>
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
                <>
                  <p>
                    Imported {importResult.imported} trades. Skipped{" "}
                    {importResult.skipped} duplicates or invalid rows.
                  </p>

                  {importResult.warnings.length > 0 ? (
                    <ul className="mt-3 list-inside list-disc space-y-1 text-yellow-200">
                      {importResult.warnings.map((warning: string) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
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
                  Review parsed trades before saving them to your journal. Strategy, execution style, and multi-leg structures will be detected during import where supported.
                </p>
              </div>

              {previewSuccess ? (
                <div className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-300 lg:w-auto lg:max-w-md">
                  <span className="text-slate-500">Broker:</span>{" "}
                  <span className="break-words font-semibold text-emerald-300">
                    {preview.broker}
                  </span>{" "}
                  · {preview.totalTrades} strategies ·{" "}
                  {preview.groupedStrategies} grouped ·{" "}
                  {preview.totalOptionLegs} option legs
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
              <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-4">
                <PreviewMetricCard
                  label="Strategies"
                  value={String(preview.totalTrades)}
                />

                <PreviewMetricCard
                  label="Grouped Strategies"
                  value={String(preview.groupedStrategies)}
                />

                <PreviewMetricCard
                  label="Option Legs"
                  value={String(preview.totalOptionLegs)}
                />

                <PreviewMetricCard
                  label="Single Trades"
                  value={String(
                    Math.max(
                      preview.totalTrades -
                        preview.groupedStrategies,
                      0,
                    ),
                  )}
                />
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[1450px] w-full table-fixed text-left text-sm">
                  <thead className="border-b border-white/10 bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-[150px] px-4 py-3">Symbol</th>
                      <th className="w-[180px] px-4 py-3">Strategy</th>
                      <th className="w-[110px] px-4 py-3">Execution</th>
                      <th className="w-[90px] px-4 py-3">Grouped</th>
                      <th className="w-[90px] px-4 py-3">Legs</th>
                      <th className="w-[130px] px-4 py-3">Entry Type</th>
                      <th className="w-[130px] px-4 py-3">Net Entry</th>
                      <th className="w-[130px] px-4 py-3">Paid</th>
                      <th className="w-[130px] px-4 py-3">Received</th>
                      <th className="w-[170px] px-4 py-3">Entry</th>
                      <th className="w-[170px] px-4 py-3">Exit</th>
                      <th className="w-[110px] px-4 py-3">Contracts</th>
                      <th className="w-[140px] px-4 py-3 text-right">P/L</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {trades
                      .slice(0, 100)
                      .map(
                        (
                          trade: GroupedBrokerStrategyTrade,
                          index: number,
                        ) => (
                          <tr
                            key={getTradeKey(trade, index)}
                            className="align-top text-slate-300"
                          >
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-100">
                                {trade.symbol}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {trade.instrument_type}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="break-words font-medium text-purple-300">
                                {formatDisplayText(
                                  trade.strategy_type,
                                )}
                              </div>

                              {trade.option_legs.length > 0 ? (
                                <div className="mt-2 space-y-1 text-xs text-slate-500">
                                  {trade.option_legs.map((leg) => (
                                    <div
                                      key={leg.id}
                                      className="break-words"
                                    >
                                      {formatDisplayText(leg.action)}{" "}
                                      {leg.contracts} ×{" "}
                                      {leg.strike_price ?? "—"}{" "}
                                      {leg.option_type}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </td>

                            <td className="px-4 py-3">
                              {formatDisplayText(trade.trade_style)}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={
                                  trade.grouped
                                    ? "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300"
                                    : "inline-flex rounded-full border border-white/10 bg-slate-950 px-2 py-1 text-xs font-semibold text-slate-400"
                                }
                              >
                                {trade.grouped ? "Yes" : "No"}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              {trade.leg_count}
                            </td>

                            <td className="px-4 py-3">
                              {formatDebitCredit(
                                trade.strategy_entry_type,
                              )}
                            </td>

                            <td className="px-4 py-3 font-medium text-slate-100">
                              {formatMoney(
                                trade.strategy_entry_price,
                              )}
                            </td>

                            <td className="px-4 py-3 text-red-300">
                              {formatMoney(trade.total_debit)}
                            </td>

                            <td className="px-4 py-3 text-emerald-300">
                              {formatMoney(trade.total_credit)}
                            </td>

                            <td className="px-4 py-3">
                              <div>
                                {formatDate(trade.entry_date)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {formatMoney(trade.entry_price)}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div>
                                {formatDate(trade.exit_date)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {formatMoney(trade.exit_price)}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div>
                                {trade.strategy_contracts}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {trade.total_contracts} total
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="font-medium text-slate-100">
                                {formatMoney(
                                  trade.strategy_profit_loss_dollars ??
                                    trade.profit_loss,
                                )}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {formatPercent(
                                  trade.strategy_return_pct ??
                                    trade.profit_loss_pct,
                                )}
                              </div>
                            </td>
                          </tr>
                        ),
                      )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-4 md:hidden">
                {trades
                  .slice(0, 100)
                  .map(
                    (
                      trade: GroupedBrokerStrategyTrade,
                      index: number,
                    ) => (
                      <div
                        key={getTradeKey(trade, index)}
                        className="min-w-0 rounded-xl border border-white/10 bg-slate-950/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-slate-100">
                              {trade.symbol}
                            </div>

                            <div className="mt-1 break-words text-xs text-slate-500">
                              {trade.instrument_type} ·{" "}
                              {formatDisplayText(
                                trade.strategy_type,
                              )}{" "}
                              ·{" "}
                              {formatDisplayText(
                                trade.trade_style,
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-sm font-medium text-slate-100">
                              {formatMoney(
                                trade.strategy_profit_loss_dollars ??
                                  trade.profit_loss,
                              )}
                            </div>

                            <div className="text-xs text-slate-500">
                              {formatPercent(
                                trade.strategy_return_pct ??
                                  trade.profit_loss_pct,
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span
                            className={
                              trade.grouped
                                ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300"
                                : "rounded-full border border-white/10 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-400"
                            }
                          >
                            {trade.grouped
                              ? "Grouped Strategy"
                              : "Single Trade"}
                          </span>

                          <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-xs font-semibold text-purple-300">
                            {trade.leg_count} leg
                            {trade.leg_count === 1 ? "" : "s"}
                          </span>

                          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-300">
                            {formatDebitCredit(
                              trade.strategy_entry_type,
                            )}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <MobileMetric
                            label="Net Entry"
                            value={formatMoney(
                              trade.strategy_entry_price,
                            )}
                          />

                          <MobileMetric
                            label="Strategy Contracts"
                            value={String(
                              trade.strategy_contracts,
                            )}
                          />

                          <MobileMetric
                            label="Premium Paid"
                            value={formatMoney(
                              trade.total_debit,
                            )}
                          />

                          <MobileMetric
                            label="Premium Received"
                            value={formatMoney(
                              trade.total_credit,
                            )}
                          />

                          <MobileMetric
                            label="Entry"
                            value={`${formatDate(
                              trade.entry_date,
                            )} · ${formatMoney(
                              trade.entry_price,
                            )}`}
                          />

                          <MobileMetric
                            label="Exit"
                            value={`${formatDate(
                              trade.exit_date,
                            )} · ${formatMoney(
                              trade.exit_price,
                            )}`}
                          />

                          <MobileMetric
                            label="Total Contracts"
                            value={String(
                              trade.total_contracts,
                            )}
                          />

                          <MobileMetric
                            label="Broker"
                            value={trade.broker}
                          />
                        </div>

                        {trade.option_legs.length > 0 ? (
                          <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Option Legs
                            </div>

                            <div className="mt-3 space-y-2">
                              {trade.option_legs.map((leg) => (
                                <div
                                  key={leg.id}
                                  className="rounded-lg border border-white/10 bg-slate-950/70 p-3 text-xs text-slate-300"
                                >
                                  <div className="font-semibold text-slate-100">
                                    Leg {leg.leg_order}:{" "}
                                    {formatDisplayText(leg.action)}
                                  </div>

                                  <div className="mt-1 break-words text-slate-500">
                                    {leg.contracts} ×{" "}
                                    {leg.strike_price ?? "—"}{" "}
                                    {leg.option_type} ·{" "}
                                    {formatDate(
                                      leg.expiration_date,
                                    )}
                                  </div>

                                  <div className="mt-1 text-slate-500">
                                    Entry{" "}
                                    {formatMoney(
                                      leg.entry_price,
                                    )}{" "}
                                    · Exit{" "}
                                    {formatMoney(
                                      leg.exit_price,
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {trade.notes ? (
                          <p className="mt-3 line-clamp-3 text-xs text-slate-500">
                            {trade.notes}
                          </p>
                        ) : null}
                      </div>
                    ),
                  )}
              </div>

              {trades.length > 100 ? (
                <div className="border-t border-white/10 p-4 text-sm text-slate-500">
                  Showing first 100 of {trades.length} grouped strategies.
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <p className="text-sm text-slate-400">
                  Ready to import {trades.length} strategies containing{" "}
                  {preview.totalOptionLegs} option legs into your journal.
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
                    "Import Strategies"
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

function PreviewMetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-2 break-words text-xl font-semibold text-slate-100">
        {value}
      </div>
    </div>
  );
}

function MobileMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-slate-900/60 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 break-words text-slate-200">
        {value}
      </div>
    </div>
  );
}
