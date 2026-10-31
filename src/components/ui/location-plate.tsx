import { DoorClosed, LogIn, MoveHorizontal, ShowerHead, Toilet } from "lucide-react";

import type { LocationType } from "@/generated/prisma/enums";
import { LOCATION_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * The location plate — DormMate's signature element.
 *
 * Every request in this system is anchored to a physical place; that is what separates it from a
 * generic helpdesk. So a location is never plain text. It renders as a small plate modelled on the
 * enamel number plates screwed to dorm doors, set in mono because a room number is a real-world
 * identifier rather than prose.
 *
 * The same component is used on the printable QR sticker, so the plate on the physical door and the
 * plate on screen are recognisably the same object.
 */

const LOCATION_ICONS: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  ROOM: DoorClosed,
  ENTRANCE: LogIn,
  HALLWAY: MoveHorizontal,
  BATHROOM: Toilet,
  SHOWER: ShowerHead,
};

export type PlateLocation = {
  type: LocationType;
  label: string;
  floor: number | null;
  dormitory?: { name: string; code: string } | null;
};

export function LocationPlate({
  location,
  size = "sm",
  showDormitory = true,
  className,
}: {
  location: PlateLocation;
  size?: "sm" | "lg";
  showDormitory?: boolean;
  className?: string;
}) {
  const Icon = LOCATION_ICONS[location.type];

  // A room is identified by its number; a shared space by what it is.
  const primary = location.type === "ROOM" ? location.label : LOCATION_TYPE_LABELS[location.type];
  const secondary = location.type === "ROOM" ? LOCATION_TYPE_LABELS[location.type] : location.label;

  const context = [
    showDormitory && location.dormitory ? location.dormitory.code : null,
    location.floor !== null && location.floor !== undefined ? `Kati ${location.floor}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-plate border border-ink-300 bg-white",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(16,26,43,0.06)]",
        size === "sm" ? "px-2 py-1" : "px-3 py-2",
        className,
      )}
      title={`${primary} — ${secondary}${context ? ` (${context})` : ""}`}
    >
      <Icon className={cn("shrink-0 text-ink-400", size === "sm" ? "size-3.5" : "size-5")} />
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            "font-mono font-semibold tracking-tight text-ink-900",
            size === "sm" ? "text-xs" : "text-base",
          )}
        >
          {primary}
        </span>
        {context ? (
          <span
            className={cn(
              "font-mono text-ink-500 uppercase",
              size === "sm" ? "text-[10px]" : "text-xs",
            )}
          >
            {context}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/** Just the icon + type name, for filter menus and dropdown options. */
export function LocationTypeLabel({ type }: { type: LocationType }) {
  const Icon = LOCATION_ICONS[type];
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="size-4 text-ink-400" />
      {LOCATION_TYPE_LABELS[type]}
    </span>
  );
}
