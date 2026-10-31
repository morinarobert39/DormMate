import type { Priority, RequestStatus } from "@/generated/prisma/enums";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Status is the single most-scanned value in the product, so it always renders the same way:
 * same colour, same label, same shape, on every screen (UI Architecture §3.2, §14).
 */
const STATUS_STYLES: Record<RequestStatus, string> = {
  PENDING: "bg-pending-bg text-pending-fg",
  IN_PROGRESS: "bg-progress-bg text-progress-fg",
  RESOLVED: "bg-resolved-bg text-resolved-fg",
};

export function StatusBadge({
  status,
  className,
}: {
  status: RequestStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-chip px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-ink-100 text-ink-600",
  MEDIUM: "bg-ink-100 text-ink-700",
  HIGH: "bg-pending-bg text-pending-fg",
  URGENT: "bg-urgent-bg text-urgent-fg",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-chip px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        PRIORITY_STYLES[priority],
        className,
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

/** Neutral chip for categories, roles and counts. */
export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-chip bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The colour rail used down the left edge of request rows and cards. */
export const STATUS_RAIL: Record<RequestStatus, string> = {
  PENDING: "bg-pending-edge",
  IN_PROGRESS: "bg-progress-edge",
  RESOLVED: "bg-resolved-edge",
};
