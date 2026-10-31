import type { NextRequest } from "next/server";

import { createMaintenanceSchema, maintenanceTargetSchema, requestFilterSchema } from "@/lib/validation/request";
import { handleApiError, jsonOk, searchParamsToFilters } from "@/server/api-helpers";
import { requireStudent, requireUser } from "@/server/guards";
import { createMaintenance, listMaintenance } from "@/server/services/maintenance.service";

/**
 * GET  /api/maintenance — Technical Design §10, "Lista e kërkesave" (Student, Administrator).
 * POST /api/maintenance — "Krijimi i kërkesës" (Student).
 *
 * Scoping is the service's job: a student receives only their own requests (BR-07), an
 * administrator only their dormitory's (BR-08).
 */

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const filters = requestFilterSchema.parse(searchParamsToFilters(request.url));
    const result = await listMaintenance(user, filters);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const student = await requireStudent();
    const body = await request.json();

    const input = createMaintenanceSchema.parse(body);
    // The room-lock rule applies identically here: `own-room` carries no id, and the service
    // resolves the location from the session rather than from this payload.
    const target = maintenanceTargetSchema.parse(body.location ?? { target: "own-room" });

    const created = await createMaintenance(student, input, target);
    return jsonOk(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
