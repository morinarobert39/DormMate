import { handleApiError, jsonOk } from "@/server/api-helpers";
import { requireAdmin } from "@/server/guards";
import { getStatistics } from "@/server/services/statistics.service";

/**
 * GET /api/statistics — administrator only.
 * Exposes the resolution-time figures the thesis evaluation chapter draws on.
 */
export async function GET() {
  try {
    const admin = await requireAdmin();
    return jsonOk(await getStatistics(admin));
  } catch (error) {
    return handleApiError(error);
  }
}
