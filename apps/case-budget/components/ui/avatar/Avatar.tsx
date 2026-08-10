"use client";

import {
  useMemo,
  useState,
  type HTMLAttributes,
  type ImgHTMLAttributes,
} from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

type AvatarShape = "circle" | "rounded";

type AvatarStatus =
  | "online"
  | "offline"
  | "away"
  | "busy";

type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  src?: string | null;
  alt?: string;
  name?: string;
  initials?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  status?: AvatarStatus;
  statusLabel?: string;
  fallbackColor?:
    | "emerald"
    | "blue"
    | "violet"
    | "amber"
    | "rose"
    | "slate";
  imageProps?: Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    "src" | "alt" | "onError"
  >;
};

type AvatarGroupProps = HTMLAttributes<HTMLDivElement> & {
  max?: number;
  size?: AvatarSize;
  names?: string[];
};

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

const shapeClasses: Record<AvatarShape, string> = {
  circle: "rounded-full",
  rounded: "rounded-2xl",
};

const fallbackColorClasses = {
  emerald:
    "border-emerald-400/20 bg-emerald-500/15 text-emerald-300",
  blue:
    "border-sky-400/20 bg-sky-500/15 text-sky-300",
  violet:
    "border-violet-400/20 bg-violet-500/15 text-violet-300",
  amber:
    "border-amber-400/20 bg-amber-500/15 text-amber-300",
  rose:
    "border-rose-400/20 bg-rose-500/15 text-rose-300",
  slate:
    "border-white/10 bg-white/[0.06] text-slate-300",
};

const statusClasses: Record<AvatarStatus, string> = {
  online: "bg-emerald-400",
  offline: "bg-slate-500",
  away: "bg-amber-400",
  busy: "bg-rose-400",
};

const statusSizeClasses: Record<AvatarSize, string> = {
  xs: "h-2 w-2 border",
  sm: "h-2.5 w-2.5 border-2",
  md: "h-3 w-3 border-2",
  lg: "h-3.5 w-3.5 border-2",
  xl: "h-4 w-4 border-2",
};

const statusPositionClasses: Record<AvatarSize, string> = {
  xs: "bottom-0 right-0",
  sm: "bottom-0 right-0",
  md: "bottom-0 right-0",
  lg: "bottom-0.5 right-0.5",
  xl: "bottom-1 right-1",
};

function getInitials(name?: string, initials?: string) {
  if (initials?.trim()) {
    return initials
      .trim()
      .slice(0, 3)
      .toUpperCase();
  }

  if (!name?.trim()) {
    return "?";
  }

  const nameParts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (nameParts.length === 1) {
    return nameParts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${nameParts[0][0]}${
    nameParts[nameParts.length - 1][0]
  }`.toUpperCase();
}

export default function Avatar({
  src,
  alt,
  name,
  initials,
  size = "md",
  shape = "circle",
  status,
  statusLabel,
  fallbackColor = "emerald",
  imageProps,
  className = "",
  ...avatarProps
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const fallbackInitials = useMemo(
    () => getInitials(name, initials),
    [initials, name],
  );

  const resolvedAlt =
    alt ?? (name ? `${name} profile picture` : "Profile picture");

  const shouldShowImage =
    Boolean(src) && !imageFailed;

  return (
    <div
      {...avatarProps}
      className={[
        "relative inline-flex shrink-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "inline-flex shrink-0 items-center justify-center overflow-hidden border font-bold uppercase tracking-wide",
          sizeClasses[size],
          shapeClasses[shape],
          shouldShowImage
            ? "border-white/10 bg-slate-800"
            : fallbackColorClasses[fallbackColor],
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {shouldShowImage ? (
          <img
            {...imageProps}
            src={src ?? undefined}
            alt={resolvedAlt}
            onError={() => {
              setImageFailed(true);
            }}
            className={[
              "h-full w-full object-cover",
              imageProps?.className ?? "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ) : (
          <span aria-hidden="true">
            {fallbackInitials}
          </span>
        )}
      </div>

      {status ? (
        <span
          role="status"
          aria-label={
            statusLabel ??
            `${name ?? "User"} is ${status}`
          }
          title={
            statusLabel ??
            `${name ?? "User"} is ${status}`
          }
          className={[
            "absolute rounded-full border-slate-950",
            statusClasses[status],
            statusSizeClasses[size],
            statusPositionClasses[size],
          ].join(" ")}
        />
      ) : null}
    </div>
  );
}

export function AvatarGroup({
  children,
  max = 4,
  size = "md",
  names = [],
  className = "",
  ...groupProps
}: AvatarGroupProps) {
  const childArray = Array.isArray(children)
    ? children
    : children
      ? [children]
      : [];

  const visibleChildren = childArray.slice(0, max);
  const hiddenCount = Math.max(
    childArray.length - max,
    0,
  );

  const hiddenNames = names
    .slice(max)
    .filter(Boolean);

  const hiddenLabel =
    hiddenNames.length > 0
      ? hiddenNames.join(", ")
      : `${hiddenCount} more ${
          hiddenCount === 1 ? "person" : "people"
        }`;

  return (
    <div
      {...groupProps}
      role="group"
      aria-label="Avatar group"
      className={[
        "flex items-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {visibleChildren.map((child, index) => (
        <div
          key={index}
          className={[
            "relative rounded-full ring-2 ring-slate-950",
            index > 0 ? "-ml-2.5" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            zIndex: visibleChildren.length - index,
          }}
        >
          {child}
        </div>
      ))}

      {hiddenCount > 0 ? (
        <div
          title={hiddenLabel}
          aria-label={hiddenLabel}
          className={[
            "-ml-2.5 inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800 font-bold text-slate-300 ring-2 ring-slate-950",
            sizeClasses[size],
          ].join(" ")}
        >
          +{hiddenCount}
        </div>
      ) : null}
    </div>
  );
}