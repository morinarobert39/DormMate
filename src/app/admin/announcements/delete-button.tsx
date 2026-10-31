"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import { deleteAnnouncementAction, type AnnouncementFormState } from "./actions";

/**
 * Deleting an announcement is irreversible, so it asks first. The confirmation is inline rather
 * than a modal — one fewer moving part, and it keeps the row context visible while deciding.
 */
export function DeleteAnnouncementButton({ id, title }: { id: string; title: string }) {
  const [state, formAction, pending] = useActionState<AnnouncementFormState, FormData>(
    deleteAnnouncementAction,
    {},
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 rounded-card px-2 py-1 text-xs font-medium text-ink-600 hover:bg-urgent-bg hover:text-urgent-fg"
      >
        <Trash2 className="size-3.5" />
        Fshi
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <span className="text-xs text-ink-600">Fshi “{title.slice(0, 24)}…”?</span>
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        {pending ? "..." : "Po, fshi"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Jo
      </Button>
      {state.error ? <span className="text-xs text-urgent-fg">{state.error}</span> : null}
    </form>
  );
}
