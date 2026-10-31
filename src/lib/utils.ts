import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, letting later Tailwind utilities win over earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DATE_FORMATTER = new Intl.DateTimeFormat("sq-AL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("sq-AL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("sq-AL", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(date: Date | string): string {
  return DATE_FORMATTER.format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return DATE_TIME_FORMATTER.format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return TIME_FORMATTER.format(new Date(date));
}

/** Albanian relative time for notification and activity feeds. */
export function formatRelativeTime(date: Date | string): string {
  const target = new Date(date);
  const diffMs = Date.now() - target.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) return "Tani";
  if (diffMinutes < 60) return `${diffMinutes} min më parë`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} orë më parë`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ditë më parë`;

  return formatDate(target);
}

/**
 * Duration between a request being filed and resolved, in hours.
 * This is the measurement the thesis uses to evaluate H1.
 */
export function resolutionHours(createdAt: Date, resolvedAt: Date | null): number | null {
  if (!resolvedAt) return null;
  return (resolvedAt.getTime() - createdAt.getTime()) / 3_600_000;
}

/** Render a duration in hours as readable Albanian, e.g. "2 ditë 4 orë". */
export function formatDuration(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours)} orë`;

  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `${days} ditë ${remainingHours} orë` : `${days} ditë`;
}

export function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`;
}

export function initials(user: { firstName: string; lastName: string }): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}
