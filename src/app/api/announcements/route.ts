import type { NextRequest } from "next/server";
import { z } from "zod";

import { AnnouncementScope, Role } from "@/generated/prisma/enums";
import { handleApiError, jsonOk } from "@/server/api-helpers";
import { requireAdmin, requireUser } from "@/server/guards";
import {
  createAnnouncement,
  listAnnouncementsForAdmin,
} from "@/server/services/announcement.service";
import { listAnnouncementsForStudent } from "@/server/services/dashboard.service";

/**
 * GET  /api/announcements — Technical Design §10, "Marrja e njoftimeve" (Student, Administrator).
 * POST /api/announcements — "Publikimi i njoftimeve" (Administrator only, BR-10).
 */

const createSchema = z.object({
  title: z.string().trim().min(5).max(150),
  body: z.string().trim().min(10).max(5000),
  scope: z.enum(AnnouncementScope).default(AnnouncementScope.DORMITORY),
  dormitoryIds: z.array(z.string()).default([]),
});

export async function GET() {
  try {
    const user = await requireUser();

    const announcements =
      user.role === Role.ADMIN && user.dormitoryId
        ? await listAnnouncementsForAdmin({ ...user, dormitoryId: user.dormitoryId })
        : await listAnnouncementsForStudent(user);

    return jsonOk(announcements);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const input = createSchema.parse(await request.json());
    const created = await createAnnouncement(admin, input);
    return jsonOk(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
