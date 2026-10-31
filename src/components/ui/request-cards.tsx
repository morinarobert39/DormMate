import { QrCode } from "lucide-react";
import Link from "next/link";

import { PriorityBadge, STATUS_RAIL, StatusBadge } from "@/components/ui/badge";
import { LocationPlate, type PlateLocation } from "@/components/ui/location-plate";
import type { Priority, RequestStatus } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/utils";

/**
 * Phone rendering for the request lists.
 *
 * UI Architecture Tabela 12.1 specifies a single vertical column at ≤767px. A seven-column table
 * cannot honour that — forcing one to 640px and letting it scroll sideways hides the status, which
 * is the column a student actually opens the list to read. So below `md` the same rows render as
 * cards, and the table takes over from `md` up.
 *
 * Both views are driven by this one normalised shape, so the two can never drift apart in what
 * they show.
 */
export type RequestCardItem = {
  id: string;
  href: string;
  code: string;
  title: string;
  status: RequestStatus;
  category: string;
  date: Date;
  priority?: Priority;
  location?: PlateLocation | null;
  /** Student name — shown on the administrator's lists, omitted on a student's own. */
  person?: string | null;
  viaQr?: boolean;
};

export function RequestCards({ items }: { items: RequestCardItem[] }) {
  return (
    <ul className="divide-y divide-ink-100 md:hidden">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <Link href={item.href} className="block py-3 pr-4 pl-4 transition-colors active:bg-ink-50">
            <span
              className={`absolute inset-y-0 left-0 w-[3px] ${STATUS_RAIL[item.status]}`}
              aria-hidden
            />

            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-semibold text-ink-700">{item.code}</span>
                {item.viaQr ? (
                  <QrCode className="size-3.5 text-ink-400" aria-label="Raportuar me QR" />
                ) : null}
              </span>
              <StatusBadge status={item.status} />
            </div>

            <p className="mt-1 font-medium text-ink-900">{item.title}</p>

            {item.person ? <p className="mt-0.5 text-xs text-ink-600">{item.person}</p> : null}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {item.location ? (
                <LocationPlate location={item.location} showDormitory={false} />
              ) : null}
              {item.priority ? <PriorityBadge priority={item.priority} /> : null}
            </div>

            <p className="mt-2 text-xs text-ink-500">
              {item.category} · {formatDate(item.date)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
