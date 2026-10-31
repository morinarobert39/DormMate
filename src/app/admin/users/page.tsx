import { KeyRound, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, EmptyState, StatCard } from "@/components/ui/card";
import { formatRelativeTime, fullName } from "@/lib/utils";
import { requireAdmin } from "@/server/guards";
import { listPendingResets, listRooms, listStudents } from "@/server/services/user.service";

import { CreateStudentForm, StudentTable } from "./user-manager";

export const metadata = { title: "Përdoruesit — DormMate" };

/**
 * User management. There is no public sign-up (Screen Inventory §6 has no Register screen), so
 * this is where student accounts come from and where a forgotten password gets reset.
 */
export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const [students, rooms, pendingResets] = await Promise.all([
    listStudents(admin),
    listRooms(admin),
    listPendingResets(admin),
  ]);

  const active = students.filter((s) => s.isActive).length;
  const withoutRoom = students.filter((s) => !s.room).length;

  return (
    <>
      <PageHeader
        title="Përdoruesit"
        description="Krijoni llogari studentësh, caktoni dhomat dhe rivendosni fjalëkalimet."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Studentë" value={students.length} icon={<Users className="size-4" />} />
        <StatCard label="Aktivë" value={active} accent="resolved" />
        <StatCard
          label="Pa dhomë"
          value={withoutRoom}
          accent={withoutRoom > 0 ? "pending" : "neutral"}
        />
        <StatCard
          label="Kërkesa për fjalëkalim"
          value={pendingResets.length}
          accent={pendingResets.length > 0 ? "urgent" : "neutral"}
          icon={<KeyRound className="size-4" />}
        />
      </div>

      {pendingResets.length > 0 ? (
        <Card className="mt-4 border-pending-edge/40">
          <CardHeader title="Kërkesa për rivendosje fjalëkalimi" />
          <CardBody>
            <ul className="space-y-2">
              {pendingResets.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-ink-900">{fullName(r.user)}</span>
                  <span className="font-mono text-xs text-ink-500">{r.user.personalNumber}</span>
                  <span className="text-xs text-ink-400">
                    {formatRelativeTime(r.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-500">
              Rivendosni fjalëkalimin nga tabela më poshtë duke klikuar ikonën e çelësit.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Krijo llogari studenti" />
          <CreateStudentForm rooms={rooms} />
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title={`Studentët (${students.length})`} />
          {students.length === 0 ? (
            <EmptyState
              icon={<Users className="size-8" />}
              title="Asnjë student"
              description="Krijoni llogarinë e parë të studentit për këtë konvikt."
            />
          ) : (
            <StudentTable students={students} rooms={rooms} />
          )}
        </Card>
      </div>
    </>
  );
}
