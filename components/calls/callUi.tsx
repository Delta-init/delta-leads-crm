"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Phone, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getRecordingLink, type ThreecxCall, type ThreecxNote } from "@/hooks/useThreecxCalls";

/* ────────────────────────────────────────────────────────────────────────────
   3CX calls with leads: how a call's result, length, person and recording
   show on the Calls page and a lead's Calls section (as in Tetra Commission).
──────────────────────────────────────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");

/** 125 → "2:05", 3725 → "1:02:05". */
export function fmtDuration(s: number): string {
  const n = Math.max(0, Math.round(Number(s) || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(n % 60)}` : `${m}:${pad(n % 60)}`;
}

/** A total: "3h 12m", "45m", "30s". */
export function fmtTalkTotal(s: number): string {
  const n = Math.max(0, Math.round(Number(s) || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  return h ? `${h}h ${m}m` : m ? `${m}m` : `${n}s`;
}

/** "12 Oct, 14:05" in Dubai time. */
export const fmtWhen = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
export const fmtClock = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" }) : "";

export const RESULTS: Record<ThreecxCall["status"], { label: string; cls: string; icon: string }> = {
  answered: { label: "Connected", cls: "text-green-500 bg-green-500/10 border-green-500/20", icon: "text-muted-foreground" },
  missed: { label: "Missed", cls: "text-red-500 bg-red-500/10 border-red-500/20", icon: "text-red-500" },
  no_answer: { label: "Not answered", cls: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: "text-amber-500" },
};

const iconOf = (c: Pick<ThreecxCall, "status" | "direction">) =>
  c.status === "missed" ? PhoneMissed : c.status === "no_answer" ? PhoneOff : c.direction === "in" ? PhoneIncoming : PhoneOutgoing;

/** In or out, and what happened: connected; missed (they called, nobody answered); not answered (we called). */
export function CallResult({ call }: { call: Pick<ThreecxCall, "status" | "direction"> }) {
  const r = RESULTS[call.status] ?? RESULTS.answered;
  const Icon = iconOf(call);
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", r.icon)} />
      <span className="w-14 text-xs text-muted-foreground">{call.direction === "in" ? "Incoming" : "Outgoing"}</span>
      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", r.cls)}>{r.label}</span>
    </span>
  );
}

/** Who took or made the call: the CRM user with that 3CX extension, else 3CX's name for it. */
export function CallPerson({ call }: { call: Pick<ThreecxCall, "userName" | "agentName" | "extension"> }) {
  const name = call.userName || call.agentName;
  if (!name && !call.extension) return <span className="text-muted-foreground/40">—</span>;
  return (
    <div className="whitespace-nowrap">
      <div className="text-xs text-foreground">{name || `Ext ${call.extension}`}</div>
      {call.extension && name && <div className="text-[11px] text-muted-foreground">Ext {call.extension}</div>}
    </div>
  );
}

/**
 * A call's recording: asks the API for a 10-minute link, then plays it in the
 * browser — streamed from 3CX, never stored here. A transferred call with
 * several parts gets a button each.
 */
export function RecordingPlayer({ call }: { call: Pick<ThreecxCall, "_id" | "recordings"> }) {
  const [playing, setPlaying] = useState<{ index: number; url: string } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!call.recordings) return <span className="text-[11px] text-muted-foreground/40">—</span>;

  const open = async (index: number) => {
    setBusy(index);
    setErr(null);
    try {
      setPlaying({ index, url: await getRecordingLink(call._id, index) });
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErr(msg || "Could not open the recording");
    } finally {
      setBusy(null);
    }
  };
  const parts = Array.from({ length: call.recordings }, (_, i) => i);

  return (
    <div className="flex flex-col items-start gap-1.5" onClick={(e) => e.stopPropagation()}>
      {playing && (
        <audio
          key={playing.url}
          src={playing.url}
          controls
          autoPlay
          controlsList="nodownload"
          className="h-9 w-64 max-w-full"
          onError={() => { setPlaying(null); setErr("Could not play it — the link may have expired. Play again."); }}
        />
      )}
      {(!playing || parts.length > 1) && (
        <div className="flex flex-wrap gap-1">
          {parts.map((i) => (
            <Button key={i} size="sm" variant={playing?.index === i ? "secondary" : "outline"} className="h-7 gap-1.5 px-2 text-xs" disabled={busy !== null} onClick={() => open(i)}>
              {busy === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              {parts.length > 1 ? `Part ${i + 1}` : "Play"}
            </Button>
          ))}
        </div>
      )}
      {err && <span className="max-w-[16rem] text-[11px] text-destructive">{err}</span>}
    </div>
  );
}

/** Whether calls are coming in from 3CX, in a line. What went wrong shows for a super admin only (the API sends it to them alone). */
export function SyncNote({ threecx }: { threecx?: ThreecxNote | null }) {
  if (!threecx) return null;
  const box = (cls: string, Icon: typeof Phone, children: React.ReactNode, spin = false) => (
    <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-xs", cls)}>
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", spin && "animate-spin")} /> <span>{children}</span>
    </div>
  );
  if (!threecx.connected) return box("border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400", AlertTriangle, "3CX not connected — call history is not coming in. The server needs THREECX_URL, THREECX_CLIENT_ID and THREECX_API_KEY.");
  if (!threecx.firstImportDone) {
    return threecx.running
      ? box("border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400", RefreshCw, `Fetching the last ${threecx.backfillDays} days of calls from 3CX — they appear here as they come in.`, true)
      : box("border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400", Phone, "Waiting for the first import from 3CX (it starts a couple of minutes after the server does).");
  }
  if (threecx.error) return box("border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400", AlertTriangle, `The last sync with 3CX failed at ${fmtClock(threecx.error.at)}: ${threecx.error.message}`);
  return <p className="text-xs text-muted-foreground">Last synced {fmtClock(threecx.updatedAt)} GST · from 3CX every minute</p>;
}
