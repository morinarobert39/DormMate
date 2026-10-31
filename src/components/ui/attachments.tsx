"use client";

import { Download, FileText, Image as ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/field";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import {
  deleteAdministrativeAttachment,
  uploadAdministrativeAttachment,
  type StatusFormState,
} from "@/app/admin/administrative/actions";

export type Attachment = {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: Date;
  uploadedBy: { id: string; firstName: string; lastName: string; role: Role };
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Documents on an administrative request.
 *
 * Rendered for both roles on the same request; `currentUserId` decides who may withdraw a file,
 * matching the service rule that only the uploader can delete their own.
 */
export function Attachments({
  requestNumber,
  attachments,
  currentUserId,
  canUpload,
}: {
  requestNumber: number;
  attachments: Attachment[];
  currentUserId: string;
  canUpload: boolean;
}) {
  const [uploadState, uploadAction, uploading] = useActionState<StatusFormState, FormData>(
    uploadAdministrativeAttachment,
    {},
  );
  const [deleteState, deleteAction] = useActionState<StatusFormState, FormData>(
    deleteAdministrativeAttachment,
    {},
  );

  return (
    <div className="space-y-3 p-4">
      {attachments.length === 0 ? (
        <p className="text-sm text-ink-500">Nuk ka skedarë të bashkëngjitur.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => {
            const isImage = a.contentType.startsWith("image/");
            const Icon = isImage ? ImageIcon : FileText;
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 rounded-card border border-ink-200 bg-white p-3"
              >
                <Icon className="size-5 shrink-0 text-ink-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{a.filename}</p>
                  <p className="text-xs text-ink-500">
                    {formatBytes(a.size)} · {a.uploadedBy.firstName} {a.uploadedBy.lastName} (
                    {ROLE_LABELS[a.uploadedBy.role]}) · {formatDateTime(a.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={a.filename}
                    className="inline-flex size-8 items-center justify-center rounded-card text-ink-500 transition-colors hover:bg-ink-100 hover:text-brand-600"
                    aria-label={`Shkarko ${a.filename}`}
                    title="Shkarko"
                  >
                    <Download className="size-4" />
                  </a>
                  {a.uploadedBy.id === currentUserId ? (
                    <form action={deleteAction}>
                      <input type="hidden" name="attachmentId" value={a.id} />
                      <button
                        type="submit"
                        aria-label={`Fshij ${a.filename}`}
                        title="Fshij"
                        className="inline-flex size-8 items-center justify-center rounded-card text-ink-500 transition-colors hover:bg-urgent-bg hover:text-urgent-fg"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FormError message={deleteState.error} />

      {canUpload ? (
        <form action={uploadAction} className="space-y-2 border-t border-ink-100 pt-3">
          <input type="hidden" name="number" value={requestNumber} />
          <label
            htmlFor={`file-${requestNumber}`}
            className="flex items-center gap-2 text-sm font-medium text-ink-800"
          >
            <Paperclip className="size-4" />
            Bashkëngjit skedar
          </label>
          <input
            id={`file-${requestNumber}`}
            name="file"
            type="file"
            accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-card file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200"
          />
          <p className="text-xs text-ink-500">PDF, DOC, DOCX ose fotografi. Maksimum 8 MB.</p>

          <FormError message={uploadState.error} />
          <FormSuccess message={uploadState.success} />

          <Button type="submit" size="sm" disabled={uploading}>
            <Upload className="size-4" />
            {uploading ? "Duke ngarkuar..." : "Ngarko"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
