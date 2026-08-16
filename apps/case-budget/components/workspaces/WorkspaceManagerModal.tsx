"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createPortal,
} from "react-dom";

import {
  useApp,
} from "@/components/providers/AppProvider";

export type WorkspaceManagerType =
  | "personal"
  | "household"
  | "business";

type WorkspaceManagerPlan =
  | "free"
  | "plus"
  | "pro";

type WorkspaceManagerBillingInterval =
  | "monthly"
  | "annual";

export type WorkspaceManagerWorkspace = {
  id:
    string;

  name:
    string;

  type:
    WorkspaceManagerType;

  description?:
    string | null;

  memberCount?:
    number;

  isOwner?:
    boolean;
};

export type WorkspaceManagerInitialView =
  | "manage"
  | "create"
  | "edit"
  | "delete";

export type WorkspaceManagerModalProps = {
  open:
    boolean;

  workspace:
    WorkspaceManagerWorkspace | null;

  initialView?:
    WorkspaceManagerInitialView;

  onClose:
    () => void;

  onOpenSettings?:
    (
      workspace:
        WorkspaceManagerWorkspace,
    ) => void;
};

type ManagerView =
  WorkspaceManagerInitialView;

type WorkspaceApiData = {
  id:
    string;

  name:
    string;

  workspaceType:
    WorkspaceManagerType;

  description:
    string | null;

  logoUrl?:
    string | null;

  isActive:
    boolean;

  isOwner:
    boolean;

  createdAt:
    string;

  updatedAt:
    string;

  selectedPlan:
    WorkspaceManagerPlan;

  billingInterval:
    WorkspaceManagerBillingInterval | null;

  requiresCheckout:
    boolean;
};

type WorkspaceCreateApiData = {
  id:
    string;

  name:
    string;

  slug:
    string;

  type:
    WorkspaceManagerType;

  description:
    string | null;

  memberCount:
    number;

  isOwner:
    true;

  createdAt:
    string;

  updatedAt:
    string;
};

type WorkspaceApiSuccess =
  | {
      success:
        true;

      data: {
        workspace:
          WorkspaceApiData;
      };

      error:
        null;
    }
  | {
      success:
        true;

      data: {
        workspace:
          WorkspaceCreateApiData;

        activeWorkspaceId:
          string | null;

        checkout: {
          required:
            boolean;

          plan:
            WorkspaceManagerPlan;

          billingInterval:
            WorkspaceManagerBillingInterval | null;

          workspaceId:
            string;
        };

        workspaceUsage: {
          plan:
            string;

          currentWorkspaceCount:
            number;

          includedWorkspaceLimit:
            number;

          additionalWorkspaceLimit:
            number;

          workspaceLimit:
            number;

          remainingWorkspaceCount:
            number;

          allowsAdditionalWorkspacePurchases:
            boolean;
        };
      };

      error:
        null;
    }
  | {
      success:
        true;

      data: {
        deletedWorkspaceId:
          string;

        activeWorkspaceId:
          string | null;
      };

      error:
        null;
    };

type WorkspaceApiError = {
  success:
    false;

  data:
    null;

  error: {
    code:
      string;

    message:
      string;
  };
};

type WorkspaceApiResponse =
  | WorkspaceApiSuccess
  | WorkspaceApiError;

type WorkspaceTypeOption = {
  value:
    WorkspaceManagerType;

  label:
    string;

  description:
    string;
};

const WORKSPACE_NAME_MAX_LENGTH =
  80;

const WORKSPACE_DESCRIPTION_MAX_LENGTH =
  240;

type WorkspacePlanOption = {
  value:
    WorkspaceManagerPlan;

  label:
    string;

  description:
    string;

  workspaceAllowance:
    string;

  features:
    string[];
};

const workspacePlanOptions:
  WorkspacePlanOption[] = [
    {
      value:
        "free",

      label:
        "Free",

      description:
        "Start with manual budgeting and no subscription charge.",

      workspaceAllowance:
        "1 owned workspace",

      features: [
        "Manual monthly budgeting",
        "No bank connections",
        "No AI features",
      ],
    },

    {
      value:
        "plus",

      label:
        "Plus",

      description:
        "Unlock paid financial tools for your independent workspace.",

      workspaceAllowance:
        "Up to 2 owned workspaces",

      features: [
        "Paid financial features",
        "Bank and account connections",
        "Separate workspace subscription",
      ],
    },

    {
      value:
        "pro",

      label:
        "Pro",

      description:
        "Use the full CASE Budget experience with the highest included workspace allowance.",

      workspaceAllowance:
        "Up to 5 owned workspaces",

      features: [
        "Full paid feature set",
        "AI Coach access",
        "Additional workspace capacity eligible",
      ],
    },
  ];

const workspaceTypeOptions:
  WorkspaceTypeOption[] = [
    {
      value:
        "personal",

      label:
        "Personal",

      description:
        "Individual budgeting and financial planning.",
    },

    {
      value:
        "household",

      label:
        "Household",

      description:
        "Shared household budgets, bills, and goals.",
    },

    {
      value:
        "business",

      label:
        "Business",

      description:
        "Separate business financial planning and activity.",
    },
  ];

export default function WorkspaceManagerModal({
  open,
  workspace,
  initialView =
    "manage",
  onClose,
  onOpenSettings,
}: WorkspaceManagerModalProps) {
  const {
    updateWorkspace,
  } = useApp();

  /*
   * A member of a workspace they do not own is creating an independent
   * CASE Budget workspace. The API remains the authority for ownership
   * and plan workspace limits.
   */
  const isInvitedWorkspaceMember =
    Boolean(
      workspace,
    ) &&
    workspace?.isOwner !==
      true;

  const [
    mounted,
    setMounted,
  ] = useState(
    false,
  );

  const [
    view,
    setView,
  ] = useState<ManagerView>(
    initialView,
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
  ] = useState<WorkspaceManagerType>(
    "personal",
  );

  const [
    description,
    setDescription,
  ] = useState(
    "",
  );

  const [
    selectedPlan,
    setSelectedPlan,
  ] = useState<WorkspaceManagerPlan>(
    "free",
  );

  const [
    billingInterval,
    setBillingInterval,
  ] = useState<WorkspaceManagerBillingInterval>(
    "monthly",
  );

  const [
    confirmationText,
    setConfirmationText,
  ] = useState(
    "",
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(
    false,
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(
    null,
  );

  const [
    initialEditName,
    setInitialEditName,
  ] = useState(
    "",
  );

  const [
    initialEditType,
    setInitialEditType,
  ] = useState<WorkspaceManagerType>(
    "personal",
  );

  const [
    initialEditDescription,
    setInitialEditDescription,
  ] = useState(
    "",
  );

  const normalizedWorkspaceName =
    useMemo(
      () =>
        workspaceName.trim(),
      [
        workspaceName,
      ],
    );

  const normalizedDescription =
    useMemo(
      () =>
        description.trim(),
      [
        description,
      ],
    );

  const normalizedConfirmation =
    useMemo(
      () =>
        confirmationText.trim(),
      [
        confirmationText,
      ],
    );

  const hasEditChanges =
    normalizedWorkspaceName !==
      initialEditName ||
    workspaceType !==
      initialEditType ||
    normalizedDescription !==
      initialEditDescription;

  const isWorkspaceFormValid =
    normalizedWorkspaceName.length >
      0 &&
    normalizedWorkspaceName.length <=
      WORKSPACE_NAME_MAX_LENGTH &&
    normalizedDescription.length <=
      WORKSPACE_DESCRIPTION_MAX_LENGTH;

  const canCreate =
    view ===
      "create" &&
    isWorkspaceFormValid &&
    !isSubmitting;

  const canEdit =
    view ===
      "edit" &&
    Boolean(
      workspace?.isOwner,
    ) &&
    isWorkspaceFormValid &&
    hasEditChanges &&
    !isSubmitting;

  const canDelete =
    view ===
      "delete" &&
    Boolean(
      workspace?.isOwner,
    ) &&
    Boolean(
      workspace?.name,
    ) &&
    normalizedConfirmation ===
      workspace?.name.trim() &&
    !isSubmitting;

  useEffect(
    () => {
      setMounted(
        true,
      );

      return () => {
        setMounted(
          false,
        );
      };
    },
    [],
  );

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      setView(
        initialView,
      );

      setErrorMessage(
        null,
      );

      setIsSubmitting(
        false,
      );

      setConfirmationText(
        "",
      );

      if (
        initialView ===
          "create"
      ) {
        resetCreateForm();

        return;
      }

      hydrateEditForm(
        workspace,
      );
    },
    [
      initialView,
      open,
      workspace,
    ],
  );

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      const originalOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      function handleKeyDown(
        event:
          KeyboardEvent,
      ) {
        if (
          event.key !==
          "Escape" ||
        isSubmitting
        ) {
          return;
        }

        if (
          view !==
          "manage"
        ) {
          returnToManage();

          return;
        }

        onClose();
      }

      window.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        document.body.style.overflow =
          originalOverflow;

        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      isSubmitting,
      onClose,
      open,
      view,
    ],
  );

  if (
    !mounted ||
    !open
  ) {
    return null;
  }

  function hydrateEditForm(
    targetWorkspace:
      WorkspaceManagerWorkspace | null,
  ) {
    if (
      !targetWorkspace
    ) {
      setWorkspaceName(
        "",
      );

      setWorkspaceType(
        "personal",
      );

      setDescription(
        "",
      );

      setInitialEditName(
        "",
      );

      setInitialEditType(
        "personal",
      );

      setInitialEditDescription(
        "",
      );

      return;
    }

    const nextName =
      targetWorkspace.name.trim();

    const nextType =
      targetWorkspace.type;

    const nextDescription =
      targetWorkspace.description?.trim() ??
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

    setInitialEditName(
      nextName,
    );

    setInitialEditType(
      nextType,
    );

    setInitialEditDescription(
      nextDescription,
    );
  }

  function resetCreateForm() {
    setWorkspaceName(
      "",
    );

    setWorkspaceType(
      "personal",
    );

    setDescription(
      "",
    );

    setInitialEditName(
      "",
    );

    setInitialEditType(
      "personal",
    );

    setInitialEditDescription(
      "",
    );

    setSelectedPlan(
      "free",
    );

    setBillingInterval(
      "monthly",
    );
  }

  function returnToManage() {
    setView(
      "manage",
    );

    setErrorMessage(
      null,
    );

    setConfirmationText(
      "",
    );

    hydrateEditForm(
      workspace,
    );
  }

  function openCreateView() {
    setView(
      "create",
    );

    setErrorMessage(
      null,
    );

    resetCreateForm();
  }

  function openEditView() {
    if (
      !workspace
    ) {
      return;
    }

    setView(
      "edit",
    );

    setErrorMessage(
      null,
    );

    hydrateEditForm(
      workspace,
    );
  }

  function openDeleteView() {
    if (
      !workspace
    ) {
      return;
    }

    setView(
      "delete",
    );

    setErrorMessage(
      null,
    );

    setConfirmationText(
      "",
    );
  }

  function handleBackdropMouseDown(
    event:
      React.MouseEvent<HTMLDivElement>,
  ) {
    if (
      event.target !==
        event.currentTarget ||
      isSubmitting
    ) {
      return;
    }

    onClose();
  }

  function handleOpenSettings() {
    if (
      !workspace
    ) {
      return;
    }

    if (
      onOpenSettings
    ) {
      onOpenSettings(
        workspace,
      );

      return;
    }

    window.location.assign(
      "/dashboard/settings/workspaces",
    );
  }

  async function handleCreateWorkspace(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !canCreate
    ) {
      return;
    }

    setIsSubmitting(
      true,
    );

    setErrorMessage(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/workspaces",
          {
            method:
              "POST",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            cache:
              "no-store",

            body:
              JSON.stringify(
                {
                  name:
                    normalizedWorkspaceName,

                  workspaceType,

                  description:
                    normalizedDescription ||
                    null,

                  plan:
                    selectedPlan,

                  ...(selectedPlan ===
                  "free"
                    ? {}
                    : {
                        billingInterval,
                      }),

                  makeActive:
                    true,
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
        !payload.success
      ) {
        throw new Error(
          payload.success
            ? "CASE Budget could not create the workspace."
            : payload.error.message,
        );
      }

      if (
        !(
          "checkout"
          in payload.data
        )
      ) {
        throw new Error(
          "CASE Budget created the workspace but did not return checkout information.",
        );
      }

      const checkout =
        payload.data.checkout;

      if (
        checkout.required
      ) {
        if (
          checkout.plan ===
            "free" ||
          !checkout.billingInterval
        ) {
          throw new Error(
            "CASE Budget could not determine the paid plan checkout details.",
          );
        }

        const checkoutResponse =
          await fetch(
            "/api/subscriptions/checkout",
            {
              method:
                "POST",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",
              },

              cache:
                "no-store",

              body:
                JSON.stringify(
                  {
                    plan:
                      checkout.plan,

                    interval:
                      checkout.billingInterval,
                  },
                ),
            },
          );

        const checkoutPayload =
          await readCheckoutApiResponse(
            checkoutResponse,
          );

        if (
          !checkoutResponse.ok
        ) {
          throw new Error(
            getCheckoutErrorMessage(
              checkoutPayload,
            ),
          );
        }

        const checkoutUrl =
          getCheckoutRedirectUrl(
            checkoutPayload,
          );

        if (
          checkoutUrl
        ) {
          window.location.assign(
            checkoutUrl,
          );

          return;
        }

        window.location.assign(
          "/dashboard/settings/billing",
        );

        return;
      }

      window.location.assign(
        "/dashboard/settings/workspaces",
      );
    } catch (
      error
    ) {
      setErrorMessage(
        getErrorMessage(
          error,
          "CASE Budget could not create the workspace.",
        ),
      );

      setIsSubmitting(
        false,
      );
    }
  }

  async function handleEditWorkspace(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !workspace ||
      !canEdit
    ) {
      return;
    }

    setIsSubmitting(
      true,
    );

    setErrorMessage(
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

            cache:
              "no-store",

            body:
              JSON.stringify(
                {
                  name:
                    normalizedWorkspaceName,

                  workspaceType,

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
        !(
          "workspace"
          in payload.data
        )
      ) {
        throw new Error(
          payload.success
            ? "CASE Budget could not update the workspace."
            : payload.error.message,
        );
      }

      const updatedWorkspace =
        payload.data.workspace;

      if (
        "workspaceType"
        in updatedWorkspace
      ) {
        updateWorkspace(
          updatedWorkspace.id,
          {
            name:
              updatedWorkspace.name,

            type:
              updatedWorkspace.workspaceType,
          },
        );
      }

      window.location.reload();
    } catch (
      error
    ) {
      setErrorMessage(
        getErrorMessage(
          error,
          "CASE Budget could not update the workspace.",
        ),
      );

      setIsSubmitting(
        false,
      );
    }
  }

  async function handleDeleteWorkspace() {
    if (
      !workspace ||
      !canDelete
    ) {
      return;
    }

    setIsSubmitting(
      true,
    );

    setErrorMessage(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/workspaces/current",
          {
            method:
              "DELETE",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            cache:
              "no-store",

            body:
              JSON.stringify(
                {
                  confirmation:
                    normalizedConfirmation,
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
        !payload.success
      ) {
        throw new Error(
          payload.success
            ? "CASE Budget could not delete the workspace."
            : payload.error.message,
        );
      }

      window.location.assign(
        "/dashboard",
      );
    } catch (
      error
    ) {
      setErrorMessage(
        getErrorMessage(
          error,
          "CASE Budget could not delete the workspace.",
        ),
      );

      setIsSubmitting(
        false,
      );
    }
  }

  const modal =
    (
      <div
        className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
        role="presentation"
        onMouseDown={
          handleBackdropMouseDown
        }
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-manager-title"
          className="relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl sm:max-h-[90dvh] sm:rounded-[28px]"
        >
          <WorkspaceManagerHeader
            view={
              view
            }
            workspace={
              workspace
            }
            isSubmitting={
              isSubmitting
            }
            isInvitedWorkspaceMember={
              isInvitedWorkspaceMember
            }
            onBack={
              view ===
                "manage"
                ? undefined
                : returnToManage
            }
            onClose={
              onClose
            }
          />

          {view ===
            "manage" ? (
            <ManageView
              workspace={
                workspace
              }
              isInvitedWorkspaceMember={
                isInvitedWorkspaceMember
              }
              onOpenSettings={
                handleOpenSettings
              }
              onCreate={
                openCreateView
              }
              onEdit={
                openEditView
              }
              onDelete={
                openDeleteView
              }
            />
          ) : null}

          {view ===
            "create" ? (
            <WorkspaceFormView
              mode="create"
              isInvitedWorkspaceMember={
                isInvitedWorkspaceMember
              }
              workspaceName={
                workspaceName
              }
              workspaceType={
                workspaceType
              }
              description={
                description
              }
              selectedPlan={
                selectedPlan
              }
              billingInterval={
                billingInterval
              }
              isSubmitting={
                isSubmitting
              }
              canSubmit={
                canCreate
              }
              errorMessage={
                errorMessage
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
              onPlanChange={
                setSelectedPlan
              }
              onBillingIntervalChange={
                setBillingInterval
              }
              onSubmit={
                handleCreateWorkspace
              }
              onCancel={
                returnToManage
              }
            />
          ) : null}

          {view ===
            "edit" ? (
            <WorkspaceFormView
              mode="edit"
              isInvitedWorkspaceMember={
                false
              }
              workspaceName={
                workspaceName
              }
              workspaceType={
                workspaceType
              }
              description={
                description
              }
              selectedPlan="free"
              billingInterval="monthly"
              isSubmitting={
                isSubmitting
              }
              canSubmit={
                canEdit
              }
              errorMessage={
                errorMessage
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
              onPlanChange={
                setSelectedPlan
              }
              onBillingIntervalChange={
                setBillingInterval
              }
              onSubmit={
                handleEditWorkspace
              }
              onCancel={
                returnToManage
              }
            />
          ) : null}

          {view ===
            "delete" ? (
            <DeleteView
              workspace={
                workspace
              }
              confirmationText={
                confirmationText
              }
              isSubmitting={
                isSubmitting
              }
              canDelete={
                canDelete
              }
              errorMessage={
                errorMessage
              }
              onConfirmationChange={
                setConfirmationText
              }
              onCancel={
                returnToManage
              }
              onDelete={
                handleDeleteWorkspace
              }
            />
          ) : null}
        </section>
      </div>
    );

  return createPortal(
    modal,
    document.body,
  );
}

function WorkspaceManagerHeader({
  view,
  workspace,
  isSubmitting,
  isInvitedWorkspaceMember,
  onBack,
  onClose,
}: {
  view:
    ManagerView;

  workspace:
    WorkspaceManagerWorkspace | null;

  isSubmitting:
    boolean;

  isInvitedWorkspaceMember:
    boolean;

  onBack?:
    () => void;

  onClose:
    () => void;
}) {
  const title =
    view ===
      "create"
      ? isInvitedWorkspaceMember
        ? "Create your workspace"
        : "Create workspace"
      : view ===
          "edit"
        ? "Edit workspace"
        : view ===
            "delete"
          ? "Delete workspace"
          : "Manage workspace";

  const eyebrow =
    view ===
      "delete"
      ? "Destructive action"
      : view ===
          "create"
        ? isInvitedWorkspaceMember
          ? "Independent workspace"
          : "New workspace"
        : "Workspace management";

  return (
    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-5 sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        {onBack ? (
          <button
            type="button"
            disabled={
              isSubmitting
            }
            onClick={
              onBack
            }
            aria-label="Back to workspace management"
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BackIcon />
          </button>
        ) : (
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <WorkspaceIcon />
          </div>
        )}

        <div className="min-w-0">
          <p
            className={[
              "text-xs font-extrabold uppercase tracking-[0.18em]",
              view ===
                "delete"
                ? "text-[var(--danger)]"
                : "text-[var(--primary)]",
            ].join(
              " ",
            )}
          >
            {eyebrow}
          </p>

          <h2
            id="workspace-manager-title"
            className="mt-1 text-xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl"
          >
            {title}
          </h2>

          <p className="mt-1 max-w-lg truncate text-sm text-[var(--text-muted)]">
            {view ===
              "create"
              ? isInvitedWorkspaceMember
                ? "Create a workspace you own, separate from the workspace that invited you."
                : "Create a separate CASE Budget workspace."
              : workspace?.name ??
                "CASE Budget workspace"}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={
          isSubmitting
        }
        onClick={
          onClose
        }
        aria-label="Close workspace manager"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CloseIcon />
      </button>
    </header>
  );
}

function ManageView({
  workspace,
  isInvitedWorkspaceMember,
  onOpenSettings,
  onCreate,
  onEdit,
  onDelete,
}: {
  workspace:
    WorkspaceManagerWorkspace | null;

  isInvitedWorkspaceMember:
    boolean;

  onOpenSettings:
    () => void;

  onCreate:
    () => void;

  onEdit:
    () => void;

  onDelete:
    () => void;
}) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
        {workspace ? (
          <WorkspaceSummaryCard
            workspace={
              workspace
            }
          />
        ) : (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]">
            No active workspace is currently available.
          </div>
        )}

        <div className="mt-5 space-y-3">
          <ManagerAction
            title="Workspace settings"
            description="Open preferences, access controls, and workspace-specific settings."
            icon={
              <SettingsIcon />
            }
            disabled={
              !workspace
            }
            onClick={
              onOpenSettings
            }
          />

          <ManagerAction
            title="Edit workspace"
            description={
              workspace?.isOwner
                ? "Change the workspace name, type, and description."
                : "Only the workspace owner can edit this workspace."
            }
            icon={
              <EditIcon />
            }
            disabled={
              !workspace?.isOwner
            }
            onClick={
              onEdit
            }
          />

          <ManagerAction
            title={
              isInvitedWorkspaceMember
                ? "Create your own workspace"
                : "Create another workspace"
            }
            description={
              isInvitedWorkspaceMember
                ? "Start an independent personal, household, or business workspace that you own. Your membership in this workspace will stay unchanged."
                : "Create another personal, household, or business workspace."
            }
            icon={
              <PlusIcon />
            }
            onClick={
              onCreate
            }
          />

          <ManagerAction
            title="Delete workspace"
            description={
              workspace?.isOwner
                ? "Permanently delete the current workspace."
                : "Only the workspace owner can delete this workspace."
            }
            icon={
              <TrashIcon />
            }
            disabled={
              !workspace?.isOwner
            }
            danger
            onClick={
              onDelete
            }
          />
        </div>
      </div>

      <footer className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-4 sm:px-6">
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          All workspace actions are kept inside this manager so the modal remains
          mounted throughout the workflow.
        </p>
      </footer>
    </>
  );
}

function WorkspaceFormView({
  mode,
  isInvitedWorkspaceMember,
  workspaceName,
  workspaceType,
  description,
  selectedPlan,
  billingInterval,
  isSubmitting,
  canSubmit,
  errorMessage,
  onWorkspaceNameChange,
  onWorkspaceTypeChange,
  onDescriptionChange,
  onPlanChange,
  onBillingIntervalChange,
  onSubmit,
  onCancel,
}: {
  mode:
    "create" | "edit";

  isInvitedWorkspaceMember:
    boolean;

  workspaceName:
    string;

  workspaceType:
    WorkspaceManagerType;

  description:
    string;

  selectedPlan:
    WorkspaceManagerPlan;

  billingInterval:
    WorkspaceManagerBillingInterval;

  isSubmitting:
    boolean;

  canSubmit:
    boolean;

  errorMessage:
    string | null;

  onWorkspaceNameChange:
    (
      value:
        string,
    ) => void;

  onWorkspaceTypeChange:
    (
      value:
        WorkspaceManagerType,
    ) => void;

  onDescriptionChange:
    (
      value:
        string,
    ) => void;

  onPlanChange:
    (
      value:
        WorkspaceManagerPlan,
    ) => void;

  onBillingIntervalChange:
    (
      value:
        WorkspaceManagerBillingInterval,
    ) => void;

  onSubmit:
    (
      event:
        React.FormEvent<HTMLFormElement>,
    ) => void;

  onCancel:
    () => void;
}) {
  return (
    <form
      onSubmit={
        onSubmit
      }
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-6">
          {mode ===
            "create" &&
          isInvitedWorkspaceMember ? (
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--primary)_22%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_7%,var(--surface-default))] p-4">
              <p className="text-sm font-extrabold text-[var(--text-primary)]">
                This workspace will belong to you.
              </p>

              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Your new workspace is independent from the workspace that invited
                you. You will be its owner, it will have its own plan and billing,
                and you can invite your own members. Your existing membership will
                remain unchanged.
              </p>
            </div>
          ) : null}

          {errorMessage ? (
            <ErrorBanner
              message={
                errorMessage
              }
            />
          ) : null}

          <div>
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor={`workspace-manager-name-${mode}`}
                className="text-sm font-bold text-[var(--text-primary)]"
              >
                Workspace name
              </label>

              <span className="text-xs text-[var(--text-muted)]">
                {workspaceName.length}/
                {WORKSPACE_NAME_MAX_LENGTH}
              </span>
            </div>

            <input
              id={`workspace-manager-name-${mode}`}
              type="text"
              autoComplete="off"
              autoFocus
              maxLength={
                WORKSPACE_NAME_MAX_LENGTH
              }
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
              placeholder="Workspace name"
              className={inputClassName}
            />
          </div>

          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Workspace type
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {workspaceTypeOptions.map(
                (
                  option,
                ) => {
                  const selected =
                    option.value ===
                    workspaceType;

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
                        "rounded-2xl border p-4 text-left transition",
                        selected
                          ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                          : "border-[var(--border-subtle)] hover:bg-[var(--surface-muted)]",
                      ].join(
                        " ",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
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
                        {option.description}
                      </p>
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {mode ===
            "create" ? (
            <div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    Choose your plan
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                    This plan belongs to the workspace you are creating. It does
                    not change the subscription or permissions of any workspace
                    you joined as a member.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {workspacePlanOptions.map(
                  (
                    option,
                  ) => {
                    const selected =
                      option.value ===
                      selectedPlan;

                    return (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        disabled={
                          isSubmitting
                        }
                        onClick={() =>
                          onPlanChange(
                            option.value,
                          )
                        }
                        className={[
                          "rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                          selected
                            ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                            : "border-[var(--border-subtle)] hover:bg-[var(--surface-muted)]",
                        ].join(
                          " ",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
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

                        <p className="mt-2 text-xs font-bold text-[var(--text-secondary)]">
                          {option.workspaceAllowance}
                        </p>

                        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                          {option.description}
                        </p>

                        <ul className="mt-3 space-y-1.5">
                          {option.features.map(
                            (
                              feature,
                            ) => (
                              <li
                                key={
                                  feature
                                }
                                className="flex items-start gap-2 text-[11px] leading-5 text-[var(--text-muted)]"
                              >
                                <span className="mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-default)] text-[var(--primary)]">
                                  <CheckIcon />
                                </span>

                                <span>
                                  {feature}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      </button>
                    );
                  },
                )}
              </div>

              {selectedPlan !==
                "free" ? (
                <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-[var(--text-primary)]">
                        Billing interval
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                        Stripe checkout will open after the workspace is created.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-1">
                      {(
                        [
                          "monthly",
                          "annual",
                        ] as const
                      ).map(
                        (
                          interval,
                        ) => {
                          const selected =
                            billingInterval ===
                            interval;

                          return (
                            <button
                              key={
                                interval
                              }
                              type="button"
                              disabled={
                                isSubmitting
                              }
                              onClick={() =>
                                onBillingIntervalChange(
                                  interval,
                                )
                              }
                              className={[
                                "min-h-9 rounded-lg px-4 text-xs font-extrabold capitalize transition disabled:cursor-not-allowed disabled:opacity-60",
                                selected
                                  ? "bg-[var(--primary)] text-white"
                                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
                              ].join(
                                " ",
                              )}
                            >
                              {interval}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
                  <p className="text-xs leading-5 text-[var(--text-muted)]">
                    Free creates the workspace immediately with no Stripe
                    checkout. You can upgrade this workspace later from Billing
                    &amp; Subscription.
                  </p>
                </div>
              )}
            </div>
          ) : null}

          <div>
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor={`workspace-manager-description-${mode}`}
                className="text-sm font-bold text-[var(--text-primary)]"
              >
                Description
              </label>

              <span className="text-xs text-[var(--text-muted)]">
                {description.length}/
                {WORKSPACE_DESCRIPTION_MAX_LENGTH}
              </span>
            </div>

            <textarea
              id={`workspace-manager-description-${mode}`}
              rows={4}
              maxLength={
                WORKSPACE_DESCRIPTION_MAX_LENGTH
              }
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
              placeholder="Optional workspace description..."
              className={`${inputClassName} resize-none`}
            />
          </div>
        </div>
      </div>

      <footer className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-4 sm:px-6">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={
              isSubmitting
            }
            onClick={
              onCancel
            }
            className={secondaryButtonClassName}
          >
            Back
          </button>

          <button
            type="submit"
            disabled={
              !canSubmit
            }
            className={primaryButtonClassName}
          >
            {isSubmitting
              ? mode ===
                  "create"
                ? "Creating..."
                : "Saving..."
              : mode ===
                  "create"
                ? selectedPlan ===
                    "free"
                  ? isInvitedWorkspaceMember
                    ? "Create my workspace"
                    : "Create workspace"
                  : `Create & continue to ${selectedPlan === "plus" ? "Plus" : "Pro"} checkout`
                : "Save changes"}
          </button>
        </div>
      </footer>
    </form>
  );
}

function DeleteView({
  workspace,
  confirmationText,
  isSubmitting,
  canDelete,
  errorMessage,
  onConfirmationChange,
  onCancel,
  onDelete,
}: {
  workspace:
    WorkspaceManagerWorkspace | null;

  confirmationText:
    string;

  isSubmitting:
    boolean;

  canDelete:
    boolean;

  errorMessage:
    string | null;

  onConfirmationChange:
    (
      value:
        string,
    ) => void;

  onCancel:
    () => void;

  onDelete:
    () => void;
}) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-5">
          {errorMessage ? (
            <ErrorBanner
              message={
                errorMessage
              }
            />
          ) : null}

          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_6%,var(--surface-default))] p-4">
            <p className="text-sm font-extrabold text-[var(--danger)]">
              This action cannot be undone.
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Deleting a workspace can remove workspace-specific financial data
              and memberships. The API will also prevent deletion if this is your
              last active workspace.
            </p>
          </div>

          {workspace ? (
            <WorkspaceSummaryCard
              workspace={
                workspace
              }
            />
          ) : null}

          <div>
            <label
              htmlFor="workspace-manager-delete-confirmation"
              className="text-sm font-bold text-[var(--text-primary)]"
            >
              Type the workspace name to confirm
            </label>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Enter{" "}
              <strong>
                {workspace?.name ??
                  ""}
              </strong>{" "}
              exactly.
            </p>

            <input
              id="workspace-manager-delete-confirmation"
              type="text"
              autoComplete="off"
              autoFocus
              value={
                confirmationText
              }
              onChange={(
                event,
              ) =>
                onConfirmationChange(
                  event.target.value,
                )
              }
              className="mt-3 min-h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--danger)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--danger)_16%,transparent)]"
            />
          </div>
        </div>
      </div>

      <footer className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-4 sm:px-6">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={
              isSubmitting
            }
            onClick={
              onCancel
            }
            className={secondaryButtonClassName}
          >
            Back
          </button>

          <button
            type="button"
            disabled={
              !canDelete
            }
            onClick={
              onDelete
            }
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--danger)] px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Deleting..."
              : "Delete workspace"}
          </button>
        </div>
      </footer>
    </>
  );
}

function WorkspaceSummaryCard({
  workspace,
}: {
  workspace:
    WorkspaceManagerWorkspace;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-sm font-extrabold text-[var(--primary)]">
          {getWorkspaceInitials(
            workspace.name,
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-extrabold text-[var(--text-primary)]">
              {workspace.name}
            </p>

            {workspace.isOwner ? (
              <span className="rounded-full bg-[var(--pro-soft)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[var(--pro)]">
                Owner
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {getWorkspaceTypeLabel(
              workspace.type,
            )}

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
      </div>
    </div>
  );
}

function ManagerAction({
  title,
  description,
  icon,
  disabled = false,
  danger = false,
  onClick,
}: {
  title:
    string;

  description:
    string;

  icon:
    React.ReactNode;

  disabled?:
    boolean;

  danger?:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className={[
        "group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition",
        disabled
          ? "cursor-not-allowed border-[var(--border-subtle)] bg-[var(--surface-muted)] opacity-55"
          : danger
            ? "border-[color-mix(in_srgb,var(--danger)_20%,var(--border-subtle))] hover:bg-[color-mix(in_srgb,var(--danger)_6%,var(--surface-default))]"
            : "border-[var(--border-subtle)] hover:bg-[var(--surface-muted)]",
      ].join(
        " ",
      )}
    >
      <span
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          danger &&
          !disabled
            ? "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]"
            : "bg-[var(--surface-default)] text-[var(--text-muted)]",
        ].join(
          " ",
        )}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={[
            "block text-sm font-extrabold",
            danger &&
            !disabled
              ? "text-[var(--danger)]"
              : "text-[var(--text-primary)]",
          ].join(
            " ",
          )}
        >
          {title}
        </span>

        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </span>
      </span>

      <span className="mt-2 shrink-0 text-[var(--text-muted)]">
        <ChevronRightIcon />
      </span>
    </button>
  );
}

function ErrorBanner({
  message,
}: {
  message:
    string;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3 text-sm text-[var(--danger)]"
    >
      {message}
    </div>
  );
}

async function readWorkspaceApiResponse(
  response:
    Response,
): Promise<WorkspaceApiResponse> {
  const body =
    await response.text();

  if (
    !body.trim()
  ) {
    throw new Error(
      `CASE Budget received an empty response from the workspace API (HTTP ${response.status}).`,
    );
  }

  try {
    return JSON.parse(
      body,
    ) as WorkspaceApiResponse;
  } catch {
    throw new Error(
      `CASE Budget received an invalid workspace API response (HTTP ${response.status}).`,
    );
  }
}

type CheckoutApiPayload =
  Record<string, unknown>;

async function readCheckoutApiResponse(
  response:
    Response,
): Promise<CheckoutApiPayload> {
  const body =
    await response.text();

  if (
    !body.trim()
  ) {
    if (
      response.ok
    ) {
      return {};
    }

    throw new Error(
      `CASE Budget received an empty response from the subscription checkout API (HTTP ${response.status}).`,
    );
  }

  try {
    const parsed =
      JSON.parse(
        body,
      ) as unknown;

    return isRecord(
      parsed,
    )
      ? parsed
      : {};
  } catch {
    throw new Error(
      `CASE Budget received an invalid subscription checkout API response (HTTP ${response.status}).`,
    );
  }
}

function getCheckoutErrorMessage(
  payload:
    CheckoutApiPayload,
) {
  const error =
    payload.error;

  if (
    typeof error ===
      "string" &&
    error.trim()
  ) {
    return error;
  }

  if (
    isRecord(
      error,
    ) &&
    typeof error.message ===
      "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  if (
    typeof payload.message ===
      "string" &&
    payload.message.trim()
  ) {
    return payload.message;
  }

  return "CASE Budget created the workspace but could not start subscription checkout.";
}

function getCheckoutRedirectUrl(
  payload:
    CheckoutApiPayload,
) {
  const directKeys = [
    "url",
    "checkoutUrl",
    "checkout_url",
  ];

  for (
    const key of
      directKeys
  ) {
    const value =
      payload[
        key
      ];

    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value;
    }
  }

  if (
    isRecord(
      payload.data,
    )
  ) {
    for (
      const key of
        directKeys
    ) {
      const value =
        payload.data[
          key
        ];

      if (
        typeof value ===
          "string" &&
        value.trim()
      ) {
        return value;
      }
    }
  }

  return null;
}

function isRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function getErrorMessage(
  error:
    unknown,
  fallback:
    string,
) {
  return error instanceof
    Error
    ? error.message
    : fallback;
}

function getWorkspaceInitials(
  name:
    string,
) {
  return (
    name
      .trim()
      .split(
        /\s+/,
      )
      .map(
        (
          part,
        ) =>
          part.charAt(
            0,
          ),
      )
      .join(
        "",
      )
      .slice(
        0,
        2,
      )
      .toUpperCase() ||
    "CB"
  );
}

function getWorkspaceTypeLabel(
  type:
    WorkspaceManagerType,
) {
  switch (
    type
  ) {
    case "household":
      return "Household workspace";

    case "business":
      return "Business workspace";

    case "personal":
    default:
      return "Personal workspace";
  }
}

const inputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)]";

const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50";

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

function WorkspaceIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="2"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="2"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="2"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="2"
      />
    </svg>
  );
}

function SettingsIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="3"
      />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="m4.93 4.93 2.12 2.12" />
      <path d="m16.95 16.95 2.12 2.12" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="m4.93 19.07 2.12-2.12" />
      <path d="m16.95 7.05 2.12-2.12" />
    </svg>
  );
}

function EditIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
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

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ChevronRightIcon() {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function BackIcon() {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
