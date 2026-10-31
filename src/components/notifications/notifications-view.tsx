"use client";

import { Bell, CheckCheck, Megaphone, MessageSquare, RefreshCw, Wrench } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { NotificationType } from "@/generated/prisma/enums";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

import { markAllReadAction, markOneReadAction, type NotificationFormState } from "@/app/notifications-actions";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
};

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  REQUEST_CREATED: Wrench,
  STATUS_CHANGED: RefreshCw,
  ADMIN_RESPONSE: MessageSquare,
  ANNOUNCEMENT_PUBLISHED: Megaphone,
};

/**
 * The notifications list, shared by both roles (Screen Inventory §6 lists Notifications as a
 * common screen). Unread rows carry a brand rail and a tinted background so the eye lands on
 * them first.
 */
export function NotificationsView({ items }: { items: NotificationItem[] }) {
  const [, markAllAction, markingAll] = useActionState<NotificationFormState, FormData>(
    markAllReadAction,
    {},
  );

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <Card>
      <CardHeader
        title={unread > 0 ? `Njoftimet (${unread} të palexuara)` : "Njoftimet"}
        action={
          unread > 0 ? (
            <form action={markAllAction}>
              <Button type="submit" variant="ghost" size="sm" disabled={markingAll}>
                <CheckCheck className="size-4" />
                {markingAll ? "..." : "Shëno të gjitha si të lexuara"}
              </Button>
            </form>
          ) : null
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-8" />}
          title="Asnjë njoftim"
          description="Njoftimet për ndryshimet e statusit dhe publikimet e reja do të shfaqen këtu."
        />
      ) : (
        <ul className="divide-y divide-ink-100">
          {items.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function NotificationRow({ notification }: { notification: NotificationItem }) {
  const [, markRead] = useActionState<NotificationFormState, FormData>(markOneReadAction, {});
  const Icon = ICONS[notification.type];

  const body = (
    <div className="flex gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          notification.isRead ? "bg-ink-100 text-ink-400" : "bg-brand-100 text-brand-700",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm",
            notification.isRead ? "text-ink-700" : "font-semibold text-ink-900",
          )}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 text-sm text-ink-500">{notification.message}</p>
        <p className="mt-1 text-xs text-ink-400">{formatRelativeTime(notification.createdAt)}</p>
      </div>
      {!notification.isRead ? (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-600" aria-label="E palexuar" />
      ) : null}
    </div>
  );

  return (
    <li className={cn("relative", !notification.isRead && "bg-brand-50/40")}>
      {!notification.isRead ? (
        <span className="absolute inset-y-0 left-0 w-[3px] bg-brand-600" aria-hidden />
      ) : null}

      {notification.link ? (
        <form action={markRead}>
          <input type="hidden" name="id" value={notification.id} />
          {/* Following the link also marks it read: submitting the form navigates via the action's
              revalidate, so the two actions stay in one gesture. */}
          <Link
            href={notification.link}
            onClick={(e) => {
              const form = e.currentTarget.closest("form");
              if (form) form.requestSubmit();
            }}
            className="block px-4 py-3 transition-colors hover:bg-ink-50"
          >
            {body}
          </Link>
        </form>
      ) : (
        <div className="px-4 py-3">{body}</div>
      )}
    </li>
  );
}
