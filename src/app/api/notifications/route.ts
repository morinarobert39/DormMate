import { handleApiError, jsonOk } from "@/server/api-helpers";
import { requireUser } from "@/server/guards";
import { getUnreadCount, listNotifications } from "@/server/services/notification.service";

/**
 * GET /api/notifications — Technical Design §10, "Marrja e njoftimeve automatike".
 * Always scoped to the caller: the service filters by their own id, so no user can read another's.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const [items, unread] = await Promise.all([
      listNotifications(user.id),
      getUnreadCount(user.id),
    ]);
    return jsonOk({ items, unread });
  } catch (error) {
    return handleApiError(error);
  }
}
