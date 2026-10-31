import Link from "next/link";

import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-ink-200 bg-white", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3",
        className,
      )}
    >
      <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      {action}
    </div>
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

/**
 * The dashboard statistic card from the wireframes (Figura 10.1 / 10.2): a quiet label above a
 * large number. UI Architecture §11 calls this the "Information First" pattern.
 */
export function StatCard({
  label,
  value,
  accent = "neutral",
  icon,
  href,
}: {
  label: string;
  value: number | string;
  accent?: "neutral" | "pending" | "progress" | "resolved" | "urgent";
  icon?: React.ReactNode;
  href?: string;
}) {
  const ACCENTS = {
    neutral: "text-ink-900",
    pending: "text-pending-fg",
    progress: "text-progress-fg",
    resolved: "text-resolved-fg",
    urgent: "text-urgent-fg",
  } as const;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-ink-500 uppercase">{label}</span>
        {icon ? <span className="text-ink-300">{icon}</span> : null}
      </div>
      <span className={cn("tabular mt-2 block text-3xl font-semibold", ACCENTS[accent])}>
        {value}
      </span>
    </>
  );

  const classes = cn(
    "block rounded-card border border-ink-200 bg-white p-4",
    href && "transition-colors hover:border-ink-300 hover:bg-ink-50",
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-ink-300">{icon}</div> : null}
      <p className="text-sm font-medium text-ink-800">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
