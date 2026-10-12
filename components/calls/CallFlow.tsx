"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, PhoneCall, PhoneOff, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FollowupDetailsModal, type FollowupDetails } from "@/components/leads/FollowupDetailsModal";
import { LostReasonModal } from "@/components/leads/LostReasonModal";
import { CloseLeadDialog } from "@/components/students/CloseLeadDialog";
import { useLead, useUpdateLeadStatus } from "@/hooks/useLeads";
import { getMyCall, hangUpMyCall, startThreecxCall, useClickToCall, type ClickToCallInfo, type MyCallState } from "@/hooks/useThreecxCalls";
import { useAuthStore } from "@/lib/store/authStore";
import { LEAD_STATUSES, STATUS_META, type LeadStatus } from "@/lib/statusConfig";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";

/* ────────────────────────────────────────────────────────────────────────────
   Call, then log it — as in Tetra Commission's CallFlow (2026-10-12).

   A Call button asks how to call, every time:
     - 3CX call (when the caller's 3CX extension is known and 3CX is connected):
       3CX rings their 3CX web client / app first; they answer, then 3CX dials
       the lead. A call window here follows it from 3CX (ringing, calling,
       connected with a timer, ended) and can hang up.
     - Phone call: a tel: link for the phone app.
   Then "How did the call go?": connected or not, the lead's new status through
   the CRM's own dialogs (follow-up with its date and time, the enrolment for a
   close, the reason for lost; any other status straight away), and notes,
   saved as a lead note (which is also the lead's activity). It can be put
   aside ("Later"): kept in sessionStorage, it reopens after a reload, and a
   small reminder stays in the corner until it is logged. Only for calls
   started here, and only for people who may edit leads.

   One set of dialogs for the whole app, mounted by the dashboard layout.
──────────────────────────────────────────────────────────────────────────── */

export interface CallTarget { leadId?: string; leadName?: string; phone: string }

type Via = "3cx" | "phone";
interface PendingLog { at: number; leadId: string; leadName: string; phone: string; via: Via; connected: boolean | null }

/* A call's log, kept until it is saved or dropped: following a tel: link can reload the page (some browsers, some
   phones), and a log put aside should come back — so on the way back it opens again. */
const PENDING = "crm.pendingCallLog";
const PENDING_FOR_MS = 8 * 3_600_000;
const keepPending = (p: PendingLog) => { try { sessionStorage.setItem(PENDING, JSON.stringify(p)); } catch { /* not kept: the popup still opens now */ } };
const takePending = (): PendingLog | null => {
  try {
    const p = JSON.parse(sessionStorage.getItem(PENDING) || "null") as PendingLog | null;
    return p && p.leadId && Date.now() - p.at < PENDING_FOR_MS ? p : null;
  } catch { return null; }
};
const dropPending = () => { try { sessionStorage.removeItem(PENDING); } catch { /* nothing kept */ } };

/** The numbers in a lead's phone field ("+971 50 … / 055 …" holds two), cleaned for dialling. */
export function dialNumbers(raw: string): string[] {
  const out = String(raw ?? "")
    .split(/[\n\r/,;|]+| - /)
    .map((n) => n.trim().replace(/[^\d+]/g, "").replace(/(?!^)\+/g, ""))
    .filter((n) => n.replace(/\D/g, "").length >= 7);
  return Array.from(new Set(out));
}

const errMsg = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
const errWebClient = (e: unknown) =>
  (e as { response?: { data?: { errors?: { webClientUrl?: string } } } })?.response?.data?.errors?.webClientUrl || "";
const firstName = (name?: string) => String(name || "").trim().split(/\s+/)[0] || "the lead";
const clock = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

interface CallFlowValue { chooseCall: (t: CallTarget) => void }
const CallFlowContext = createContext<CallFlowValue | null>(null);
export const useCallFlow = () => useContext(CallFlowContext);

interface LiveCall { target: CallTarget & { leadId: string }; dial: string; extension: string; device: string; callId: number | null; webClientUrl: string }

export function CallFlowProvider({ children }: { children: React.ReactNode }) {
  const canLog = useAuthStore((s) => s.hasPermission)("leads", "edit");
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const clickToCall = useClickToCall(signedIn).data;
  const [choice, setChoice] = useState<CallTarget | null>(null);
  const [live, setLive] = useState<LiveCall | null>(null);
  const [pending, setPending] = useState<PendingLog | null>(null);   // a call waiting for its log
  const [asking, setAsking] = useState(false);                       // the "How did the call go?" popup is open

  // Back from a reload: the call that wasn't logged yet, again.
  useEffect(() => {
    const p = takePending();
    if (p) { setPending(p); setAsking(true); }
  }, []);

  const startLog = useCallback((p: PendingLog) => {
    if (!canLog) { dropPending(); return; }
    keepPending(p);
    setPending(p);
    setAsking(true);
  }, [canLog]);

  const chooseCall = useCallback((t: CallTarget) => setChoice(t), []);
  const value = useMemo(() => ({ chooseCall }), [chooseCall]);

  return (
    <CallFlowContext.Provider value={value}>
      {children}

      <CallChoiceDialog
        target={choice}
        info={clickToCall}
        onClose={() => setChoice(null)}
        onPhone={(dial) => {
          const t = choice;
          setChoice(null);
          if (t?.leadId) startLog({ at: Date.now(), leadId: t.leadId, leadName: t.leadName ?? "", phone: dial, via: "phone", connected: null });
        }}
        onStarted={(call) => {
          const t = choice;
          setChoice(null);
          if (!t?.leadId) return;
          // Kept from the start: closing the call window (or a reload) still leaves the call to log.
          if (canLog) {
            const p: PendingLog = { at: Date.now(), leadId: t.leadId, leadName: t.leadName ?? "", phone: call.dial, via: "3cx", connected: null };
            keepPending(p);
            setPending(p);
          }
          setLive({ ...call, target: { ...t, leadId: t.leadId } });
        }}
      />

      <CallWindow
        call={live}
        onClose={() => setLive(null)}
        onLog={(connected) => {
          const c = live;
          setLive(null);
          if (c) startLog({ at: Date.now(), leadId: c.target.leadId, leadName: c.target.leadName ?? "", phone: c.dial, via: "3cx", connected });
        }}
      />

      {pending && asking && (
        <AfterCallDialog
          key={`${pending.leadId}-${pending.at}`}
          pending={pending}
          onLater={() => setAsking(false)}
          onDone={() => { dropPending(); setPending(null); setAsking(false); }}
        />
      )}

      {pending && !asking && !live && (
        <div className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
          <PhoneCall className="h-4 w-4 shrink-0 text-green-500" />
          <span className="truncate text-xs text-foreground">Call with {pending.leadName || pending.phone} not logged yet</span>
          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => setAsking(true)}>Log it</Button>
        </div>
      )}
    </CallFlowContext.Provider>
  );
}

const OPTION = "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors";

/** Call pressed: a 3CX call (3CX rings your extension first) or a phone call — asked every time. */
function CallChoiceDialog({ target, info, onClose, onPhone, onStarted }: {
  target: CallTarget | null;
  info?: ClickToCallInfo;
  onClose: () => void;
  onPhone: (dial: string) => void;
  onStarted: (call: Omit<LiveCall, "target">) => void;
}) {
  const numbers = useMemo(() => dialNumbers(target?.phone ?? ""), [target]);
  const [dial, setDial] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [openClient, setOpenClient] = useState("");
  useEffect(() => { setDial(numbers[0] ?? ""); setBusy(false); setProblem(""); setOpenClient(""); }, [numbers]);

  const can3cx = !!info?.enabled && !!target?.leadId;
  const why = !target?.leadId ? "3CX calls are placed for a lead — open the lead to call through 3CX"
    : !info ? "Checking 3CX…"
    : !info.connected ? "3CX is not connected on the server"
    : !info.extension ? "No 3CX extension on your account — an admin adds it on the user screen" : "";

  const call3cx = async () => {
    if (!target?.leadId || !dial) return;
    setBusy(true);
    setProblem("");
    setOpenClient("");
    try {
      const r = await startThreecxCall(target.leadId, dial);
      onStarted({ dial: r.dial || dial, extension: r.extension || info?.extension || "", device: r.device || "", callId: r.callId ?? null, webClientUrl: r.webClientUrl || info?.webClientUrl || "" });
    } catch (e) {
      setProblem(errMsg(e, "3CX could not place the call"));
      setOpenClient(errWebClient(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Call {target?.leadName || dial}</DialogTitle>
          <DialogDescription>{dial || "No number to call"}</DialogDescription>
        </DialogHeader>
        {numbers.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {numbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDial(n)}
                className={cn("rounded-full border px-2.5 py-1 font-mono text-xs", n === dial ? "border-green-500/60 bg-green-500/10 text-green-500" : "border-border text-muted-foreground hover:bg-muted/50")}
              >
                {n}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <button
            type="button"
            disabled={!can3cx || busy || !dial}
            onClick={call3cx}
            className={cn(OPTION, can3cx ? "border-green-500/30 hover:bg-green-500/10" : "cursor-not-allowed border-border opacity-60")}
          >
            {busy ? <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-green-500" /> : <PhoneCall className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />}
            <span>
              <span className="block font-semibold text-foreground">3CX call</span>
              <span className="block text-sm text-muted-foreground">
                {can3cx
                  ? `Rings your 3CX web client or app (extension ${info!.extension}) — answer 3CX's call there, then ${firstName(target?.leadName)} is dialled. The call shows here too.`
                  : why}
              </span>
            </span>
          </button>
          <a
            href={dial ? `tel:${dial}` : undefined}
            onClick={() => { if (dial) setTimeout(() => onPhone(dial), 0); }}   // the browser follows the link before this window closes
            className={cn(OPTION, "border-border hover:bg-muted/50", !dial && "pointer-events-none opacity-60")}
          >
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <span>
              <span className="block font-semibold text-foreground">Phone call</span>
              <span className="block text-sm text-muted-foreground">Opens your phone app to dial {dial}</span>
            </span>
          </a>
          {problem && <p className="text-sm text-red-500">{problem}</p>}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { navigator.clipboard?.writeText(dial).then(() => toast.success("Number copied"), () => null); }}
            >
              <Copy className="h-3 w-3" /> Copy number
            </button>
            {(openClient || (can3cx && info?.webClientUrl)) && (
              <a href={openClient || info!.webClientUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-green-500 underline">
                Open the 3CX web client
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The call window for a 3CX call: what 3CX says about it every 2 seconds — ringing your 3CX, calling the lead,
 * connected (with a timer), ended — with Hang up and Log the call. Closing it does not end the call (it is on the
 * 3CX app); the log waits in the corner. When the call ends, the log opens by itself.
 */
function CallWindow({ call, onClose, onLog }: { call: LiveCall | null; onClose: () => void; onLog: (connected: boolean | null) => void }) {
  const [state, setState] = useState<MyCallState | null>(null);
  const [ended, setEnded] = useState(false);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [problem, setProblem] = useState("");
  const [hanging, setHanging] = useState(false);
  const [, setTick] = useState(0);
  const seen = useRef(false);
  const started = useRef(0);

  useEffect(() => {   // a new call: start over
    setState(null); setEnded(false); setConnectedAt(null); setProblem(""); setHanging(false);
    seen.current = false;
    started.current = Date.now();
  }, [call]);

  useEffect(() => {   // follow it from 3CX every 2 seconds until it ends
    if (!call || ended) return undefined;
    let gone = false;
    const look = async () => {
      try {
        const s = await getMyCall(call.callId, call.dial);
        if (gone) return;
        setState(s);
        setProblem("");
        if (s?.participant) {
          seen.current = true;
          if (/connect/i.test(s.participant.status)) setConnectedAt((at) => at ?? Date.now());
        } else if (seen.current || Date.now() - started.current > 60_000) {
          setEnded(true);
        }
      } catch (e) {
        if (!gone) setProblem(errMsg(e, "Could not read the call from 3CX"));
      }
    };
    void look();
    const id = setInterval(look, 2000);
    return () => { gone = true; clearInterval(id); };
  }, [call, ended]);

  useEffect(() => {   // the talk timer
    if (!connectedAt || ended) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [connectedAt, ended]);

  // Ended: on to "How did the call go?" after a moment, with whether it connected.
  useEffect(() => {
    if (!call || !ended) return undefined;
    const id = setTimeout(() => onLog(connectedAt ? true : null), 1500);
    return () => clearTimeout(id);
  }, [call, ended, connectedAt, onLog]);

  const hangUp = async () => {
    const pid = state?.participant?.id;
    if (!pid) return;
    setHanging(true);
    try {
      await hangUpMyCall(pid);
      setEnded(true);
    } catch (e) {
      setProblem(errMsg(e, "Could not hang up"));
    } finally {
      setHanging(false);
    }
  };

  const status = state?.participant?.status || "";
  const where = call?.device || "3CX web client";
  const ringingYou = `Ringing your ${where}…`;
  const name = firstName(call?.target.leadName);
  const line = ended ? (connectedAt ? "Call ended" : "The call ended before it connected")
    : !state?.participant ? ringingYou
    : /connect/i.test(status) ? `Connected · ${clock(Date.now() - (connectedAt ?? Date.now()))}`
    : /dial/i.test(status) ? `Calling ${name}…`
    : /ring/i.test(status) ? ringingYou
    : status;
  const hint = connectedAt ? ""
    : !ended ? `Answer 3CX's call in your ${where} (the green handset) — then ${name}'s phone rings.`
    : `If 3CX's call didn't pop up in your ${where}, open it, let it use the microphone and call again — or use Phone call. If you answered it, ${name} didn't pick up.`;

  return (
    <Dialog open={!!call} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="items-center text-center sm:text-center">
          <div className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-full", ended ? "bg-muted text-muted-foreground" : "bg-green-500/10 text-green-500")}>
            {ended ? <PhoneOff className="h-6 w-6" /> : <PhoneCall className={cn("h-6 w-6", !connectedAt && "animate-pulse")} />}
          </div>
          <DialogTitle>{call?.target.leadName || call?.dial}</DialogTitle>
          <DialogDescription>{call?.dial} · from your extension {call?.extension}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 text-center">
          <p className={cn("text-lg font-semibold", ended ? "text-muted-foreground" : "text-green-500")}>{line}</p>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
          {status && !ended && <p className="text-xs text-muted-foreground/70">3CX: {status}{state?.participant?.party ? ` · ${state.participant.party}` : ""}</p>}
          {!ended && <p className="text-xs text-muted-foreground/70">The call is on your 3CX app — closing this window does not end it.</p>}
          {problem && <p className="text-xs text-red-500">{problem}</p>}
        </div>
        <DialogFooter className="gap-2 sm:justify-center">
          {!ended && (
            <Button variant="destructive" onClick={hangUp} disabled={hanging || !state?.participant?.id}>
              {hanging ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />} Hang up
            </Button>
          )}
          <Button variant={ended ? "default" : "outline"} onClick={() => onLog(connectedAt ? true : null)}>Log the call</Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Stage = "ask" | "followup" | "lost" | "closed" | "saving";
const KEEP = "__keep__";

/**
 * "How did the call go?" — connected or not, the lead's new status (the CRM's own dialogs for follow-up, lost and a
 * close), and notes, saved as a lead note. "Later" puts it aside.
 */
function AfterCallDialog({ pending, onLater, onDone }: { pending: PendingLog; onLater: () => void; onDone: () => void }) {
  const qc = useQueryClient();
  const { data: lead } = useLead(pending.leadId);
  const updateStatus = useUpdateLeadStatus();
  const [connected, setConnected] = useState<boolean | null>(pending.connected);
  const [status, setStatus] = useState<string>(KEEP);
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState<Stage>("ask");
  const current = lead?.status as LeadStatus | undefined;
  const changing = status !== KEEP && status !== current;
  const label = (s: string) => STATUS_META[s as LeadStatus]?.label ?? s;

  /** The note: how the call went, what the status became, what was said. */
  async function saveNote(newStatus: string | null) {
    const head = `Call (${pending.via === "3cx" ? "3CX" : "phone"}) — ${connected ? "connected" : "not connected"}${newStatus ? ` · status → ${label(newStatus)}` : ""}`;
    await api.post(`/leads/${pending.leadId}/notes`, { content: notes.trim() ? `${head}\n${notes.trim()}` : head });
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["threecx-calls"] });
  }

  async function finish(newStatus: string | null) {
    try {
      await saveNote(newStatus);
      toast.success("Call logged");
      onDone();
    } catch (e) {
      toast.error(errMsg(e, "The call's note could not be saved"));
      setStage("ask");
    }
  }

  async function setPlainStatus(s: LeadStatus) {
    setStage("saving");
    try {
      await updateStatus.mutateAsync({ id: pending.leadId, status: s });
      await finish(s);
    } catch {
      setStage("ask");   // the hook says what went wrong
    }
  }

  function save() {
    if (connected === null) { toast.error("Did the call connect?"); return; }
    if (!changing) { setStage("saving"); void finish(null); return; }
    if (status === "closed" && !lead) { toast.info("Loading the lead — try again in a moment"); return; }
    if (status === "followup") setStage("followup");
    else if (status === "lost") setStage("lost");
    else if (status === "closed") setStage("closed");
    else void setPlainStatus(status as LeadStatus);
  }

  // Not connected: the statuses that usually follow, first.
  const order = connected === false
    ? [...(["not_connected", "cnc", "callback"] as LeadStatus[]), ...LEAD_STATUSES.filter((s) => !["not_connected", "cnc", "callback"].includes(s))]
    : [...LEAD_STATUSES];

  return (
    <>
      <Dialog open={stage === "ask" || stage === "saving"} onOpenChange={(o) => { if (!o && stage === "ask") onLater(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>How did the call go?</DialogTitle>
            <DialogDescription>
              {pending.leadName || "The lead"} · {pending.phone} · {pending.via === "3cx" ? "3CX call" : "phone call"}
              {current ? ` · now ${label(current)}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Did it connect?</p>
              <div className="grid grid-cols-2 gap-2">
                {[{ v: true, t: "Yes, we spoke" }, { v: false, t: "No, not connected" }].map(({ v, t }) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setConnected(v)}
                    className={cn("rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      connected === v ? (v ? "border-green-500/60 bg-green-500/10 text-green-500" : "border-orange-500/60 bg-orange-500/10 text-orange-400") : "border-border text-muted-foreground hover:bg-muted/50")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Status</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatus(KEEP)}
                  className={cn("rounded-full border px-2.5 py-1 text-xs", status === KEEP ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50")}
                >
                  Keep{current ? ` (${label(current)})` : ""}
                </button>
                {order.filter((s) => s !== current).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn("rounded-full border px-2.5 py-1 text-xs", status === s ? STATUS_META[s].badge : "border-border text-muted-foreground hover:bg-muted/50")}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
              {status === "followup" && <p className="mt-1.5 text-xs text-muted-foreground">Next: the follow-up form — what happened, when, and the next follow-up&apos;s date and time.</p>}
              {status === "closed" && <p className="mt-1.5 text-xs text-muted-foreground">Next: the enrolment — the lead is closed only once it is saved.</p>}
              {status === "lost" && <p className="mt-1.5 text-xs text-muted-foreground">Next: why it was lost.</p>}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Notes</p>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1900} placeholder="What was said (saved as a note on the lead)" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" className="text-muted-foreground" onClick={() => { if (window.confirm("Drop this call's log without saving it?")) onDone(); }} disabled={stage === "saving"}>
              <X className="h-4 w-4" /> Don&apos;t log
            </Button>
            <Button variant="outline" onClick={onLater} disabled={stage === "saving"}>Later</Button>
            <Button onClick={save} disabled={stage === "saving" || connected === null}>
              {stage === "saving" && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* The CRM's own dialogs for the statuses that need more; cancelling one comes back here. */}
      <FollowupDetailsModal
        open={stage === "followup"}
        leadName={pending.leadName}
        loading={updateStatus.isPending}
        onConfirm={(d: FollowupDetails) => {
          updateStatus.mutate({ id: pending.leadId, status: "followup", ...d }, {
            onSuccess: () => { setStage("saving"); void finish("followup"); },
            onError: () => setStage("ask"),
          });
        }}
        onCancel={() => setStage("ask")}
      />
      <LostReasonModal
        open={stage === "lost"}
        leadName={pending.leadName}
        loading={updateStatus.isPending}
        onConfirm={(reason, lostNotes) => {
          updateStatus.mutate({ id: pending.leadId, status: "lost", lostReason: reason, lostNotes: lostNotes || undefined }, {
            onSuccess: () => { setStage("saving"); void finish("lost"); },
            onError: () => setStage("ask"),
          });
        }}
        onCancel={() => setStage("ask")}
      />
      {stage === "closed" && lead && (
        <CloseLeadDialog
          key={lead._id}
          lead={lead}
          onClose={() => setStage("ask")}
          onClosed={() => {
            if (lead.status === "closed") { setStage("saving"); void finish("closed"); return; }
            updateStatus.mutate({ id: lead._id, status: "closed" }, {
              onSuccess: () => { setStage("saving"); void finish("closed"); },
              onError: () => setStage("ask"),
            });
          }}
        />
      )}
    </>
  );
}
