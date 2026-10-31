import type { NextRequest } from "next/server";
import { z } from "zod";

import { handleApiError, jsonOk } from "@/server/api-helpers";
import { requireAdmin } from "@/server/guards";
import { generateQrForLocation, listQrCodes, qrTargetUrl } from "@/server/services/qr.service";

/**
 * GET  /api/qr-codes — the code register for this administrator's dormitory.
 * POST /api/qr-codes — generate a code and assign it to a location, in one call.
 *
 * Administrator-only, matching the rule that generating and assigning codes is an administrative
 * responsibility.
 */

const createSchema = z.object({
  locationId: z.string().min(1, "Zgjidhni një lokacion."),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    const codes = await listQrCodes(admin);
    return jsonOk(
      codes.map((c) => ({ ...c, url: qrTargetUrl(c.token) })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { locationId } = createSchema.parse(await request.json());
    const created = await generateQrForLocation(admin, locationId);
    return jsonOk({ ...created, url: qrTargetUrl(created.token) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
