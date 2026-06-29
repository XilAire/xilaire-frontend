export default function AdminActivityDiff({
  oldValue,
  newValue,
}: {
  oldValue?: unknown | null;
  newValue?: unknown | null;
}) {
  // If both are truly empty, nothing to show
  if (
    oldValue === undefined &&
    newValue === undefined
  ) {
    return null;
  }

  const isObject = (v: unknown) =>
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v);

  const renderValue = (value: unknown) => {
    if (value === null || value === undefined) return "—";
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "[unrenderable]";
    }
  };

  // 🔹 Primitive change (MOST COMMON FOR ROLES / STATUS)
  if (!isObject(oldValue) && !isObject(newValue)) {
    return (
      <div className="mt-3 text-sm flex items-center gap-2">
        <span className="text-muted-foreground">
          {renderValue(oldValue)}
        </span>
        <span className="mx-1">→</span>
        <span className="font-medium">
          {renderValue(newValue)}
        </span>
      </div>
    );
  }

  // 🔹 Object diff
  const keys = Array.from(
    new Set([
      ...Object.keys((oldValue as Record<string, any>) ?? {}),
      ...Object.keys((newValue as Record<string, any>) ?? {}),
    ])
  );

  return (
    <div className="mt-3 space-y-2 text-sm">
      {keys.map((key) => (
        <div key={key} className="flex items-center gap-2">
          <span className="font-medium capitalize">
            {key.replace(/_/g, " ")}
          </span>

          <span className="text-muted-foreground">
            {renderValue(
              (oldValue as any)?.[key]
            )}
          </span>

          <span className="mx-1">→</span>

          <span className="font-medium">
            {renderValue(
              (newValue as any)?.[key]
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
