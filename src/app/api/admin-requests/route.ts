import type { NextRequest } from "next/server";

import { createAdministrativeSchema, requestFilterSchema } from "@/lib/validation/request";
import { handleApiError, jsonOk, searchParamsToFilters } from "@/server/api-helpers";
import { requireStudent, requireUser } from "@/server/guards";
import {
  createAdministrative,
  listAdministrative,
} from "@/server/services/administrative.service";

/**
 * GET  /api/admin-requests — Technical Design §10, "Lista e kërkesave administrative".
 * POST /api/admin-requests — create one (Student).
 */

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const filters = requestFilterSchema.parse(searchParamsToFilters(request.url));
    const result = await listAdministrative(user, filters);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const student = await requireStudent();
    const input = createAdministrativeSchema.parse(await request.json());
    const created = await createAdministrative(student, input);
    return jsonOk(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
