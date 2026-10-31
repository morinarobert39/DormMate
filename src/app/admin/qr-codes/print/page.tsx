import { ArrowLeft, QrCode } from "lucide-react";
import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { LOCATION_TYPE_LABELS } from "@/lib/constants";
import { requireAdmin } from "@/server/guards";
import { getPrintableStickers } from "@/server/services/qr.service";

import { PrintButton } from "./print-button";

export const metadata = { title: "Fleta e kodeve QR — DormMate" };

/**
 * The printable sticker sheet.
 *
 * This is a physical deliverable, not a screen: the administrator prints it on A4, cuts along the
 * dashed borders, and sticks each label on its door, corridor, toilet or shower. The print rules
 * live in globals.css (@page A4, 3-column grid, no page breaks inside a sticker).
 *
 * Each sticker carries the location plate as well as the code, so a sticker that has come loose
 * can be matched back to its door by reading it.
 */
export default async function QrPrintSheetPage() {
  const admin = await requireAdmin();
  const stickers = await getPrintableStickers(admin);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-print mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Fleta e kodeve QR</h1>
          <p className="mt-1 text-sm text-ink-500">
            {stickers.length} ngjitëse gati për printim. Printoni në A4, prisni sipas vijave me
            pika dhe ngjitni secilën në lokacionin përkatës.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href="/admin/qr-codes" variant="secondary">
            <ArrowLeft className="size-4" />
            Kthehu
          </ButtonLink>
          <PrintButton />
        </div>
      </div>

      {stickers.length === 0 ? (
        <EmptyState
          icon={<QrCode className="size-8" />}
          title="Asnjë kod aktiv për printim"
          description="Gjeneroni së pari kodet QR për lokacionet e konviktit."
          action={
            <ButtonLink href="/admin/qr-codes" size="sm">
              Gjenero kode
            </ButtonLink>
          }
        />
      ) : (
        <div className="print-sheet grid grid-cols-2 gap-4 sm:grid-cols-3">
          {stickers.map((s) => (
            <article
              key={s.id}
              className="print-sticker flex flex-col items-center rounded-card border border-ink-200 bg-white p-3 text-center"
            >
              <p className="text-[10px] font-semibold tracking-widest text-ink-400 uppercase">
                DormMate
              </p>

              <Image
                src={s.dataUrl}
                alt={`Kod QR për ${s.location.label}`}
                width={160}
                height={160}
                className="my-2 size-40 max-w-full"
                unoptimized
              />

              <p className="font-mono text-base leading-tight font-semibold text-ink-900">
                {s.location.type === "ROOM"
                  ? s.location.label
                  : LOCATION_TYPE_LABELS[s.location.type]}
              </p>
              <p className="font-mono text-[11px] text-ink-500 uppercase">
                {s.location.type === "ROOM"
                  ? LOCATION_TYPE_LABELS[s.location.type]
                  : s.location.label}
                {s.location.floor !== null ? ` · Kati ${s.location.floor}` : ""}
              </p>
              <p className="mt-1 font-mono text-[10px] text-ink-400">{s.dormitory?.code}</p>

              <p className="mt-2 border-t border-ink-100 pt-2 text-[10px] leading-snug text-ink-500">
                Skanoni për të raportuar një problem
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
