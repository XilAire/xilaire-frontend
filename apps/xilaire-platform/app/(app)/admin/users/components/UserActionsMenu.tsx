"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

interface Props {
  status: "active" | "disabled";
  onViewActivity: () => void;
  onResetPassword: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  onRemove: () => void;
}

export default function UserActionsMenu({
  status,
  onViewActivity,
  onResetPassword,
  onSuspend,
  onActivate,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null
  );

  /* -------------------------------------------------
     POSITION MENU RELATIVE TO BUTTON
  ------------------------------------------------- */
  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();

    setPosition({
      top: rect.bottom + 8,
      left: rect.right - 176, // menu width (w-44)
    });
  }, [open]);

  /* -------------------------------------------------
     CLOSE ON OUTSIDE CLICK / ESC
  ------------------------------------------------- */
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  return (
    <>
      {/* Trigger */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded p-2 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
        aria-label="User actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {/* PORTAL MENU */}
      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              zIndex: 1000,
            }}
            className="w-44 overflow-hidden rounded-md border bg-background shadow-lg"
          >
            <MenuItem
              label="View activity"
              onClick={() => {
                setOpen(false);
                onViewActivity();
              }}
            />

            <MenuItem
              label="Reset password"
              onClick={() => {
                setOpen(false);
                onResetPassword();
              }}
            />

            {status === "active" && (
              <MenuItem
                label="Suspend user"
                onClick={() => {
                  setOpen(false);
                  onSuspend();
                }}
              />
            )}

            {status === "disabled" && (
              <MenuItem
                label="Activate user"
                onClick={() => {
                  setOpen(false);
                  onActivate();
                }}
              />
            )}

            <MenuItem
              label="Remove user"
              danger
              onClick={() => {
                setOpen(false);
                onRemove();
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}

/* -------------------------------------------------
   MENU ITEM
------------------------------------------------- */
function MenuItem({
  label,
  onClick,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-muted ${
        danger ? "text-red-600 hover:text-red-700" : ""
      }`}
    >
      {label}
    </button>
  );
}
