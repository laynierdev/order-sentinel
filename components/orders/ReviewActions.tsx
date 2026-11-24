"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, History, Loader2, PauseCircle, ShieldAlert } from "lucide-react";
import { StatusBadge } from "@/components/orders/RiskBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordDecision } from "@/lib/actions/review";
import type { AuditEntry } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { MAX_NOTE_LENGTH, STATUS_LABEL, type Decision } from "@/lib/review";
import type { ReviewStatus } from "@/lib/types";

const ACTIONS: { status: Decision; label: string; icon: typeof CheckCircle2; variant: "default" | "outline" | "destructive" }[] = [
  { status: "approved", label: "Approve", icon: CheckCircle2, variant: "default" },
  { status: "held", label: "Hold", icon: PauseCircle, variant: "outline" },
  { status: "escalated", label: "Escalate", icon: ShieldAlert, variant: "destructive" },
];

const TOAST: Record<Decision, string> = {
  approved: "Order approved for shipment",
  held: "Order placed on hold",
  escalated: "Order escalated to the compliance officer",
};

/** Calls the server action and reports the outcome; resolves to true on success. */
async function submitDecision(orderId: string, status: Decision, note: string): Promise<boolean> {
  try {
    const result = await recordDecision(orderId, status, note);
    if (!result.ok) {
      toast.error("Decision not saved", { description: result.error });
      return false;
    }
    toast.success(TOAST[status], { description: `${orderId} · ${STATUS_LABEL[status]} · saved to audit trail` });
    return true;
  } catch {
    toast.error("Decision not saved", { description: "The server could not be reached. Please try again." });
    return false;
  }
}

interface ReviewActionsProps {
  orderId: string;
  /** Status under the current rules (latest decision, pending if flagged, null if clear). */
  status: ReviewStatus | null;
  /** Audit trail, oldest first. */
  audit: AuditEntry[];
}

/** Order detail: decision panel with mandatory note and the audit trail. */
export function ReviewActions({ orderId, status, audit }: ReviewActionsProps) {
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<Decision | null>(null);
  const noteMissing = note.trim().length === 0;

  function onAction(next: Decision) {
    setTouched(true);
    if (noteMissing || pending) return;
    setActive(next);
    startTransition(async () => {
      if (await submitDecision(orderId, next, note)) {
        setNote("");
        setTouched(false);
      }
      setActive(null);
    });
  }

  const history = [...audit].reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Current status</span>
        <StatusBadge status={status} />
      </div>
      {status === null ? (
        <p className="rounded-md bg-slate-50 p-2.5 text-xs text-muted-foreground">
          This order was not flagged by the rules engine. A manual decision is optional.
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="review-note">
          Reviewer note <span className="text-red-600">*</span>
        </Label>
        <Textarea
          id="review-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Document the reason for your decision (required)…"
          rows={4}
          maxLength={MAX_NOTE_LENGTH}
          aria-invalid={touched && noteMissing}
          disabled={pending}
        />
        {touched && noteMissing ? <p className="text-xs text-red-600">A note is required to record a decision.</p> : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ACTIONS.map(({ status: s, label, icon: Icon, variant }) => (
          <Button key={s} variant={variant} onClick={() => onAction(s)} disabled={pending}>
            {pending && active === s ? <Loader2 className="animate-spin" /> : <Icon />} {label}
          </Button>
        ))}
      </div>

      <div className="border-t pt-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <History className="size-3.5" /> Audit trail
        </p>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {history.map((h) => (
              <li key={h.id} className="border-l-2 border-slate-200 pl-3 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  {h.fromStatus ? (
                    <>
                      <StatusBadge status={h.fromStatus} />
                      <ArrowRight className="size-3 text-muted-foreground" aria-label="changed to" />
                    </>
                  ) : null}
                  <StatusBadge status={h.toStatus} />
                </div>
                <p className="mt-1 break-words text-slate-700">{h.note}</p>
                <p className="text-xs text-muted-foreground">
                  {h.reviewer} · {formatDateTime(h.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

interface QuickDecisionDialogProps {
  orderId: string | null;
  action: Decision | null;
  onClose: () => void;
}

/** Review queue: quick decision from a row, still requiring a note. */
export function QuickDecisionDialog({ orderId, action, onClose }: QuickDecisionDialogProps) {
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, startTransition] = useTransition();
  const open = orderId !== null && action !== null;
  // Keep showing the last target while the dialog animates closed.
  const [shown, setShown] = useState({ orderId, action });
  if (open && (shown.orderId !== orderId || shown.action !== action)) setShown({ orderId, action });
  const meta = ACTIONS.find((a) => a.status === shown.action);

  function close() {
    if (pending) return;
    setNote("");
    setTouched(false);
    onClose();
  }

  function confirm() {
    setTouched(true);
    if (!orderId || !action || note.trim().length === 0 || pending) return;
    startTransition(async () => {
      if (await submitDecision(orderId, action, note)) {
        setNote("");
        setTouched(false);
        onClose();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {meta?.label} {shown.orderId}
          </DialogTitle>
          <DialogDescription>Record the reason for this decision. It will be added to the order&apos;s audit trail.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="quick-note">
            Reviewer note <span className="text-red-600">*</span>
          </Label>
          <Textarea
            id="quick-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={MAX_NOTE_LENGTH}
            autoFocus
            disabled={pending}
            aria-invalid={touched && note.trim().length === 0}
          />
          {touched && note.trim().length === 0 ? <p className="text-xs text-red-600">A note is required.</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button variant={meta?.variant ?? "default"} onClick={confirm} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : meta ? <meta.icon /> : null} Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
