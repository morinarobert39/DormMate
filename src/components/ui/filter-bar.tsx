"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { PRIORITY_LABELS, PRIORITY_ORDER, STATUS_LABELS, STATUS_ORDER, UI_TEXT } from "@/lib/constants";

/**
 * Filter bar for the request list screens (§10.4 — administrators filter, students search their
 * own history).
 *
 * Filters live in the URL rather than component state, so a filtered view is shareable, survives
 * a refresh, and the server can read it directly.
 */
export function FilterBar({
  categories,
  showPriority = false,
  basePath,
}: {
  categories: { id: string; name: string }[];
  showPriority?: boolean;
  basePath: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    sp.delete("page"); // any filter change returns to the first page
    router.push(`${pathname}?${sp.toString()}`);
  }

  const hasFilters =
    Boolean(params.get("status")) ||
    Boolean(params.get("categoryId")) ||
    Boolean(params.get("priority")) ||
    Boolean(params.get("q"));

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: query });
        }}
        className="relative min-w-50 flex-1"
      >
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={UI_TEXT.search}
          aria-label="Kërko"
          className="pl-8"
        />
      </form>

      <Select
        aria-label="Filtro sipas statusit"
        value={params.get("status") ?? ""}
        onChange={(e) => apply({ status: e.target.value })}
        className="w-auto"
      >
        <option value="">{UI_TEXT.allStatuses}</option>
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Filtro sipas kategorisë"
        value={params.get("categoryId") ?? ""}
        onChange={(e) => apply({ categoryId: e.target.value })}
        className="w-auto"
      >
        <option value="">{UI_TEXT.allCategories}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      {showPriority ? (
        <Select
          aria-label="Filtro sipas prioritetit"
          value={params.get("priority") ?? ""}
          onChange={(e) => apply({ priority: e.target.value })}
          className="w-auto"
        >
          <option value="">{UI_TEXT.allPriorities}</option>
          {PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </Select>
      ) : null}

      {hasFilters ? (
        <Link href={basePath}>
          <Button type="button" variant="ghost" size="sm">
            <X className="size-4" />
            Pastro
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
