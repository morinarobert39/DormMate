"use client";

import { ArrowRight, Check } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Textarea } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { RequestStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { changeMaintenanceStatus, type StatusFormState } from "./actions";

/**
 * The administrator's status control.
 *
 * BR-06 allows exactly three statuses, so this is three buttons rather than a dropdown — the
 * whole state machine is visible at once, and the current state is not offered as a choice.
 * An optional note is recorded on the transition and shown to the student in the timeline.
 */
export function StatusControl({
  requestNumber,
  currentStatus,
  action = changeMaintenanceStatus,
}: {
  requestNumber: number;
  currentStatus: RequestStatus;
  action?: (prev: StatusFormState, formData: FormData) => Promise<StatusFormState>;
}) {
  const [state, formAction, pending] = useActionState<StatusFormState, FormData>(action, {});
  const [selected, setSelected] = useState<RequestStatus | null>(null);

  const options = [
    RequestStatus.PENDING,
    RequestStatus.IN_PROGRESS,
    RequestStatus.RESOLVED,
  ].filter((s) => s !== currentStatus);

  return (
    <form action={formAction} className="space-y-3 p-4">
      <input type="hidden" name="number" value={requestNumber} />
      <input type="hidden" name="status" value={selected ?? ""} />

      <div className="flex items-center gap-2 text-sm">
        <span className="text-ink-500">Statusi aktual:</span>
        <StatusBadge status={currentStatus} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-ink-500 uppercase">Ndrysho në</p>
        <div className="flex flex-wrap gap-2">
          {options.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelected(status)}
              aria-pressed={selected === status}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-card border px-3 py-1.5 text-sm font-medium transition-colors",
                selected === status
                  ? "border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600"
                  : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50",
              )}
            >
              {selected === status ? (
                <Check className="size-3.5" />
              ) : (
                <ArrowRight className="size-3.5 text-ink-400" />
              )}
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <Field
          label="Shënim (opsional)"
          htmlFor="note"
          hint="Shënimi shfaqet te studenti në historikun e kërkesës."
        >
          <Textarea
            id="note"
            name="note"
            rows={3}
            maxLength={500}
            placeholder="p.sh. Problemi u zgjidh nga ekipi i mirëmbajtjes."
          />
        </Field>
      ) : null}

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <Button type="submit" disabled={!selected || pending}>
        {pending ? "Duke ruajtur..." : "Ruaj statusin"}
      </Button>
    </form>
  );
}
