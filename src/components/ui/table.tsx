import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Table shell used by every list screen (wireframes Figura 10.1 "Latest Requests Table" and
 * Figura 10.2 "Maintenance Table").
 *
 * The wrapper scrolls horizontally on its own so a wide table never forces the page body to
 * scroll sideways on a phone.
 */
export function TableWrap({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("w-full overflow-x-auto", className)}>{children}</div>;
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>;
}

export function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-ink-200 bg-ink-50 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-ink-600 uppercase",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("border-b border-ink-100 px-4 py-3 align-middle text-ink-800", className)}>
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tr className={cn("transition-colors hover:bg-ink-50", className)}>{children}</tr>;
}

/**
 * A 3px status rail on the first cell of a request row, so a list can be scanned by colour before
 * any text is read.
 */
export function RailCell({ rail, children }: { rail: string; children: React.ReactNode }) {
  return (
    <td className="relative border-b border-ink-100 py-3 pr-4 pl-4 align-middle">
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", rail)} aria-hidden />
      {children}
    </td>
  );
}

/** Monospaced request identifier, e.g. MR-00042. */
export function RequestCode({ code, href }: { code: string; href?: string }) {
  const className = "font-mono text-xs font-semibold text-ink-700";
  if (href) {
    return (
      <Link href={href} className={cn(className, "hover:text-brand-600 hover:underline")}>
        {code}
      </Link>
    );
  }
  return <span className={className}>{code}</span>;
}
