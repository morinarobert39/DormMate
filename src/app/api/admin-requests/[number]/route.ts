import type { NextRequest } from "next/server";

import { respondSchema, updateStatusSchema } from "@/lib/validation/request";
import { handleApiError, jsonError, jsonOk } from "@/server/api-helpers";
import { requireAdmin, requireUser } from "@/server/guards";
import {
  getAdministrativeByNumber,
  respondToAdministrative,
  updateAdministrativeStatus,
} from "@/server/services/administrative.service";

/**
 * GET   /api/admin-requests/{id} — detail.
 * PATCH /api/admin-requests/{id} — update status and/or write the official response (§10.3).
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

    const request = await getAdministrativeByNumber(user, parsed);
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

    const body = await request.json();

    // Either field may be sent on its own, so both are optional and applied independently.
    if (typeof body.adminResponse === "string") {
      const { adminResponse } = respondSchema.parse(body);
      await respondToAdministrative(admin, parsed, adminResponse);
    }

    if (typeof body.status === "string") {
      const { status, note } = updateStatusSchema.parse(body);
      await updateAdministrativeStatus(admin, parsed, status, note);
    }

    const updated = await getAdministrativeByNumber(admin, parsed);
    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
