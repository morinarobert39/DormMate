import { QrCode, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { Role } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/server/guards";
import { resolveQrToken } from "@/server/services/maintenance.service";

export const metadata = { title: "Kod QR — DormMate" };

/**
 * Where a scanned sticker lands.
 *
 * This is the shortest path in the product: a student points a phone at a door and arrives at a
 * report form with the location already filled in — no office visit, no describing which room
 * they mean. Business Analysis §5 makes it the centrepiece of the proposed process.
 *
 * The route resolves the token and forwards; it never renders the form itself, so there is exactly
 * one report screen to maintain.
 */
export default async function QrLandingPage({ params }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const user = await getCurrentUser();

  // EF-05 — send an unauthenticated scanner to log in, then straight back here.
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/r/${token}`)}`);
  }

  // An administrator scanning a sticker is checking the sticker, not filing a report.
  if (user.role === Role.ADMIN) {
    redirect(`/admin/qr-codes?token=${encodeURIComponent(token)}`);
  }

  let error: string | null = null;
  try {
    await resolveQrToken(token, user);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kodi QR është i pavlefshëm.";
  }

  if (!error) {
    redirect(`/maintenance/new?token=${encodeURIComponent(token)}`);
  }

  // EF-01 / EF-02 — a dead-end with a clear explanation and a way forward.
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink-50 p-4">
      <Card className="w-full max-w-md">
        <CardBody className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>

          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-urgent-bg">
            <TriangleAlert className="size-6 text-urgent-fg" />
          </div>

          <h1 className="text-lg font-semibold text-ink-900">Kodi QR nuk mund të përdoret</h1>
          <p className="mt-2 text-sm text-ink-600">{error}</p>

          <div className="mt-5 flex flex-col gap-2">
            <ButtonLink href="/maintenance/new">
              <QrCode className="size-4" />
              Raporto manualisht
            </ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Kthehu në panel
            </ButtonLink>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
