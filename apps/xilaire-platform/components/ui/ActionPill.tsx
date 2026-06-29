"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/* -------------------------------------------------------------
   TYPES
-------------------------------------------------------------- */

export type SubActionItem = {
  label: string;
  onClick?: () => void;
};

export type ActionItem =
  | { divider: true }
  | {
      label: string;
      icon?: any;
      destructive?: boolean;
      divider?: false;
      onClick?: () => void;
      submenu?: SubActionItem[];
    };

/* -------------------------------------------------------------
   TYPE GUARD — This is the key fix
-------------------------------------------------------------- */

function isAction(item: ActionItem): item is Exclude<ActionItem, { divider: true }> {
  return "label" in item;
}

/* -------------------------------------------------------------
   COMPONENT
-------------------------------------------------------------- */
export default function ActionPill({
  label = "Actions",
  items = [],
}: {
  label?: string;
  items: ActionItem[];
}) {
  const [open, setOpen] = useState(false);
  const [submenuIndex, setSubmenuIndex] = useState<number | null>(null);
  const [submenuLeft, setSubmenuLeft] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);

  /* Close when clicking outside */
  useEffect(() => {
    function close(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSubmenuIndex(null);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  /* Auto submenu direction */
  function detectDirection(buttonEl: HTMLElement) {
    const rect = buttonEl.getBoundingClientRect();
    const submenuWidth = 200;
    const spaceRight = window.innerWidth - rect.right;
    setSubmenuLeft(spaceRight < submenuWidth);
  }

  /* -------------------------------------------------------------
     RENDER
  -------------------------------------------------------------- */
  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => {
          setOpen((prev) => !prev);
          setSubmenuIndex(null);
        }}
        className="
          px-4 py-2 text-xs rounded-full font-medium flex items-center gap-1
          bg-slate-800 text-slate-100 border border-slate-700
          hover:bg-slate-700 hover:border-slate-600 transition shadow-sm
        "
      >
        {label}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div
          className="
            absolute right-0 mt-2 min-w-[170px] z-50
            bg-slate-900 border border-slate-700 rounded-xl shadow-xl
            animate-in fade-in slide-in-from-top-2
          "
        >
          {items.map((item, index) => {
            /* Divider */
            if (!isAction(item)) {
              return (
                <div
                  key={`divider-${index}`}
                  className="my-1 border-t border-slate-700/60"
                />
              );
            }

            /* Normal menu item */
            const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;

            return (
              <div key={index} className="relative">
                <button
                  onMouseEnter={(e) => {
                    if (hasSubmenu) {
                      detectDirection(e.currentTarget);
                      setSubmenuIndex(index);
                    } else {
                      setSubmenuIndex(null);
                    }
                  }}
                  onClick={() => {
                    if (!hasSubmenu) item.onClick?.();
                    setOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-4 py-2 text-xs
                    text-slate-200 hover:bg-slate-800 transition
                    ${item.destructive ? "text-red-400 hover:bg-red-950" : ""}
                  `}
                >
                  {item.label}
                  {hasSubmenu && <ChevronRight size={14} />}
                </button>

                {/* SUBMENU */}
                {hasSubmenu && submenuIndex === index && (
                  <div
                    className={`
                      absolute top-0 min-w-[170px] z-50
                      bg-slate-900 border border-slate-700 rounded-xl shadow-lg
                      animate-in fade-in
                      ${submenuLeft ? "right-full mr-2" : "left-full ml-2"}
                    `}
                  >
                    {item.submenu.map((sub, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setOpen(false);
                          sub.onClick?.();
                        }}
                        className="
                          w-full px-4 py-2 text-xs text-left
                          text-slate-200 hover:bg-slate-800 transition
                        "
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
