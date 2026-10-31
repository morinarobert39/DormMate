import type { RequestStatus, Role } from "@/generated/prisma/enums";
import { ROLE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";

/**
 * The life of a request, in order.
 *
 * Transparency for the student is the point of the whole platform (Business Analysis §3 — under
 * the paper process a student could not tell whether a request had even been received). The
 * timeline is also the visible face of the resolution-time data the thesis evaluates H1 with.
 */

const DOT: Record<RequestStatus, string> = {
  PENDING: "bg-pending-edge",
  IN_PROGRESS: "bg-progress-edge",
  RESOLVED: "bg-resolved-edge",
};

export type TimelineEntry = {
  id: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  note: string | null;
  changedAt: Date;
  changedBy: { firstName: string; lastName: string; role: Role };
};

export function StatusTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="px-4 py-6 text-sm text-ink-500">Nuk ka histori për këtë kërkesë.</p>;
  }

  return (
    <ol className="relative space-y-5 px-4 py-4">
      {entries.map((entry, index) => (
        <li key={entry.id} className="relative flex gap-3">
          {/* Connector line to the next event */}
          {index < entries.length - 1 ? (
            <span className="absolute top-4 left-[5px] h-full w-px bg-ink-200" aria-hidden />
          ) : null}

          <span
            className={cn("relative mt-1 size-2.5 shrink-0 rounded-full", DOT[entry.toStatus])}
            aria-hidden
          />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-900">
              {entry.fromStatus === null
                ? "Kërkesa u krijua"
                : `Statusi u ndryshua në "${STATUS_LABELS[entry.toStatus]}"`}
            </p>
            <p className="mt-0.5 text-xs text-ink-500">
              {entry.changedBy.firstName} {entry.changedBy.lastName} ·{" "}
              {ROLE_LABELS[entry.changedBy.role]} · {formatDateTime(entry.changedAt)}
            </p>
            {entry.note ? (
              <p className="mt-1.5 rounded-card bg-ink-50 px-3 py-2 text-sm text-ink-700">
                {entry.note}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
