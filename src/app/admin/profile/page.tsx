import { PageHeader } from "@/components/layout/page-header";
import { ProfileView } from "@/components/profile/profile-view";
import { ROLE_LABELS } from "@/lib/constants";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";

export const metadata = { title: "Profili — DormMate" };

export default async function AdminProfilePage() {
  const admin = await requireAdmin();

  const dormitory = await prisma.dormitory.findUnique({
    where: { id: admin.dormitoryId },
    select: { name: true },
  });

  return (
    <>
      <PageHeader
        title="Profili"
        description="Të dhënat tuaja personale dhe siguria e llogarisë."
      />
      <ProfileView
        profile={{
          firstName: admin.firstName,
          lastName: admin.lastName,
          personalNumber: admin.personalNumber,
          email: admin.email,
          phone: admin.phone,
          roleLabel: ROLE_LABELS[admin.role],
          dormitoryName: dormitory?.name ?? null,
          room: null,
        }}
      />
    </>
  );
}
