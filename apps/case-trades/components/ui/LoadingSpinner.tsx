type LoadingSpinnerProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-4",
};

export default function LoadingSpinner({
  label = "Loading...",
  size = "md",
}: LoadingSpinnerProps) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span
        className={`${sizeClasses[size]} animate-spin rounded-full border-white/30 border-t-white`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}