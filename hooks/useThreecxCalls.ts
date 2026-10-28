"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { ApiResponse, PaginationMeta } from "@/types";

/*
 * 3CX calls with leads (2026-10-12) — synced from 3CX every minute by the API
 * (GET /calls/3cx/*). The only calls the Calls page and a lead's Calls section
 * list; the older click-to-call / journal log (useCalls.ts) is not shown there.
 */

export type CallStatus = "answered" | "missed" | "no_answer";

export interface ThreecxCall {
  _id: string;
  startedAt: string;
  direction: "in" | "out";
  status: CallStatus;
  talkSeconds: number;
  ringSeconds: number;
  number: string;
  extension: string;
  agentName: string;
  userId: string;
  userName: string;
  /** u:<userId>, x:<extension>, or "-" (nobody took it) */
  person: string;
  leadId: string;
  leadName: string;
  recordings: number;
  reason: string;
}

export interface CallTotals {
  calls: number;
  outgoing: number;
  incoming: number;
  connected: number;
  missed: number;
  notAnswered: number;
  talkSeconds: number;
  avgTalkSeconds: number;
  recorded: number;
}

export interface CallPersonRow extends CallTotals {
  key: string;
  userId: string;
  extension: string;
  extensions: string[];
  name: string;
}

export interface ThreecxNote {
  connected: boolean;
  updatedAt: string | null;
  firstImportDone: boolean;
  running: boolean;
  backfillDays: number;
  /** Only for a super admin. */
  error: { at: string; message: string } | null;
}

export interface CallFilters {
  from: string;
  to: string;
  direction: "all" | "in" | "out";
  result: "all" | "connected" | "missed" | "not_answered";
  /** Calls with a lead, with a number no lead has, or both (2026-10-16 — every call is kept now). */
  lead: "all" | "with" | "without";
  person: string; // "all" or a person key
  search: string;
  sort: "date" | "talk" | "ring";
  order: "asc" | "desc";
}

const params = (f: CallFilters) => ({
  from: f.from || undefined,
  to: f.to || undefined,
  direction: f.direction,
  result: f.result,
  lead: f.lead === "all" ? undefined : f.lead,
  person: f.person === "all" ? undefined : f.person,
  search: f.search.trim() || undefined,
  sort: f.sort,
  order: f.order,
});

export const useCallStats = (f: CallFilters) =>
  useQuery({
    queryKey: ["threecx-calls", "stats", f],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ stats: CallTotals; people: CallPersonRow[]; threecx: ThreecxNote; canSync: boolean }>>(
        "/calls/3cx/stats", { params: params(f) });
      return res.data.data!;
    },
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

export const useCallList = (f: CallFilters, page: number, limit = 50) =>
  useQuery({
    queryKey: ["threecx-calls", "list", f, page, limit],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ calls: ThreecxCall[] }>>("/calls/3cx/list", { params: { ...params(f), page, limit } });
      return { calls: res.data.data?.calls ?? [], pagination: res.data.pagination as PaginationMeta | undefined };
    },
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

export const useLeadThreecxCalls = (leadId: string, enabled = true) =>
  useQuery({
    queryKey: ["threecx-calls", "lead", leadId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ calls: ThreecxCall[]; stats: CallTotals; threecx: ThreecxNote }>>(`/calls/3cx/lead/${leadId}`);
      return res.data.data!;
    },
    enabled: !!leadId && enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

/** A 10-minute link to play recording `index` of a call (the audio streams from 3CX through the API). */
export async function getRecordingLink(callId: string, index: number): Promise<string> {
  const res = await api.get<ApiResponse<{ url: string; expiresIn: number }>>(`/calls/3cx/${callId}/recording-link`, { params: { index } });
  return res.data.data!.url;
}

/** Every call matching the filters as a CSV file (the API builds it, up to 20,000 rows). */
export async function downloadCallsCsv(f: CallFilters): Promise<void> {
  const res = await api.get<Blob>("/calls/3cx/export", { params: params(f), responseType: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(res.data);
  a.download = `calls_${f.from || "start"}_${f.to || "today"}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

/** Super Admin: fetch new calls from 3CX now. */
export const useSyncCallsNow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<ApiResponse<unknown>>("/calls/3cx/sync")).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threecx-calls"] }),
  });
};

/** One step of Test connection, passed or not, and what it found. */
export interface ThreecxTestStep { name: string; ok: boolean; detail: string }
export interface ThreecxTestResult { ok: boolean; steps: ThreecxTestStep[]; sample?: unknown[]; parsed?: unknown[] }

/** Super Admin: the 3CX connection step by step (POST /calls/3cx/test), as in CS Portal. Changes nothing in 3CX. */
export async function testThreecx(): Promise<ThreecxTestResult> {
  const res = await api.post<ApiResponse<ThreecxTestResult>>("/calls/3cx/test");
  return res.data.data ?? { ok: false, steps: [{ name: "Test", ok: false, detail: res.data.message || "No answer from the server" }] };
}

/* ── The Call button through 3CX (2026-10-12): 3CX rings your own extension, then dials the lead ── */

/** Whether this person's Call buttons can place the call through 3CX (their extension is known, 3CX connected). */
export interface ClickToCallInfo { enabled: boolean; connected: boolean; extension: string; webClientUrl: string }

/** Asked once every few minutes — it changes only when an extension or the server's 3CX settings do. */
export const useClickToCall = (enabled = true) =>
  useQuery({
    queryKey: ["threecx-click-to-call"],
    queryFn: async () => (await api.get<ApiResponse<ClickToCallInfo>>("/calls/3cx/click-to-call")).data.data!,
    staleTime: 5 * 60_000,
    enabled,
  });

/** A 3CX call just placed: on which extension and app, and 3CX's ids for it. */
export interface StartedCall { extension: string; dial: string; device: string; callId: number | null; participantId: number | null; webClientUrl: string }

/** POST /calls/3cx/call — 3CX rings the caller's 3CX web client / app, they answer, then the lead is dialled. */
export async function startThreecxCall(leadId: string, dial: string): Promise<StartedCall> {
  return (await api.post<ApiResponse<StartedCall>>("/calls/3cx/call", { leadId, dial })).data.data!;
}

/** The caller's own call as 3CX has it now (null once it is gone). */
export interface MyCallState {
  extension: string;
  devices: string[];
  participant: { id: number | null; status: string; callId: number | null; party: string } | null;
}

export async function getMyCall(callId: number | null, dial: string): Promise<MyCallState> {
  return (await api.get<ApiResponse<MyCallState>>("/calls/3cx/my-call", { params: { ...(callId ? { callId } : {}), dial } })).data.data!;
}

/** Hang up: drops the caller's own leg of the call. */
export async function hangUpMyCall(participantId: number): Promise<void> {
  await api.post("/calls/3cx/hang-up", { participantId });
}
