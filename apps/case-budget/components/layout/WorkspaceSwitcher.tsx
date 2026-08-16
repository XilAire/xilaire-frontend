"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

export type WorkspaceType =
  | "personal"
  | "household"
  | "family"
  | "business"
  | "rental"
  | "trust"
  | "other";

export type WorkspaceSummary = {
  id: string;
  name: string;
  type: WorkspaceType;
  memberCount?: number;
  isOwner?: boolean;
};

export type Workspace =
  WorkspaceSummary;

type WorkspaceSwitcherProps = {
  activeWorkspaceId?: string;
  currentWorkspaceId?: string;
  workspaces: WorkspaceSummary[];
  onWorkspaceChange?: (
    workspace: WorkspaceSummary,
  ) => void;
  onCreateWorkspace?: () => void;
  onManageWorkspace?: (
    workspace: WorkspaceSummary,
  ) => void;
};

const workspaceTypeLabels: Record<
  WorkspaceType,
  string
> = {
  personal:
    "Personal workspace",
  household:
    "Household workspace",
  family:
    "Family workspace",
  business:
    "Business workspace",
  rental:
    "Rental workspace",
  trust:
    "Trust workspace",
  other:
    "Workspace",
};

const workspaceTypeOrder: WorkspaceType[] = [
  "personal",
  "household",
  "family",
  "business",
  "rental",
  "trust",
  "other",
];

function getWorkspaceInitials(
  name: string,
) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map(
      (
        part,
      ) => part.charAt(0),
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "CB";
}

function getWorkspaceGroupLabel(
  type: WorkspaceType,
) {
  switch (type) {
    case "personal":
      return "Personal";

    case "household":
      return "Households";

    case "family":
      return "Families";

    case "business":
      return "Businesses";

    case "rental":
      return "Properties";

    case "trust":
      return "Trusts";

    case "other":
      return "Other";
  }
}

function WorkspaceTypeIcon({
  type,
}: {
  type: WorkspaceType;
}) {
  const sharedProps = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
    "aria-hidden": true,
  };

  switch (type) {
    case "personal":
      return (
        <svg {...sharedProps}>
          <circle
            cx="12"
            cy="8"
            r="4"
          />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );

    case "household":
      return (
        <svg {...sharedProps}>
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );

    case "family":
      return (
        <svg {...sharedProps}>
          <circle
            cx="9"
            cy="8"
            r="3.5"
          />
          <circle
            cx="17"
            cy="9"
            r="2.5"
          />
          <path d="M2.5 21a6.5 6.5 0 0 1 13 0" />
          <path d="M14 15.5a5 5 0 0 1 7.5 4.5" />
        </svg>
      );

    case "business":
      return (
        <svg {...sharedProps}>
          <rect
            x="3"
            y="7"
            width="18"
            height="13"
            rx="2"
          />
          <path d="M8 7V4h8v3" />
          <path d="M3 12h18" />
          <path d="M10 12v2h4v-2" />
        </svg>
      );

    case "rental":
      return (
        <svg {...sharedProps}>
          <path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16" />
          <path d="M2 21h20" />
          <path d="M8 7h2" />
          <path d="M13 7h2" />
          <path d="M8 11h2" />
          <path d="M13 11h2" />
          <path d="M8 15h2" />
          <path d="M13 15h2" />
          <path d="M18 9h2a1 1 0 0 1 1 1v11" />
        </svg>
      );

    case "trust":
      return (
        <svg {...sharedProps}>
          <path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "other":
      return (
        <svg {...sharedProps}>
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3"
          />
          <path d="M8 12h8" />
          <path d="M12 8v8" />
        </svg>
      );
  }
}

function ChevronIcon({
  isOpen,
}: {
  isOpen: boolean;
}) {
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
      className={[
        "shrink-0 text-[var(--sidebar-muted-foreground)] transition-transform duration-200",
        isOpen
          ? "rotate-180"
          : "",
      ].join(" ")}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
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

function SettingsIcon() {
  return (
    <svg
      width="17"
      height="17"
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
        cy="12"
        r="3"
      />

      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

function PlusIcon() {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export default function WorkspaceSwitcher({
  activeWorkspaceId,
  currentWorkspaceId,
  workspaces,
  onWorkspaceChange,
  onCreateWorkspace,
  onManageWorkspace,
}: WorkspaceSwitcherProps) {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const containerRef =
    useRef<HTMLDivElement>(
      null,
    );

  const resolvedWorkspaceId =
    currentWorkspaceId ??
    activeWorkspaceId ??
    workspaces[0]?.id ??
    "";

  const activeWorkspace =
    workspaces.find(
      (
        workspace,
      ) =>
        workspace.id ===
        resolvedWorkspaceId,
    ) ?? workspaces[0];

  const groupedWorkspaces =
    workspaceTypeOrder
      .map(
        (
          type,
        ) => ({
          type,
          label:
            getWorkspaceGroupLabel(
              type,
            ),
          workspaces:
            workspaces.filter(
              (
                workspace,
              ) =>
                workspace.type ===
                type,
            ),
        }),
      )
      .filter(
        (
          group,
        ) =>
          group.workspaces
            .length > 0,
      );

  const createWorkspaceTitle =
    activeWorkspace?.isOwner
      ? "Create another workspace"
      : "Create your own workspace";

  const createWorkspaceDescription =
    activeWorkspace?.isOwner
      ? "Add another personal, household, or business workspace."
      : "Start an independent CASE Budget workspace that you own.";

  useEffect(
    () => {
      function handlePointerDown(
        event: MouseEvent,
      ) {
        if (
          containerRef.current &&
          !containerRef.current.contains(
            event.target as Node,
          )
        ) {
          setIsOpen(false);
        }
      }

      function handleKeyDown(
        event: KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          setIsOpen(false);
        }
      }

      document.addEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handlePointerDown,
        );

        document.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [],
  );

  function handleWorkspaceSelection(
    workspace: WorkspaceSummary,
  ) {
    onWorkspaceChange?.(
      workspace,
    );

    setIsOpen(false);
  }

  function handleManageWorkspace() {
    if (
      !activeWorkspace
    ) {
      return;
    }

    setIsOpen(
      false,
    );

    onManageWorkspace?.(
      activeWorkspace,
    );
  }

  function handleCreateWorkspace() {
    onCreateWorkspace?.();

    setIsOpen(false);
  }

  if (
    !activeWorkspace
  ) {
    return (
      <button
        type="button"
        onClick={
          handleCreateWorkspace
        }
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--sidebar-border-strong)] bg-[var(--sidebar-surface)] px-4 py-3 text-sm font-semibold text-[var(--sidebar-foreground)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        <PlusIcon />
        Create your first workspace
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() => {
          setIsOpen(
            (
              currentValue,
            ) =>
              !currentValue,
          );
        }}
        aria-haspopup="menu"
        aria-expanded={
          isOpen
        }
        className={[
          "group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left outline-none transition",
          "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
          isOpen
            ? "border-[color-mix(in_srgb,var(--primary)_24%,var(--sidebar-border))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--sidebar-surface))]"
            : "border-[var(--sidebar-border)] bg-[var(--sidebar-surface)] hover:border-[var(--sidebar-border-strong)] hover:bg-[var(--sidebar-hover-background)]",
        ].join(
          " ",
        )}
      >
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
            isOpen
              ? "bg-[var(--sidebar-active-background)] text-[var(--sidebar-active-foreground)]"
              : "bg-[var(--sidebar-hover-background)] text-[var(--sidebar-icon-foreground)] group-hover:text-[var(--sidebar-hover-foreground)]",
          ].join(
            " ",
          )}
        >
          <WorkspaceTypeIcon
            type={
              activeWorkspace.type
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--sidebar-foreground)]">
              {
                activeWorkspace.name
              }
            </p>

            <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--success)]">
              Active
            </span>
          </div>

          <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--sidebar-muted-foreground)]">
            {
              workspaceTypeLabels[
                activeWorkspace.type
              ]
            }
          </p>
        </div>

        <ChevronIcon
          isOpen={
            isOpen
          }
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label="Select workspace"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-xl)]"
        >
          <div className="border-b border-[var(--border-subtle)] px-3 py-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Workspaces
                </p>

                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Choose the financial workspace you want to use.
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-bold text-[var(--text-muted)]">
                {
                  workspaces.length
                }
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--primary)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--surface-default))] p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <WorkspaceTypeIcon
                  type={
                    activeWorkspace.type
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--text-primary)]">
                    {
                      activeWorkspace.name
                    }
                  </p>

                  <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--success)]">
                    Active
                  </span>
                </div>

                <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                  {
                    workspaceTypeLabels[
                      activeWorkspace.type
                    ]
                  }

                  {activeWorkspace.memberCount !==
                  undefined
                    ? ` · ${activeWorkspace.memberCount} ${
                        activeWorkspace.memberCount ===
                        1
                          ? "member"
                          : "members"
                      }`
                    : ""}
                </p>
              </div>

              {activeWorkspace.isOwner ? (
                <span className="shrink-0 rounded-full bg-[var(--pro-soft)] px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[var(--pro)]">
                  Owner
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[var(--text-muted)]">
                  Member
                </span>
              )}
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto px-2 py-2">
            {groupedWorkspaces.map(
              (
                group,
              ) => (
                <div
                  key={
                    group.type
                  }
                  className="py-1.5"
                >
                  <p className="mb-1 px-2.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    {
                      group.label
                    }
                  </p>

                  <div className="space-y-1">
                    {group.workspaces.map(
                      (
                        workspace,
                      ) => {
                        const isActive =
                          workspace.id ===
                          activeWorkspace.id;

                        return (
                          <button
                            key={
                              workspace.id
                            }
                            type="button"
                            role="menuitem"
                            aria-current={
                              isActive
                                ? "true"
                                : undefined
                            }
                            onClick={() => {
                              handleWorkspaceSelection(
                                workspace,
                              );
                            }}
                            className={[
                              "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition",
                              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                              isActive
                                ? "bg-[var(--primary-soft)]"
                                : "hover:bg-[var(--surface-hover)]",
                            ].join(
                              " ",
                            )}
                          >
                            <div
                              className={[
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                isActive
                                  ? "bg-[var(--primary-soft-strong)] text-[var(--primary)]"
                                  : "bg-[var(--surface-muted)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]",
                              ].join(
                                " ",
                              )}
                            >
                              <WorkspaceTypeIcon
                                type={
                                  workspace.type
                                }
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <p
                                  className={[
                                    "min-w-0 flex-1 truncate text-sm font-semibold",
                                    isActive
                                      ? "text-[var(--primary)]"
                                      : "text-[var(--text-primary)]",
                                  ].join(
                                    " ",
                                  )}
                                >
                                  {
                                    workspace.name
                                  }
                                </p>

                                <span
                                  className={[
                                    "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide",
                                    workspace.isOwner
                                      ? "bg-[var(--pro-soft)] text-[var(--pro)]"
                                      : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                                  ].join(
                                    " ",
                                  )}
                                >
                                  {
                                    workspace.isOwner
                                      ? "Owned"
                                      : "Member"
                                  }
                                </span>
                              </div>

                              <p className="truncate text-xs text-[var(--text-muted)]">
                                {
                                  workspaceTypeLabels[
                                    workspace
                                      .type
                                  ]
                                }

                                {workspace.memberCount !==
                                undefined
                                  ? ` · ${workspace.memberCount} ${
                                      workspace.memberCount ===
                                      1
                                        ? "member"
                                        : "members"
                                    }`
                                  : ""}
                              </p>
                            </div>

                            {isActive ? (
                              <span className="shrink-0 text-[var(--primary)]">
                                <CheckIcon />
                              </span>
                            ) : null}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-default)] p-2">
            <button
              type="button"
              role="menuitem"
              onClick={
                handleManageWorkspace
              }
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-muted)] transition group-hover:text-[var(--primary)]">
                <SettingsIcon />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[var(--text-primary)]">
                  Manage workspace
                </span>

                <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                  Edit settings, access, or workspace lifecycle.
                </span>
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={
                handleCreateWorkspace
              }
              className="group mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition hover:bg-[var(--primary-soft)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                <PlusIcon />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[var(--primary)]">
                  {
                    createWorkspaceTitle
                  }
                </span>

                <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {
                    createWorkspaceDescription
                  }
                </span>
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}