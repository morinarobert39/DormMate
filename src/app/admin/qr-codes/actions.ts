"use server";

import { revalidatePath } from "next/cache";

import { AuthorizationError, requireAdmin } from "@/server/guards";
import {
  generateMissingQrCodes,
  generateQrForLocation,
  regenerateQrCode,
  setQrActive,
} from "@/server/services/qr.service";

export type QrFormState = { error?: string; success?: string };

/** Generate a code and assign it to the chosen location — one explicit administrator action. */
export async function assignQrToLocation(
  _prev: QrFormState,
  formData: FormData,
): Promise<QrFormState> {
  try {
    const admin = await requireAdmin();
    const locationId = String(formData.get("locationId") ?? "");
    if (!locationId) return { error: "Zgjidhni një lokacion." };

    await generateQrForLocation(admin, locationId);
    revalidatePath("/admin/qr-codes");
    return { success: "Kodi QR u gjenerua dhe u lidh me lokacionin." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Kodi QR nuk mund të gjenerohej." };
  }
}

export async function generateAllMissing(
  _prev: QrFormState,
  _formData: FormData,
): Promise<QrFormState> {
  try {
    const admin = await requireAdmin();
    const count = await generateMissingQrCodes(admin);
    revalidatePath("/admin/qr-codes");
    return {
      success:
        count === 0
          ? "Të gjitha lokacionet tashmë kanë kod QR."
          : `U gjeneruan ${count} kode QR të reja.`,
    };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Kodet QR nuk mund të gjenerohshin." };
  }
}

/** Invalidate the sticker currently on the door and issue a replacement token. */
export async function regenerateToken(
  _prev: QrFormState,
  formData: FormData,
): Promise<QrFormState> {
  try {
    const admin = await requireAdmin();
    const qrCodeId = String(formData.get("qrCodeId") ?? "");
    if (!qrCodeId) return { error: "Kodi QR nuk u gjet." };

    await regenerateQrCode(admin, qrCodeId);
    revalidatePath("/admin/qr-codes");
    return { success: "Kodi u rigjenerua. Ngjitësi i vjetër nuk funksionon më." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Kodi nuk mund të rigjenerohej." };
  }
}

export async function toggleQrActive(
  _prev: QrFormState,
  formData: FormData,
): Promise<QrFormState> {
  try {
    const admin = await requireAdmin();
    const qrCodeId = String(formData.get("qrCodeId") ?? "");
    const isActive = formData.get("isActive") === "true";

    await setQrActive(admin, qrCodeId, isActive);
    revalidatePath("/admin/qr-codes");
    return { success: isActive ? "Kodi u aktivizua." : "Kodi u çaktivizua." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Veprimi dështoi." };
  }
}
