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

/** Super Admin: the 3CX connection step by step (POST /calls/3cx/test), as in Tetra Commission. Changes nothing in 3CX. */
export async function testThreecx(): Promise<ThreecxTestResult> {
  const res = await api.post<ApiResponse<ThreecxTestResult>>("/calls/3cx/test");
  return res.data.data ?? { ok: false, steps: [{ name: "Test", ok: false, detail: res.data.message || "No answer from the server" }] };
}
