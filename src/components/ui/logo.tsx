import { cn } from "@/lib/utils";

/**
 * DormMate mark: a building silhouette whose lit windows spell out the three request statuses.
 * It reuses the status colours, so the brand and the data speak the same visual language.
 */
export function Logo({
  className,
  showWordmark = true,
  tone = "dark",
}: {
  className?: string;
  showWordmark?: boolean;
  tone?: "dark" | "light";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 32 32"
        aria-hidden
        className="size-8 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="3"
          y="6"
          width="26"
          height="23"
          rx="2"
          className={tone === "dark" ? "fill-ink-900" : "fill-white"}
        />
        <path
          d="M16 1.5 30.5 8H1.5L16 1.5Z"
          className={tone === "dark" ? "fill-brand-600" : "fill-brand-500"}
        />
        <rect x="7" y="11" width="4.5" height="4.5" rx="0.75" className="fill-pending-edge" />
        <rect x="13.75" y="11" width="4.5" height="4.5" rx="0.75" className="fill-progress-edge" />
        <rect x="20.5" y="11" width="4.5" height="4.5" rx="0.75" className="fill-resolved-edge" />
        <rect
          x="13.75"
          y="19"
          width="4.5"
          height="10"
          rx="0.75"
          className={tone === "dark" ? "fill-ink-400" : "fill-ink-300"}
        />
      </svg>
      {showWordmark ? (
        <span
          className={cn(
            "text-lg font-semibold tracking-tight",
            tone === "dark" ? "text-ink-900" : "text-white",
          )}
        >
          Dorm<span className={tone === "dark" ? "text-brand-600" : "text-brand-500"}>Mate</span>
        </span>
      ) : null}
    </span>
  );
}
