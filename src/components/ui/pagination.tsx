import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Pagination for the list screens (Technical Design §15 lists pagination as a performance measure).
 * Links rather than buttons, so page state stays in the URL and a filtered list can be shared.
 */
export function Pagination({
  page,
  pageCount,
  total,
  buildHref,
}: {
  page: number;
  pageCount: number;
  total: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) {
    return (
      <div className="flex items-center justify-end border-t border-ink-200 px-4 py-3 text-xs text-ink-500">
        {total} {total === 1 ? "rezultat" : "rezultate"}
      </div>
    );
  }

  const base =
    "inline-flex h-8 items-center gap-1 rounded-card border border-ink-200 px-3 text-xs font-medium";

  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink-200 px-4 py-3">
      <span className="text-xs text-ink-500">
        Faqja {page} nga {pageCount} · {total} rezultate
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className={cn(base, "bg-white hover:bg-ink-50")}>
            <ChevronLeft className="size-3.5" />
            Prapa
          </Link>
        ) : (
          <span className={cn(base, "cursor-not-allowed bg-ink-50 text-ink-400")}>
            <ChevronLeft className="size-3.5" />
            Prapa
          </span>
        )}
        {page < pageCount ? (
          <Link href={buildHref(page + 1)} className={cn(base, "bg-white hover:bg-ink-50")}>
            Përpara
            <ChevronRight className="size-3.5" />
          </Link>
        ) : (
          <span className={cn(base, "cursor-not-allowed bg-ink-50 text-ink-400")}>
            Përpara
            <ChevronRight className="size-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
