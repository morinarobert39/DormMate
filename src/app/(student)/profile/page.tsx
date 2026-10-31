import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ProfileView } from "@/components/profile/profile-view";
import { ROLE_LABELS } from "@/lib/constants";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/guards";

export const metadata = { title: "Profili — DormMate" };

export default async function StudentProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [dormitory, room] = await Promise.all([
    user.dormitoryId
      ? prisma.dormitory.findUnique({ where: { id: user.dormitoryId }, select: { name: true } })
      : null,
    user.roomId
      ? prisma.location.findUnique({
          where: { id: user.roomId },
          select: { label: true, type: true, floor: true },
        })
      : null,
  ]);

  return (
    <>
      <PageHeader title="Profili" description="Të dhënat tuaja personale dhe siguria e llogarisë." />
      <ProfileView
        profile={{
          firstName: user.firstName,
          lastName: user.lastName,
          personalNumber: user.personalNumber,
          email: user.email,
          phone: user.phone,
          roleLabel: ROLE_LABELS[user.role],
          dormitoryName: dormitory?.name ?? null,
          room,
        }}
      />
    </>
  );
}
