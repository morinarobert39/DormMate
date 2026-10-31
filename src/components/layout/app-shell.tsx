"use client";

import { Bell, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/ui/logo";
import { ADMIN_NAV, STUDENT_NAV, type NavItem } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";

export type ShellUser = {
  name: string;
  initials: string;
  roleLabel: string;
  dormitoryName: string | null;
  roomLabel: string | null;
};

/**
 * Application shell: dark sidebar + top header, per the wireframes (Figura 10.1 / 10.2).
 *
 * Responsive behaviour follows UI Architecture Tabela 12.1 exactly:
 *   ≤767px   hamburger drawer
 *   768–1023 collapsed icon rail
 *   ≥1024    full sidebar
 */
export function AppShell({
  variant,
  user,
  unreadCount,
  notificationsHref,
  children,
}: {
  /**
   * Which navigation to render. A plain string rather than the array itself: nav items carry
   * lucide component references, and React cannot serialize functions across the server/client
   * boundary — so the client picks the list, the server only names it.
   */
  variant: "student" | "admin";
  user: ShellUser;
  unreadCount: number;
  notificationsHref: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const nav: NavItem[] = variant === "admin" ? ADMIN_NAV : STUDENT_NAV;

  // The drawer closes on the click that navigates (see Sidebar), not from an effect watching
  // the pathname — closing it is a consequence of the user's action, not of the route changing.

  return (
    <div className="min-h-dvh">
      <Sidebar
        nav={nav}
        pathname={pathname}
        user={user}
        drawerOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <div className="flex min-h-dvh flex-col md:pl-16 lg:pl-64">
        <Header
          user={user}
          unreadCount={unreadCount}
          notificationsHref={notificationsHref}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  // "/admin" must not light up for "/admin/users", but "/maintenance" should for
  // "/maintenance/new".
  if (href === "/admin" || href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({
  nav,
  pathname,
  user,
  drawerOpen,
  onClose,
}: {
  nav: NavItem[];
  pathname: string;
  user: ShellUser;
  drawerOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Scrim behind the mobile drawer */}
      {drawerOpen ? (
        <button
          type="button"
          aria-label="Mbyll menynë"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-ink-950/50 md:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink-900 transition-transform duration-200",
          "md:w-16 md:translate-x-0 lg:w-64",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4 md:justify-center lg:justify-between">
          <Logo tone="light" showWordmark className="md:hidden lg:inline-flex" />
          <Logo tone="light" showWordmark={false} className="hidden md:inline-flex lg:hidden" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Mbyll menynë"
            className="rounded-card p-1.5 text-ink-400 hover:bg-ink-800 hover:text-white md:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 md:px-2 lg:px-3">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-card px-3 py-2 text-sm font-medium transition-colors",
                  "md:justify-center md:px-0 lg:justify-start lg:px-3",
                  active
                    ? "bg-brand-600 text-white"
                    : "text-ink-300 hover:bg-ink-800 hover:text-white",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="md:hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-ink-800 p-3 md:hidden lg:block">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-ink-400">
            {user.dormitoryName ?? user.roleLabel}
            {user.roomLabel ? ` · ${user.roomLabel}` : ""}
          </p>
        </div>
      </aside>
    </>
  );
}

function Header({
  user,
  unreadCount,
  notificationsHref,
  onOpenDrawer,
}: {
  user: ShellUser;
  unreadCount: number;
  notificationsHref: string;
  onOpenDrawer: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-ink-200 bg-white px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Hap menynë"
        className="-ml-1 rounded-card p-2 text-ink-600 hover:bg-ink-100 md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <Logo className="md:hidden" showWordmark={false} />

      <div className="flex-1" />

      <Link
        href={notificationsHref}
        className="relative rounded-card p-2 text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
        aria-label={
          unreadCount > 0 ? `Njoftimet, ${unreadCount} të palexuara` : "Njoftimet"
        }
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="tabular absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-urgent-edge px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Link>

      <div className="flex items-center gap-2.5 border-l border-ink-200 pl-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
          {user.initials}
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-medium text-ink-900">{user.name}</span>
          <span className="block text-xs text-ink-500">{user.roleLabel}</span>
        </span>
      </div>

      <form action="/api/sign-out" method="post">
        <button
          type="submit"
          aria-label="Dil"
          title="Dil"
          className="rounded-card p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-urgent-fg"
        >
          <LogOut className="size-5" />
        </button>
      </form>
    </header>
  );
}
