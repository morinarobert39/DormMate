import type { NextRequest } from "next/server";

import { updateStatusSchema } from "@/lib/validation/request";
import { handleApiError, jsonError, jsonOk } from "@/server/api-helpers";
import { requireAdmin, requireUser } from "@/server/guards";
import {
  getMaintenanceByNumber,
  updateMaintenanceStatus,
} from "@/server/services/maintenance.service";

/**
 * GET   /api/maintenance/{id} — request detail.
 * PATCH /api/maintenance/{id} — Technical Design §10, "Përditësimi i statusit" (Administrator).
 *
 * EF-04 lives in `requireAdmin`: a student calling PATCH directly is rejected before any read.
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  try {
    const user = await requireUser();
    const { number } = await params;
    const parsed = Number(number);
    if (!Number.isInteger(parsed)) return jsonError("Numri i kërkesës nuk është i vlefshëm.", 400);

    const request = await getMaintenanceByNumber(user, parsed);
    if (!request) return jsonError("Kërkesa nuk u gjet.", 404);

    return jsonOk(request);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { number } = await params;
    const parsed = Number(number);
    if (!Number.isInteger(parsed)) return jsonError("Numri i kërkesës nuk është i vlefshëm.", 400);

    const body = updateStatusSchema.parse(await request.json());
    const updated = await updateMaintenanceStatus(admin, parsed, body.status, body.note);

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
