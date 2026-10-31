import {
  AnnouncementScope,
  LocationType,
  NotificationType,
  Priority,
  RequestStatus,
  Role,
} from "@/generated/prisma/enums";

/**
 * Every Albanian string the user sees for an enum value lives here.
 *
 * Development Architecture §5.3 requires code to be written in English, while UI Architecture §10
 * specifies Albanian labels on screen. Keeping the translation in one place is what lets both hold
 * at once — components render `STATUS_LABELS[status]` and never hardcode a label.
 */

/** BR-06 — the only three statuses a request may have. */
export const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Në Pritje",
  IN_PROGRESS: "Në Proces",
  RESOLVED: "E Zgjidhur",
};

export const STATUS_ORDER: RequestStatus[] = [
  RequestStatus.PENDING,
  RequestStatus.IN_PROGRESS,
  RequestStatus.RESOLVED,
];

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "I ulët",
  MEDIUM: "Mesatar",
  HIGH: "I lartë",
  URGENT: "Urgjent",
};

export const PRIORITY_ORDER: Priority[] = [
  Priority.LOW,
  Priority.MEDIUM,
  Priority.HIGH,
  Priority.URGENT,
];

/** Technical Design §9.3 — ROOM is the student's own room; the rest are shared spaces. */
export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  ROOM: "Dhomë",
  ENTRANCE: "Hyrje",
  HALLWAY: "Korridor",
  BATHROOM: "Tualet",
  SHOWER: "Dush",
};

/** BR-04 — the locations a student may pick manually. Deliberately excludes ROOM. */
export const SHARED_LOCATION_TYPES: LocationType[] = [
  LocationType.ENTRANCE,
  LocationType.HALLWAY,
  LocationType.BATHROOM,
  LocationType.SHOWER,
];

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Student",
  ADMIN: "Administrator",
};

export const ANNOUNCEMENT_SCOPE_LABELS: Record<AnnouncementScope, string> = {
  DORMITORY: "Konvikte të zgjedhura",
  GLOBAL: "Të gjitha konviktet",
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  REQUEST_CREATED: "Kërkesë e re",
  STATUS_CHANGED: "Ndryshim statusi",
  ADMIN_RESPONSE: "Përgjigje nga administrata",
  ANNOUNCEMENT_PUBLISHED: "Njoftim i ri",
};

/** Shared UI copy, so wording stays consistent across screens (UI Architecture §3.2). */
export const UI_TEXT = {
  appName: "DormMate",
  appTagline: "Administrimi i konvikteve studentore",
  save: "Ruaj",
  cancel: "Anulo",
  back: "Kthehu",
  submit: "Dërgo",
  search: "Kërko...",
  loading: "Duke u ngarkuar...",
  noResults: "Nuk u gjet asnjë rezultat.",
  allStatuses: "Të gjitha statuset",
  allCategories: "Të gjitha kategoritë",
  allPriorities: "Të gjitha prioritetet",
} as const;

/** Rendered request identifiers, e.g. "MR-00042" / "AR-00007". */
export function formatRequestCode(
  type: "MAINTENANCE" | "ADMINISTRATIVE",
  requestNumber: number,
): string {
  const prefix = type === "MAINTENANCE" ? "MR" : "AR";
  return `${prefix}-${String(requestNumber).padStart(5, "0")}`;
}

export const PAGE_SIZE = 10;
