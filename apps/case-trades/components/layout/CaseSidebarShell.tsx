"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface CaseSidebarShellProps {
  children: React.ReactNode;
}

const STORAGE_KEY = "case-trades-sidebar-open";
const SWIPE_THRESHOLD = 60;

export default function CaseSidebarShell({
  children,
}: CaseSidebarShellProps) {
  const pathname = usePathname();
  const startXRef = useRef<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  function setOpen(value: boolean) {
    setIsOpen(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }

  // ---------------------------------------------------------------------------
  // Listen for toggle events from CaseTopBar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function handleToggle() {
      setOpen(!isOpen);
    }

    window.addEventListener("case:toggle-sidebar", handleToggle);
    return () => {
      window.removeEventListener("case:toggle-sidebar", handleToggle);
    };
  }, [isOpen]);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts (⌘B / Ctrl+B, Escape)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const metaPressed = isMac ? e.metaKey : e.ctrlKey;

      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (isTyping) return;

      if (metaPressed && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setOpen(!isOpen);
      }

      if (e.key === "Escape" && isOpen) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // ---------------------------------------------------------------------------
  // Close on route change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ---------------------------------------------------------------------------
  // Focus management (accessibility)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isOpen) {
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      sidebarRef.current?.focus();
    } else {
      lastFocusedRef.current?.focus();
    }
  }, [isOpen]);

  // ---------------------------------------------------------------------------
  // Touch handlers (swipe-to-close)
  // ---------------------------------------------------------------------------
  function handleTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null) return;

    const deltaX = e.touches[0].clientX - startXRef.current;

    if (deltaX < -SWIPE_THRESHOLD) {
      setOpen(false);
      startXRef.current = null;
    }
  }

  function handleTouchEnd() {
    startXRef.current = null;
  }

  return (
    <>
      {/* ---------------------------------------------------------------------
          MOBILE OVERLAY
      --------------------------------------------------------------------- */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ---------------------------------------------------------------------
          SIDEBAR CONTAINER
      --------------------------------------------------------------------- */}
      <div
        ref={sidebarRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        className={`
          fixed z-50 h-full
          transition-transform duration-200
          md:static md:translate-x-0 md:aria-hidden="false"
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </>
  );
}
