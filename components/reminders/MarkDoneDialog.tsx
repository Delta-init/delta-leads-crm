"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { FollowupDetailsModal, type FollowupDetails } from "@/components/leads/FollowupDetailsModal";
import { LostReasonModal } from "@/components/leads/LostReasonModal";
import { CloseLeadDialog } from "@/components/students/CloseLeadDialog";
import { useLead, useUpdateLeadStatus } from "@/hooks/useLeads";
import { useUpdateReminder } from "@/hooks/useReminders";
import { listItemVariants } from "@/lib/animations";
import { LEAD_STATUSES, STATUS_META, type LeadStatus } from "@/lib/statusConfig";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/authStore";

/* ────────────────────────────────────────────────────────────────────────────
   Mark a reminder done — with a word on what happened (2026-10-20).

   Like "How did the call go?" (components/calls/CallFlow.tsx): a required
   "What happened?" note, saved on the reminder and as a note on the lead
   (the server adds that one), and optionally the lead's new status through
   the CRM's own dialogs (follow-up with its date and time, the enrolment for
   a close, the reason for lost; any other status straight away). Cancelling
   one of those comes back here; closing this marks nothing.
──────────────────────────────────────────────────────────────────────────── */

const NOTE_MIN = 2;
const KEEP = "__keep__";
// The statuses a reminder usually ends in, first.
const ORDER: LeadStatus[] = [
  ...(["followup", "closed", "lost"] as LeadStatus[]),
  ...LEAD_STATUSES.filter((s) => !["followup", "closed", "lost"].includes(s)),
];

type Stage = "ask" | "followup" | "lost" | "closed" | "saving";

export interface MarkDoneTarget {
  leadId: string;
  leadName?: string;
  reminderId: string;
  title?: string;
}

interface MarkDoneDialogProps {
  /** The reminder to mark done; null = closed. */
  target: MarkDoneTarget | null;
  onClose: () => void;
}

export function MarkDoneDialog({ target, onClose }: MarkDoneDialogProps) {
  if (!target) return null;
  // A new reminder starts over
  return <MarkDoneFlow key={`${target.leadId}-${target.reminderId}`} target={target} onClose={onClose} />;
}

function MarkDoneFlow({ target, onClose }: { target: MarkDoneTarget; onClose: () => void }) {
  const { data: lead } = useLead(target.leadId);
  const updateReminder = useUpdateReminder(target.leadId);
  const updateStatus = useUpdateLeadStatus();
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string>(KEEP);
  const [stage, setStage] = useState<Stage>("ask");

  const leadName = target.leadName || lead?.name || "the lead";
  const current = lead?.status as LeadStatus | undefined;
  const changing = status !== KEEP && status !== current;
  const noteOk = note.trim().length >= NOTE_MIN;
  const label = (s: string) => STATUS_META[s as LeadStatus]?.label ?? s;

  /** The reminder first (with its note); the status after, as the call dialog does. */
  async function markDone() {
    await updateReminder.mutateAsync({ reminderId: target.reminderId, data: { isDone: true, doneNote: note.trim() } });
  }

  /** Done, then the status (if any) — back to the dialog if either fails; the hooks say what went wrong. */
  async function finish(statusChange?: () => Promise<unknown>) {
    setStage("saving");
    try {
      await markDone();
      if (statusChange) await statusChange();
      onClose();
    } catch {
      setStage("ask");
    }
  }

  function save() {
    if (!noteOk) return;
    if (!changing) { void finish(); return; }
    if (status === "closed" && !lead) { toast.info("Loading the lead — try again in a moment"); return; }
    if (status === "followup") setStage("followup");
    else if (status === "lost") setStage("lost");
    else if (status === "closed") setStage("closed");
    else void finish(() => updateStatus.mutateAsync({ id: target.leadId, status: status as LeadStatus }));
  }

  const busy = stage === "saving";

  return (
    <>
      <ResponsiveDialog open={stage === "ask" || busy} onOpenChange={(o) => { if (!o && stage === "ask") onClose(); }}>
        <ResponsiveDialogContent desktopClassName="max-w-lg">
          <ResponsiveDialogHeader>
            <div className="flex items-center gap-3 px-4 sm:px-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <ResponsiveDialogTitle>Mark reminder done</ResponsiveDialogTitle>
            </div>
            <ResponsiveDialogDescription className="px-4 pt-1 sm:px-0">
              <span className="font-medium text-foreground">{target.title?.trim() || "Reminder"}</span>
              {" · "}{leadName}
              {current ? ` · now ${label(current)}` : ""}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <motion.div variants={listItemVariants} initial="hidden" animate="visible" className="space-y-4 px-4 py-2 sm:px-0">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                What happened? <span className="text-red-500">*</span>
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={1900}
                autoFocus
                placeholder="e.g. Called back, wants the weekend batch — sending the fee details"
                className="resize-none text-sm"
                disabled={busy}
              />
              <p className={cn("mt-1 text-[11px]", noteOk ? "text-muted-foreground/70" : "text-amber-500")}>
                {noteOk ? "Saved on the reminder and as a note on the lead." : "Write a short note to mark it done."}
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Lead status (optional)</p>
              <div className="flex flex-wrap gap-1.5">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStatus(KEEP)}
                  disabled={busy}
                  className={cn("rounded-full border px-2.5 py-1 text-xs", status === KEEP ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50")}
                >
                  Keep{current ? ` (${label(current)})` : ""}
                </motion.button>
                {ORDER.filter((s) => s !== current).map((s) => (
                  <motion.button
                    key={s}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setStatus(s)}
                    disabled={busy}
                    className={cn("rounded-full border px-2.5 py-1 text-xs", status === s ? STATUS_META[s].badge : "border-border text-muted-foreground hover:bg-muted/50")}
                  >
                    {STATUS_META[s].label}
                  </motion.button>
                ))}
              </div>
              <AnimatePresence initial={false} mode="wait">
                {(status === "followup" || status === "closed" || status === "lost") && (
                  <motion.p
                    key={status}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="mt-1.5 text-xs text-muted-foreground"
                  >
                    {status === "followup" && "Next: the follow-up form — what happened, when, and the next follow-up's date and time."}
                    {status === "closed" && "Next: the enrolment — the lead is closed only once it is saved."}
                    {status === "lost" && "Next: why it was lost."}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <ResponsiveDialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy || !noteOk} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {changing ? "Mark done & update status" : "Mark done"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* The CRM's own dialogs for the statuses that need more; cancelling one comes back here. */}
      <FollowupDetailsModal
        open={stage === "followup"}
        leadName={leadName}
        loading={updateStatus.isPending}
        onConfirm={(d: FollowupDetails) => {
          void finish(() => updateStatus.mutateAsync({ id: target.leadId, status: "followup", ...d }));
        }}
        onCancel={() => setStage("ask")}
      />
      <LostReasonModal
        open={stage === "lost"}
        leadName={leadName}
        loading={updateStatus.isPending}
        onConfirm={(reason, lostNotes) => {
          void finish(() => updateStatus.mutateAsync({ id: target.leadId, status: "lost", lostReason: reason, lostNotes: lostNotes || undefined }));
        }}
        onCancel={() => setStage("ask")}
      />
      {stage === "closed" && lead && (
        <CloseLeadDialog
          key={lead._id}
          lead={lead}
          onClose={() => setStage("ask")}
          onClosed={() => {
            // The enrolment is saved (it is the close); the reminder, then the status if it isn't closed yet.
            void finish(lead.status === "closed" ? undefined : () => updateStatus.mutateAsync({ id: lead._id, status: "closed" }));
          }}
        />
      )}
    </>
  );
}

/** On a done reminder: what happened, when and by whom — quietly, under its note. */
/** Anything with a done note — a lead's reminder or a team list's (doneBy by name or by id). */
interface DoneInfo {
  doneNote?: string;
  doneAt?: string | null;
  doneBy?: { name?: string } | string | null;
}

export function DoneNote({ reminder }: { reminder: DoneInfo }) {
  const me = useAuthStore((st) => st.user?._id);
  const by = reminder.doneBy;
  const who = !by ? "" : typeof by === "object" ? by.name : by === me ? "you" : "";
  const when = reminder.doneAt
    ? new Date(reminder.doneAt).toLocaleString("en-AE", {
        timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
      }) + " GST"
    : "";
  if (!reminder.doneNote && !when) return null;
  return (
    <motion.p
      variants={listItemVariants}
      initial="hidden"
      animate="visible"
      className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-muted-foreground"
    >
      <CheckCircle2 className="mt-px h-3 w-3 shrink-0 text-green-500/80" />
      <span className="min-w-0 break-words">
        {(when || who) && (
          <span className="text-muted-foreground/70">
            Done{when ? ` ${when}` : ""}{who ? ` by ${who}` : ""}{reminder.doneNote ? " — " : ""}
          </span>
        )}
        {reminder.doneNote}
      </span>
    </motion.p>
  );
}
