interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2">
      <p className="text-sm text-red-600">
        {message}
      </p>
    </div>
  );
}
