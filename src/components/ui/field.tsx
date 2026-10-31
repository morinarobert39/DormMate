import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-card border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 transition-colors " +
  "hover:border-ink-300 focus:border-brand-600 focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-600";

/**
 * Every control is wrapped in a labelled field. UI Architecture §13 requires clear form labels and
 * understandable error messages, so the label is always rendered — never replaced by a placeholder.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-800">
        {label}
        {required ? <span className="ml-0.5 text-urgent-fg">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-500">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-urgent-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(CONTROL, invalid && "border-urgent-edge", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(CONTROL, "min-h-24 resize-y", invalid && "border-urgent-edge", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({
  className,
  invalid,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn(CONTROL, "cursor-pointer", invalid && "border-urgent-edge", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

/** Form-level error, shown above the submit row. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-card border border-urgent-edge/30 bg-urgent-bg px-3 py-2 text-sm font-medium text-urgent-fg"
    >
      {message}
    </div>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="rounded-card border border-resolved-edge/30 bg-resolved-bg px-3 py-2 text-sm font-medium text-resolved-fg"
    >
      {message}
    </div>
  );
}
