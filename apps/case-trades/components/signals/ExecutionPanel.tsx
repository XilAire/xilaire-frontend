"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openExecution } from "@/lib/executions/openExecution";
import { closeExecution } from "@/lib/executions/closeExecution";
import { FormInput } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";

interface ExecutionPanelProps {
  signalId: string;
  execution: {
    id: string;
    status: "OPEN" | "CLOSED" | "PARTIAL";
    contracts: number;
    entry_price: number;
    remaining_contracts?: number;
  } | null;
}

export default function ExecutionPanel({
  signalId,
  execution,
}: ExecutionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [contracts, setContracts] = useState<number | null>(null);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);

  const [closeQty, setCloseQty] = useState<number | null>(null);
  const [closePrice, setClosePrice] = useState<number | null>(null);

  const canOpen =
    typeof contracts === "number" &&
    typeof entryPrice === "number" &&
    contracts > 0 &&
    entryPrice > 0;

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }

  function handleOpenExecution() {
    if (!canOpen) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        await openExecution({
          signalId,
          contracts,
          entryPrice,
        });

        setContracts(null);
        setEntryPrice(null);
        setSuccessMessage("Execution opened successfully.");
        router.refresh();
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Failed to open execution."));
      }
    });
  }

  function handleCloseExecution({
    executionId,
    quantity,
    price,
    isFinalClose,
  }: {
    executionId: string;
    quantity: number;
    price: number;
    isFinalClose: boolean;
  }) {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        await closeExecution({
          executionId,
          contracts: quantity,
          price,
        });

        setCloseQty(null);
        setClosePrice(null);
        setSuccessMessage(
          isFinalClose
            ? "Execution closed and signal performance updated."
            : "Execution fill recorded successfully."
        );
        router.refresh();
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Failed to close execution."));
      }
    });
  }

  const messageBlock =
    errorMessage || successMessage ? (
      <div
        className={
          "rounded-lg border px-3 py-2 text-sm " +
          (errorMessage
            ? "border-red-500/30 bg-red-500/10 text-red-300"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300")
        }
      >
        {errorMessage ?? successMessage}
      </div>
    ) : null;

  if (!execution) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-background p-4">
        <h3 className="text-lg font-semibold">Execution</h3>

        {messageBlock}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormInput
            label="Contracts"
            type="number"
            min={1}
            value={contracts ?? ""}
            onChange={(e) =>
              setContracts(
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />

          <FormInput
            label="Entry Price"
            type="number"
            step="0.01"
            min={0}
            value={entryPrice ?? ""}
            onChange={(e) =>
              setEntryPrice(
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </div>

        <Button
          variant="primary"
          disabled={isPending || !canOpen}
          onClick={handleOpenExecution}
        >
          {isPending ? "Opening..." : "Open Position"}
        </Button>
      </div>
    );
  }

  if (execution.status === "OPEN" || execution.status === "PARTIAL") {
    const remaining = execution.remaining_contracts ?? execution.contracts;

    const canClose =
      typeof closeQty === "number" &&
      typeof closePrice === "number" &&
      closeQty > 0 &&
      closeQty <= remaining &&
      closePrice > 0;

    const isFinalClose =
      typeof closeQty === "number" && closeQty === remaining;

    return (
      <div className="space-y-4 rounded-xl border border-border bg-background p-4">
        <h3 className="text-lg font-semibold">Execution ({execution.status})</h3>

        {messageBlock}

        <div className="space-y-1 text-sm text-muted-foreground">
          <div>Original Contracts: {execution.contracts}</div>
          <div>Remaining: {remaining}</div>
          <div>Entry Price: ${execution.entry_price}</div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormInput
            label="Contracts to Close"
            type="number"
            min={1}
            max={remaining}
            value={closeQty ?? ""}
            onChange={(e) =>
              setCloseQty(
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            hint={`Max: ${remaining}`}
          />

          <FormInput
            label="Exit Price"
            type="number"
            step="0.01"
            min={0}
            value={closePrice ?? ""}
            onChange={(e) =>
              setClosePrice(
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </div>

        <Button
          variant="secondary"
          disabled={isPending || !canClose}
          onClick={() =>
            handleCloseExecution({
              executionId: execution.id,
              quantity: closeQty!,
              price: closePrice!,
              isFinalClose,
            })
          }
        >
          {isPending
            ? "Closing..."
            : isFinalClose
              ? `Close Final ${closeQty ?? ""} Contracts`
              : `Close ${closeQty ?? ""} Contracts`}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background p-4">
      <h3 className="text-lg font-semibold">Execution (CLOSED)</h3>

      {messageBlock}

      <div className="text-sm text-muted-foreground">
        This position has been fully closed.
      </div>
    </div>
  );
}