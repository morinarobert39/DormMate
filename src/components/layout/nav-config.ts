import {
  BarChart3,
  Bell,
  Building,
  FileText,
  LayoutDashboard,
  Megaphone,
  QrCode,
  User,
  Users,
  Wrench,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Short label for the icon-rail tooltip and the tablet breakpoint. */
  short: string;
};

/** UI Architecture §5.1 — student navigation. */
export const STUDENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Paneli", icon: LayoutDashboard, short: "Paneli" },
  { href: "/maintenance", label: "Mirëmbajtja", icon: Wrench, short: "Mirëmbajtja" },
  { href: "/administrative", label: "Kërkesa administrative", icon: FileText, short: "Administrative" },
  { href: "/announcements", label: "Njoftimet", icon: Megaphone, short: "Njoftimet" },
  { href: "/notifications", label: "Njoftimet e mia", icon: Bell, short: "Të miat" },
  { href: "/profile", label: "Profili", icon: User, short: "Profili" },
];

/**
 * UI Architecture §5.2 — administrator navigation, plus the management screens required by
 * Development Architecture §5.2 (QR Code Management, User Management).
 */
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Paneli", icon: LayoutDashboard, short: "Paneli" },
  { href: "/admin/maintenance", label: "Menaxhimi i mirëmbajtjes", icon: Wrench, short: "Mirëmbajtja" },
  { href: "/admin/administrative", label: "Kërkesat administrative", icon: FileText, short: "Administrative" },
  { href: "/admin/announcements", label: "Njoftimet", icon: Megaphone, short: "Njoftimet" },
  { href: "/admin/locations", label: "Lokacionet", icon: Building, short: "Lokacionet" },
  { href: "/admin/qr-codes", label: "Kodet QR", icon: QrCode, short: "Kodet QR" },
  { href: "/admin/users", label: "Përdoruesit", icon: Users, short: "Përdoruesit" },
  { href: "/admin/statistics", label: "Statistikat", icon: BarChart3, short: "Statistikat" },
  { href: "/admin/notifications", label: "Njoftimet e mia", icon: Bell, short: "Të miat" },
  { href: "/admin/profile", label: "Profili", icon: User, short: "Profili" },
];
