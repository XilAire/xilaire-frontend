"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type AppWorkspace,
  useApp,
} from "@/components/providers/AppProvider";

import WorkspaceManagerModal, {
  type WorkspaceManagerInitialView,
  type WorkspaceManagerWorkspace,
} from "@/components/workspaces/WorkspaceManagerModal";

type WorkspaceType =
  | "Personal"
  | "Household"
  | "Business";

const workspaceTypes: Array<{
  value: WorkspaceType;
  label: string;
  description: string;
}> = [
  {
    value: "Personal",
    label: "Personal",
    description: "Manage your individual budget and financial goals.",
  },
  {
    value: "Household",
    label: "Household",
    description: "Coordinate shared finances with household members.",
  },
  {
    value: "Business",
    label: "Business",
    description: "Organize a dedicated business financial workspace.",
  },
];

type WorkspaceApiType =
  | "personal"
  | "household"
  | "business"
  | "organization";

type WorkspaceApiData = {
  id: string;
  name: string;
  workspaceType: WorkspaceApiType;
  description: string | null;
  isActive: boolean;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceApiResponse = {
  success: boolean;
  data: {
    workspace: WorkspaceApiData;
  } | null;
  error: {
    code: string;
    message: string;
  } | null;
};

function toUiWorkspaceType(
  value: WorkspaceApiType,
): WorkspaceType {
  switch (value) {
    case "household":
      return "Household";
    case "business":
    case "organization":
      return "Business";
    case "personal":
    default:
      return "Personal";
  }
}

function toApiWorkspaceType(
  value: WorkspaceType,
): WorkspaceApiType {
  switch (value) {
    case "Household":
      return "household";
    case "Business":
      return "business";
    case "Personal":
    default:
      return "personal";
  }
}

async function readWorkspaceApiResponse(
  response:
    Response,
): Promise<WorkspaceApiResponse> {
  const rawBody =
    await response.text();

  if (
    !rawBody.trim()
  ) {
    throw new Error(
      response.ok
        ? "CASE Budget received an empty response from the workspace API."
        : `CASE Budget workspace API failed with HTTP ${response.status} and returned no response body.`,
    );
  }

  let parsedBody:
    unknown;

  try {
    parsedBody =
      JSON.parse(
        rawBody,
      );
  } catch {
    throw new Error(
      response.ok
        ? "CASE Budget received an invalid response from the workspace API."
        : `CASE Budget workspace API failed with HTTP ${response.status}.`,
    );
  }

  if (
    !isWorkspaceApiResponse(
      parsedBody,
    )
  ) {
    throw new Error(
      "CASE Budget received an unexpected workspace API response.",
    );
  }

  return parsedBody;
}

function isWorkspaceApiResponse(
  value:
    unknown,
): value is WorkspaceApiResponse {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return false;
  }

  const candidate =
    value as {
      success?: unknown;
      data?: unknown;
      error?: unknown;
    };

  if (
    typeof candidate.success !==
      "boolean"
  ) {
    return false;
  }

  if (
    candidate.success
  ) {
    if (
      !candidate.data ||
      typeof candidate.data !==
        "object" ||
      Array.isArray(
        candidate.data,
      )
    ) {
      return false;
    }

    const data =
      candidate.data as {
        workspace?: unknown;
      };

    return isWorkspaceApiData(
      data.workspace,
    );
  }

  if (
    !candidate.error ||
    typeof candidate.error !==
      "object" ||
    Array.isArray(
      candidate.error,
    )
  ) {
    return false;
  }

  const error =
    candidate.error as {
      code?: unknown;
      message?: unknown;
    };

  return (
    typeof error.code ===
      "string" &&
    typeof error.message ===
      "string"
  );
}

function isWorkspaceApiData(
  value:
    unknown,
): value is WorkspaceApiData {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return false;
  }

  const candidate =
    value as Partial<WorkspaceApiData>;

  return (
    typeof candidate.id ===
      "string" &&
    typeof candidate.name ===
      "string" &&
    (
      candidate.workspaceType ===
        "personal" ||
      candidate.workspaceType ===
        "household" ||
      candidate.workspaceType ===
        "business" ||
      candidate.workspaceType ===
        "organization"
    ) &&
    (
      candidate.description ===
        null ||
      typeof candidate.description ===
        "string"
    ) &&
    typeof candidate.isActive ===
      "boolean" &&
    typeof candidate.isOwner ===
      "boolean" &&
    typeof candidate.createdAt ===
      "string" &&
    typeof candidate.updatedAt ===
      "string"
  );
}

function getAppWorkspaceApiType(
  value:
    string,
): WorkspaceApiType {
  switch (
    value
  ) {
    case "household":
      return "household";

    case "business":
      return "business";

    case "personal":
      return "personal";

    default:
      return "personal";
  }
}

export default function WorkspaceSettingsOverview() {
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspace,
    updateWorkspace,
  } = useApp();

  const [
    isWorkspaceManagerOpen,
    setIsWorkspaceManagerOpen,
  ] = useState(
    false,
  );

  const [
    workspaceManagerInitialView,
    setWorkspaceManagerInitialView,
  ] = useState<WorkspaceManagerInitialView>(
    "manage",
  );

  const [
    workspaceManagerWorkspace,
    setWorkspaceManagerWorkspace,
  ] = useState<WorkspaceManagerWorkspace | null>(
    null,
  );

  const [
    isSwitchingWorkspaceId,
    setIsSwitchingWorkspaceId,
  ] = useState<string | null>(
    null,
  );

  const [
    workspaceActionMessage,
    setWorkspaceActionMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    workspaceName,
    setWorkspaceName,
  ] = useState(
    "",
  );

  const [
    workspaceType,
    setWorkspaceType,
  ] = useState<WorkspaceType>(
    "Personal",
  );

  const [
    description,
    setDescription,
  ] = useState(
    "",
  );

  const [
    savedName,
    setSavedName,
  ] = useState(
    "",
  );

  const [
    savedType,
    setSavedType,
  ] = useState<WorkspaceType>(
    "Personal",
  );

  const [
    savedDescription,
    setSavedDescription,
  ] = useState(
    "",
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    true,
  );

  const [
    isSaving,
    setIsSaving,
  ] = useState(
    false,
  );

  const [
    saveMessage,
    setSaveMessage,
  ] = useState<
    string | null
  >(
    null,
  );

  const [
    loadError,
    setLoadError,
  ] = useState<
    string | null
  >(
    null,
  );

  useEffect(
    () => {
      let cancelled =
        false;

      /*
       * AppProvider is already hydrated from the authenticated dashboard
       * layout. Use that workspace immediately as a safe fallback so this
       * page does not become unusable if the API request fails.
       */
      if (
        activeWorkspace
      ) {
        const fallbackName =
          activeWorkspace.name.trim();

        const fallbackType =
          toUiWorkspaceType(
            getAppWorkspaceApiType(
              activeWorkspace.type,
            ),
          );

        setWorkspaceName(
          fallbackName,
        );

        setWorkspaceType(
          fallbackType,
        );

        setSavedName(
          fallbackName,
        );

        setSavedType(
          fallbackType,
        );
      }

      async function loadWorkspace() {
        setIsLoading(
          true,
        );

        setLoadError(
          null,
        );

        try {
          const response =
            await fetch(
              "/api/workspaces/current",
              {
                method:
                  "GET",

                cache:
                  "no-store",

                headers: {
                  Accept:
                    "application/json",
                },
              },
            );

          const payload =
            await readWorkspaceApiResponse(
              response,
            );

          if (
            !response.ok ||
            !payload.success ||
            !payload.data
          ) {
            throw new Error(
              payload.error?.message ??
                "CASE Budget could not load the current workspace.",
            );
          }

          if (
            cancelled
          ) {
            return;
          }

          const workspace =
            payload.data.workspace;

          const nextName =
            workspace.name.trim();

          const nextType =
            toUiWorkspaceType(
              workspace.workspaceType,
            );

          const nextDescription =
            workspace.description?.trim() ??
            "";

          setWorkspaceName(
            nextName,
          );

          setWorkspaceType(
            nextType,
          );

          setDescription(
            nextDescription,
          );

          setSavedName(
            nextName,
          );

          setSavedType(
            nextType,
          );

          setSavedDescription(
            nextDescription,
          );
        } catch (
          error
        ) {
          if (
            cancelled
          ) {
            return;
          }

          const message =
            error instanceof Error
              ? error.message
              : "CASE Budget could not load the current workspace.";

          /*
           * If AppProvider already has the active workspace, keep the page
           * usable and surface the API problem as a non-blocking warning.
           */
          if (
            activeWorkspace
          ) {
            setLoadError(
              message,
            );

            return;
          }

          setLoadError(
            message,
          );
        } finally {
          if (
            !cancelled
          ) {
            setIsLoading(
              false,
            );
          }
        }
      }

      void loadWorkspace();

      return () => {
        cancelled =
          true;
      };
    },
    [
      activeWorkspace,
    ],
  );

  const hasChanges =
    useMemo(
      () =>
        workspaceName.trim() !==
          savedName ||
        workspaceType !==
          savedType ||
        description.trim() !==
          savedDescription,
      [
        description,
        savedDescription,
        savedName,
        savedType,
        workspaceName,
        workspaceType,
      ],
    );

  function openWorkspaceManager(
    workspace:
      AppWorkspace | null,
    initialView:
      WorkspaceManagerInitialView,
  ) {
    setWorkspaceManagerWorkspace(
      toManagerWorkspace(
        workspace,
      ),
    );

    setWorkspaceManagerInitialView(
      initialView,
    );

    setIsWorkspaceManagerOpen(
      true,
    );
  }

  async function handleWorkspaceSwitch(
    workspace:
      AppWorkspace,
  ) {
    if (
      workspace.id ===
      activeWorkspaceId
    ) {
      return;
    }

    setIsSwitchingWorkspaceId(
      workspace.id,
    );

    setWorkspaceActionMessage(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/workspaces/current",
          {
            method:
              "POST",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  workspaceId:
                    workspace.id,
                },
              ),
          },
        );

      if (
        !response.ok
      ) {
        const rawBody =
          await response.text();

        let message =
          "CASE Budget could not switch workspaces.";

        if (
          rawBody.trim()
        ) {
          try {
            const payload =
              JSON.parse(
                rawBody,
              ) as {
                error?: {
                  message?: unknown;
                };
              };

            if (
              typeof payload.error?.message ===
                "string" &&
              payload.error.message.trim()
            ) {
              message =
                payload.error.message.trim();
            }
          } catch {
            // Keep the default message for a non-JSON error response.
          }
        }

        throw new Error(
          message,
        );
      }

      setActiveWorkspace(
        workspace.id,
      );

      setWorkspaceActionMessage(
        `Switched to ${workspace.name}.`,
      );

      window.dispatchEvent(
        new CustomEvent(
          "case-budget:workspace-changed",
          {
            detail: {
              workspaceId:
                workspace.id,
            },
          },
        ),
      );
    } catch (
      error
    ) {
      setWorkspaceActionMessage(
        error instanceof Error
          ? error.message
          : "CASE Budget could not switch workspaces.",
      );
    } finally {
      setIsSwitchingWorkspaceId(
        null,
      );
    }
  }

  async function handleSave() {
    const normalizedName =
      workspaceName.trim();

    const normalizedDescription =
      description.trim();

    if (
      !normalizedName
    ) {
      setSaveMessage(
        "Workspace name is required.",
      );

      return;
    }

    setIsSaving(
      true,
    );

    setSaveMessage(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/workspaces/current",
          {
            method:
              "PUT",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  name:
                    normalizedName,

                  workspaceType:
                    toApiWorkspaceType(
                      workspaceType,
                    ),

                  description:
                    normalizedDescription ||
                    null,
                },
              ),
          },
        );

      const payload =
        await readWorkspaceApiResponse(
          response,
        );

      if (
        !response.ok ||
        !payload.success ||
        !payload.data
      ) {
        throw new Error(
          payload.error?.message ??
            "CASE Budget could not save the workspace settings.",
        );
      }

      const workspace =
        payload.data.workspace;

      const persistedName =
        workspace.name.trim();

      const persistedType =
        toUiWorkspaceType(
          workspace.workspaceType,
        );

      const persistedDescription =
        workspace.description?.trim() ??
        "";

      setWorkspaceName(
        persistedName,
      );

      setWorkspaceType(
        persistedType,
      );

      setDescription(
        persistedDescription,
      );

      setSavedName(
        persistedName,
      );

      setSavedType(
        persistedType,
      );

      setSavedDescription(
        persistedDescription,
      );

      setSaveMessage(
        "Workspace settings saved.",
      );

      updateWorkspace(
        workspace.id,
        {
          name:
            persistedName,

          type:
            workspace.workspaceType ===
              "household"
              ? "household"
              : workspace.workspaceType ===
                  "business" ||
                workspace.workspaceType ===
                  "organization"
                ? "business"
                : "personal",
        },
      );

      window.dispatchEvent(
        new CustomEvent(
          "case-budget:workspace-updated",
          {
            detail: {
              id:
                workspace.id,

              name:
                persistedName,

              workspaceType:
                workspace.workspaceType,

              description:
                workspace.description,
            },
          },
        ),
      );
    } catch (
      error
    ) {
      setSaveMessage(
        error instanceof Error
          ? error.message
          : "CASE Budget could not save the workspace settings.",
      );
    } finally {
      setIsSaving(
        false,
      );
    }
  }

  function handleReset() {
    setWorkspaceName(
      savedName,
    );

    setWorkspaceType(
      savedType,
    );

    setDescription(
      savedDescription,
    );

    setSaveMessage(
      null,
    );
  }

  if (
    isLoading
  ) {
    return (
      <div className="min-h-full bg-[var(--background)] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto w-full max-w-[1280px]">
          <WorkspaceSettingsHeader />

          <section className="mt-6 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-default)] p-6 shadow-sm">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Loading workspace settings...
            </p>

            <p className="mt-1 text-xs text-[var(--text-muted)]">
              CASE Budget is loading the currently selected workspace.
            </p>
          </section>
        </div>
      </div>
    );
  }

  if (
    loadError &&
    !activeWorkspace
  ) {
    return (
      <div className="min-h-full bg-[var(--background)] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto w-full max-w-[1280px]">
          <WorkspaceSettingsHeader />

          <section className="mt-6 rounded-[24px] border border-[color-mix(in_srgb,var(--danger)_28%,var(--border-subtle))] bg-[var(--surface-default)] p-6 shadow-sm">
            <p className="text-sm font-extrabold text-[var(--danger)]">
              Workspace settings could not be loaded.
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {loadError}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              Try again
            </button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--background)] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto w-full max-w-[1280px]">
        <WorkspaceSettingsHeader />

        {loadError ? (
          <section className="mt-6 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_28%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--warning)_7%,var(--surface-default))] px-4 py-3">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Workspace API warning
            </p>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              {loadError}
            </p>
          </section>
        ) : null}

        <AllWorkspacesCard
          workspaces={
            workspaces
          }
          activeWorkspaceId={
            activeWorkspaceId
          }
          switchingWorkspaceId={
            isSwitchingWorkspaceId
          }
          message={
            workspaceActionMessage
          }
          onCreateWorkspace={() => {
            openWorkspaceManager(
              null,
              "create",
            );
          }}
          onManageWorkspace={(
            workspace,
          ) => {
            openWorkspaceManager(
              workspace,
              "manage",
            );
          }}
          onSwitchWorkspace={
            handleWorkspaceSwitch
          }
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <WorkspaceDetailsCard
              workspaceName={
                workspaceName
              }
              workspaceType={
                workspaceType
              }
              description={
                description
              }
              onWorkspaceNameChange={
                setWorkspaceName
              }
              onWorkspaceTypeChange={
                setWorkspaceType
              }
              onDescriptionChange={
                setDescription
              }
            />

            <WorkspacePreferencesCard />

            <WorkspaceDangerZoneCard />
          </div>

          <aside className="space-y-6">
            <WorkspaceSummaryCard
              workspaceName={
                workspaceName
              }
              workspaceType={
                workspaceType
              }
            />

            <WorkspaceAccessCard />

            <WorkspaceHelpCard />
          </aside>
        </div>

        <SaveBar
          hasChanges={
            hasChanges
          }
          isSaving={
            isSaving
          }
          message={
            saveMessage
          }
          onReset={
            handleReset
          }
          onSave={
            handleSave
          }
        />

        <WorkspaceManagerModal
          open={
            isWorkspaceManagerOpen
          }
          workspace={
            workspaceManagerWorkspace
          }
          initialView={
            workspaceManagerInitialView
          }
          onClose={() => {
            setIsWorkspaceManagerOpen(
              false,
            );
          }}
          onOpenSettings={() => {
            setIsWorkspaceManagerOpen(
              false,
            );
          }}
        />
      </div>
    </div>
  );
}

function WorkspaceSettingsHeader() {
  return (
    <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-6 shadow-sm sm:px-7 lg:px-8 lg:py-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
            <WorkspaceIcon />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
                Workspace settings
              </p>

              <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-muted)]">
                Owner
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Manage your workspace
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              Update your workspace identity, preferences, and access settings.
              These settings apply to the financial workspace currently selected
              in CASE Budget.
            </p>
          </div>
        </div>

        <a
          href="/dashboard/settings"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <ArrowLeftIcon />

          Back to settings
        </a>
      </div>
    </section>
  );
}

function AllWorkspacesCard({
  workspaces,
  activeWorkspaceId,
  switchingWorkspaceId,
  message,
  onCreateWorkspace,
  onManageWorkspace,
  onSwitchWorkspace,
}: {
  workspaces:
    AppWorkspace[];

  activeWorkspaceId:
    string;

  switchingWorkspaceId:
    string | null;

  message:
    string | null;

  onCreateWorkspace:
    () => void;

  onManageWorkspace:
    (
      workspace:
        AppWorkspace,
    ) => void;

  onSwitchWorkspace:
    (
      workspace:
        AppWorkspace,
    ) => void;
}) {
  return (
    <section className="mt-6 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_9%,transparent)] text-[var(--primary)]">
            <WorkspaceIcon />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">
              Workspace management
            </p>

            <h2 className="mt-1 text-lg font-extrabold text-[var(--text-primary)]">
              All workspaces
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
              Switch between financial workspaces or open the unified workspace
              manager to create, edit, and delete workspaces.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={
            onCreateWorkspace
          }
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <PlusIcon />

          Create workspace
        </button>
      </div>

      <div className="p-5 sm:p-6">
        {message ? (
          <div className="mb-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
            <p className="text-xs font-bold text-[var(--text-primary)]">
              {message}
            </p>
          </div>
        ) : null}

        {workspaces.length ===
        0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-muted)] p-6 text-center">
            <p className="text-sm font-extrabold text-[var(--text-primary)]">
              No workspaces available
            </p>

            <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-[var(--text-muted)]">
              Create a workspace to begin organizing a separate set of CASE
              Budget financial data.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {workspaces.map(
              (
                workspace,
              ) => {
                const isActive =
                  workspace.id ===
                  activeWorkspaceId;

                const isSwitching =
                  switchingWorkspaceId ===
                  workspace.id;

                return (
                  <article
                    key={
                      workspace.id
                    }
                    className={[
                      "rounded-2xl border p-4 transition",
                      isActive
                        ? "border-[color-mix(in_srgb,var(--primary)_42%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--surface-default))]"
                        : "border-[var(--border-subtle)] bg-[var(--surface-muted)]",
                    ].join(
                      " ",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-xs font-extrabold text-[var(--primary)] shadow-sm">
                        {getInitials(
                          workspace.name,
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="min-w-0 truncate text-sm font-extrabold text-[var(--text-primary)]">
                            {
                              workspace.name
                            }
                          </h3>

                          {isActive ? (
                            <span className="rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--success)]">
                              Active
                            </span>
                          ) : null}

                          {workspace.isOwner ? (
                            <span className="rounded-full bg-[var(--surface-default)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                              Owner
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                          <span>
                            {formatAppWorkspaceType(
                              workspace.type,
                            )}{" "}
                            workspace
                          </span>

                          <span>
                            {workspace.memberCount ??
                              1}{" "}
                            {(workspace.memberCount ??
                              1) ===
                            1
                              ? "member"
                              : "members"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      {!isActive ? (
                        <button
                          type="button"
                          disabled={
                            isSwitching
                          }
                          onClick={() => {
                            void onSwitchWorkspace(
                              workspace,
                            );
                          }}
                          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSwitching
                            ? "Switching..."
                            : "Switch workspace"}
                        </button>
                      ) : (
                        <div className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-muted)]">
                          Current workspace
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          onManageWorkspace(
                            workspace,
                          );
                        }}
                        className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      >
                        Manage
                      </button>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function WorkspaceDetailsCard({
  workspaceName,
  workspaceType,
  description,
  onWorkspaceNameChange,
  onWorkspaceTypeChange,
  onDescriptionChange,
}: {
  workspaceName:
    string;

  workspaceType:
    WorkspaceType;

  description:
    string;

  onWorkspaceNameChange:
    (
      value:
        string,
    ) => void;

  onWorkspaceTypeChange:
    (
      value:
        WorkspaceType,
    ) => void;

  onDescriptionChange:
    (
      value:
        string,
    ) => void;
}) {
  return (
    <SettingsCard
      eyebrow="Workspace profile"
      title="Workspace details"
      description="Control how this workspace is identified throughout CASE Budget."
      icon={
        <EditWorkspaceIcon />
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="workspace-name"
            className="text-sm font-bold text-[var(--text-primary)]"
          >
            Workspace name
          </label>

          <input
            id="workspace-name"
            value={
              workspaceName
            }
            onChange={(
              event,
            ) =>
              onWorkspaceNameChange(
                event.target.value,
              )
            }
            maxLength={80}
            className={inputClassName}
          />

          <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
            This name appears in the workspace switcher and throughout your
            financial dashboard.
          </p>
        </div>

        <div className="sm:col-span-2">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Workspace type
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {workspaceTypes.map(
              (
                option,
              ) => {
                const selected =
                  workspaceType ===
                  option.value;

                return (
                  <button
                    key={
                      option.value
                    }
                    type="button"
                    onClick={() =>
                      onWorkspaceTypeChange(
                        option.value,
                      )
                    }
                    className={[
                      "rounded-2xl border p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                      selected
                        ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_7%,var(--surface-default))]"
                        : "border-[var(--border-subtle)] bg-[var(--surface-default)] hover:bg-[var(--surface-muted)]",
                    ].join(
                      " ",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-extrabold text-[var(--text-primary)]">
                        {option.label}
                      </span>

                      <span
                        className={[
                          "flex h-5 w-5 items-center justify-center rounded-full border",
                          selected
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                            : "border-[var(--border-subtle)] text-transparent",
                        ].join(
                          " ",
                        )}
                      >
                        <CheckIcon />
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                      {
                        option.description
                      }
                    </p>
                  </button>
                );
              },
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="workspace-description"
              className="text-sm font-bold text-[var(--text-primary)]"
            >
              Description
            </label>

            <span className="text-xs text-[var(--text-muted)]">
              {
                description.length
              }
              /240
            </span>
          </div>

          <textarea
            id="workspace-description"
            value={
              description
            }
            onChange={(
              event,
            ) =>
              onDescriptionChange(
                event.target.value,
              )
            }
            maxLength={240}
            rows={4}
            placeholder="Add a short description for this workspace..."
            className={`${inputClassName} resize-none`}
          />
        </div>
      </div>
    </SettingsCard>
  );
}

function WorkspacePreferencesCard() {
  const [
    currency,
    setCurrency,
  ] = useState(
    "USD",
  );

  const [
    monthStart,
    setMonthStart,
  ] = useState(
    "1",
  );

  return (
    <SettingsCard
      eyebrow="Financial preferences"
      title="Workspace preferences"
      description="Choose the defaults CASE Budget uses when displaying and organizing this workspace."
      icon={
        <PreferencesIcon />
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="workspace-currency"
            className="text-sm font-bold text-[var(--text-primary)]"
          >
            Default currency
          </label>

          <select
            id="workspace-currency"
            value={
              currency
            }
            onChange={(
              event,
            ) =>
              setCurrency(
                event.target.value,
              )
            }
            className={inputClassName}
          >
            <option value="USD">
              USD — US Dollar
            </option>

            <option value="CAD">
              CAD — Canadian Dollar
            </option>

            <option value="EUR">
              EUR — Euro
            </option>

            <option value="GBP">
              GBP — British Pound
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="month-start"
            className="text-sm font-bold text-[var(--text-primary)]"
          >
            Budget month starts
          </label>

          <select
            id="month-start"
            value={
              monthStart
            }
            onChange={(
              event,
            ) =>
              setMonthStart(
                event.target.value,
              )
            }
            className={inputClassName}
          >
            <option value="1">
              1st of each month
            </option>

            <option value="15">
              15th of each month
            </option>

            <option value="last">
              Last day of each month
            </option>
          </select>
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--border-subtle)] pt-6">
        <PreferenceToggle
          title="Include workspace name in reports"
          description="Show the workspace name on generated reports and exports."
          defaultChecked
        />

        <div className="mt-5">
          <PreferenceToggle
            title="Show workspace activity"
            description="Record workspace-level changes in the household activity feed."
            defaultChecked
          />
        </div>
      </div>
    </SettingsCard>
  );
}

function WorkspaceDangerZoneCard() {
  return (
    <section className="rounded-[24px] border border-[color-mix(in_srgb,var(--danger)_28%,var(--border-subtle))] bg-[var(--surface-default)] shadow-sm">
      <div className="border-b border-[color-mix(in_srgb,var(--danger)_18%,var(--border-subtle))] px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] text-[var(--danger)]">
            <WarningIcon />
          </div>

          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--danger)]">
              Danger zone
            </p>

            <h2 className="mt-1 text-lg font-extrabold text-[var(--text-primary)]">
              Workspace lifecycle
            </h2>

            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
              These actions can affect access to financial data for everyone in
              this workspace.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Archive workspace
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Disable active use of this workspace while preserving its financial
            history.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--danger)_38%,var(--border-subtle))] px-4 text-sm font-bold text-[var(--danger)] outline-none transition hover:bg-[color-mix(in_srgb,var(--danger)_7%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
        >
          Archive workspace
        </button>
      </div>
    </section>
  );
}

function WorkspaceSummaryCard({
  workspaceName,
  workspaceType,
}: {
  workspaceName:
    string;

  workspaceType:
    WorkspaceType;
}) {
  const initials =
    getInitials(
      workspaceName,
    );

  return (
    <SettingsCard
      title="Workspace summary"
      description="Current workspace details"
      icon={
        <SummaryIcon />
      }
      compact
    >
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-muted)] p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-sm font-extrabold text-[var(--primary)]">
          {initials}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-[var(--text-primary)]">
            {workspaceName ||
              "Untitled workspace"}
          </p>

          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {
              workspaceType
            }{" "}
            workspace
          </p>
        </div>
      </div>

      <dl className="mt-5 space-y-4">
        <SummaryRow
          label="Your role"
          value="Owner"
        />

        <SummaryRow
          label="Members"
          value="1"
        />

        <SummaryRow
          label="Status"
          value="Active"
        />
      </dl>
    </SettingsCard>
  );
}

function WorkspaceAccessCard() {
  return (
    <SettingsCard
      title="Workspace access"
      description="Manage who can access this workspace."
      icon={
        <MembersIcon />
      }
      compact
    >
      <div className="space-y-4">
        <InfoRow
          icon={
            <OwnerIcon />
          }
          title="You are the owner"
          description="Owners can manage workspace settings, members, and financial data."
        />

        <a
          href="/dashboard/household/members"
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          Manage members

          <ArrowRightIcon />
        </a>
      </div>
    </SettingsCard>
  );
}

function WorkspaceHelpCard() {
  return (
    <section className="rounded-[24px] border border-[color-mix(in_srgb,var(--primary)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--surface-default))] p-5 sm:p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--primary)] shadow-sm">
        <HelpIcon />
      </div>

      <h2 className="mt-4 text-base font-extrabold text-[var(--text-primary)]">
        About workspaces
      </h2>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        Workspaces keep financial data separated so personal, household, and
        business finances can be managed independently.
      </p>
    </section>
  );
}

function SaveBar({
  hasChanges,
  isSaving,
  message,
  onReset,
  onSave,
}: {
  hasChanges:
    boolean;

  isSaving:
    boolean;

  message:
    string | null;

  onReset:
    () => void;

  onSave:
    () => void;
}) {
  return (
    <div className="sticky bottom-4 z-20 mt-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-default)_94%,transparent)] p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {hasChanges
              ? "You have unsaved changes"
              : "Workspace settings are up to date"}
          </p>

          {message ? (
            <p
              className={[
                "mt-0.5 text-xs",
                message ===
                "Workspace settings saved."
                  ? "text-[var(--success)]"
                  : "text-[var(--danger)]",
              ].join(
                " ",
              )}
            >
              {message}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Changes apply only to the currently selected workspace.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={
              !hasChanges ||
              isSaving
            }
            onClick={
              onReset
            }
            className="min-h-10 flex-1 rounded-xl border border-[var(--border-subtle)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            Discard
          </button>

          <button
            type="button"
            disabled={
              !hasChanges ||
              isSaving
            }
            onClick={
              onSave
            }
            className="min-h-10 flex-1 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            {isSaving
              ? "Saving..."
              : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({
  eyebrow,
  title,
  description,
  icon,
  compact = false,
  children,
}: {
  eyebrow?:
    string;

  title:
    string;

  description:
    string;

  icon:
    React.ReactNode;

  compact?:
    boolean;

  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
      <div
        className={[
          "border-b border-[var(--border-subtle)]",
          compact
            ? "px-5 py-5"
            : "px-5 py-5 sm:px-6",
        ].join(
          " ",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
            {icon}
          </div>

          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">
                {eyebrow}
              </p>
            ) : null}

            <h2
              className={[
                "font-extrabold text-[var(--text-primary)]",
                eyebrow
                  ? "mt-1 text-lg"
                  : "text-base",
              ].join(
                " ",
              )}
            >
              {title}
            </h2>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div
        className={
          compact
            ? "p-5"
            : "p-5 sm:p-6"
        }
      >
        {children}
      </div>
    </section>
  );
}

function PreferenceToggle({
  title,
  description,
  defaultChecked = false,
}: {
  title:
    string;

  description:
    string;

  defaultChecked?:
    boolean;
}) {
  const [
    enabled,
    setEnabled,
  ] = useState(
    defaultChecked,
  );

  return (
    <div className="flex items-start justify-between gap-5">
      <div>
        <p className="text-sm font-bold text-[var(--text-primary)]">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={
          enabled
        }
        onClick={() =>
          setEnabled(
            (
              current,
            ) =>
              !current,
          )
        }
        className={[
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
          enabled
            ? "bg-[var(--primary)]"
            : "bg-[var(--border-strong)]",
        ].join(
          " ",
        )}
      >
        <span
          className={[
            "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition",
            enabled
              ? "left-6"
              : "left-1",
          ].join(
            " ",
          )}
        />
      </button>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-[var(--text-muted)]">
        {label}
      </dt>

      <dd className="text-sm font-bold text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}

function InfoRow({
  icon,
  title,
  description,
}: {
  icon:
    React.ReactNode;

  title:
    string;

  description:
    string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--primary)]">
        {icon}
      </div>

      <div>
        <p className="text-sm font-bold text-[var(--text-primary)]">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function toManagerWorkspace(
  workspace:
    AppWorkspace | null,
): WorkspaceManagerWorkspace | null {
  if (
    !workspace
  ) {
    return null;
  }

  const type =
    workspace.type ===
      "household"
      ? "household"
      : workspace.type ===
          "business"
        ? "business"
        : "personal";

  return {
    id:
      workspace.id,

    name:
      workspace.name,

    type,

    memberCount:
      workspace.memberCount,

    isOwner:
      workspace.isOwner,
  };
}

function formatAppWorkspaceType(
  value:
    AppWorkspace["type"],
) {
  switch (
    value
  ) {
    case "household":
      return "Household";

    case "business":
      return "Business";

    case "family":
      return "Family";

    case "rental":
      return "Rental";

    case "trust":
      return "Trust";

    case "other":
      return "Other";

    case "personal":
    default:
      return "Personal";
  }
}

function getInitials(
  value:
    string,
) {
  const parts =
    value
      .replace(
        /['’]s\b/gi,
        "",
      )
      .trim()
      .split(
        /\s+/,
      )
      .filter(
        Boolean,
      );

  if (
    parts.length ===
    0
  ) {
    return "WS";
  }

  if (
    parts.length ===
    1
  ) {
    return parts[0]
      .slice(
        0,
        2,
      )
      .toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

const inputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)]";

function WorkspaceIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}

function EditWorkspaceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function PreferencesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21v-7" />
      <path d="M4 10V3" />
      <path d="M12 21v-9" />
      <path d="M12 8V3" />
      <path d="M20 21v-5" />
      <path d="M20 12V3" />
      <path d="M1 14h6" />
      <path d="M9 8h6" />
      <path d="M17 16h6" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function SummaryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10" />
      <path d="M7 12h6" />
      <path d="M7 16h4" />
    </svg>
  );
}

function MembersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function OwnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
      <path d="m16 5 1 1 2-2" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.7c-.9.8-1.8 1.3-1.8 2.8" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="17"
      height="17"
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

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}