import { z } from "zod";

import { Priority, RequestStatus } from "@/generated/prisma/enums";

/**
 * Every write to a request passes through one of these schemas before it reaches a service.
 * Technical Design §13 lists input validation as a required security control.
 */

/**
 * Where a maintenance problem is. The two variants encode the room-lock rule:
 * `own-room` carries no location id at all — the server resolves it from the signed-in student's
 * assigned room, so a room can never be chosen by the client. `shared` carries an id, which the
 * service then verifies is a non-ROOM location inside the student's own dormitory.
 */
export const maintenanceTargetSchema = z.discriminatedUnion("target", [
  z.object({ target: z.literal("own-room") }),
  z.object({
    target: z.literal("shared"),
    locationId: z.string().min(1, "Zgjidhni një lokacion."),
  }),
  z.object({
    target: z.literal("qr"),
    token: z.string().min(1, "Kodi QR është i pavlefshëm."),
  }),
]);

export const createMaintenanceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Titulli duhet të ketë së paku 5 karaktere.")
    .max(120, "Titulli është shumë i gjatë."),
  description: z
    .string()
    .trim()
    .min(10, "Përshkrimi duhet të ketë së paku 10 karaktere.")
    .max(2000, "Përshkrimi është shumë i gjatë."),
  categoryId: z.string().min(1, "Zgjidhni një kategori."),
  priority: z.enum(Priority),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;

export const createAdministrativeSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(5, "Subjekti duhet të ketë së paku 5 karaktere.")
    .max(120, "Subjekti është shumë i gjatë."),
  description: z
    .string()
    .trim()
    .min(10, "Përshkrimi duhet të ketë së paku 10 karaktere.")
    .max(2000, "Përshkrimi është shumë i gjatë."),
  categoryId: z.string().min(1, "Zgjidhni një kategori."),
});

export type CreateAdministrativeInput = z.infer<typeof createAdministrativeSchema>;

/** BR-06 — the status may only ever be one of the three values in the enum. */
export const updateStatusSchema = z.object({
  status: z.enum(RequestStatus),
  note: z.string().trim().max(500, "Shënimi është shumë i gjatë.").optional(),
});

export const respondSchema = z.object({
  adminResponse: z
    .string()
    .trim()
    .min(1, "Përgjigjja nuk mund të jetë e zbrazët.")
    .max(2000, "Përgjigjja është shumë e gjatë."),
});

/** Query-string filters shared by the list screens. */
export const requestFilterSchema = z.object({
  status: z.enum(RequestStatus).optional(),
  categoryId: z.string().optional(),
  priority: z.enum(Priority).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type RequestFilterInput = z.infer<typeof requestFilterSchema>;
