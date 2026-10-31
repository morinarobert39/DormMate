import { Role } from "@/generated/prisma/enums";
import { handleApiError, jsonOk } from "@/server/api-helpers";
import { requireUser } from "@/server/guards";
import { getAdminDashboard, getStudentDashboard } from "@/server/services/dashboard.service";

/**
 * GET /api/dashboard — Technical Design §10.6.
 * Returns the statistics block appropriate to the caller's role.
 */
export async function GET() {
  try {
    const user = await requireUser();

    if (user.role === Role.ADMIN && user.dormitoryId) {
      const data = await getAdminDashboard({ ...user, dormitoryId: user.dormitoryId });
      return jsonOk({ role: Role.ADMIN, ...data });
    }

    const data = await getStudentDashboard(user);
    return jsonOk({ role: Role.STUDENT, ...data });
  } catch (error) {
    return handleApiError(error);
  }
}
