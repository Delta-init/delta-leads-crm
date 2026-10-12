"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

/** How the board is ranked: revenue (then closings, follow-ups, calls — as before), calls, or talk time (2026-10-12). */
export type LeaderboardRank = "revenue" | "calls" | "talk";

export const RANK_OPTIONS: { value: LeaderboardRank; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "calls", label: "Calls" },
  { value: "talk", label: "Talk time" },
];

/** One salesperson's month, as GET /leaderboard ranks it. Calls, connected and talk time come from 3CX. */
export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  revenue: number;
  closings: number;
  followUps: number;
  calls: number;
  connected: number;
  talkSeconds: number;
}

export interface Leaderboard {
  month: string;
  rankBy: LeaderboardRank;
  rows: LeaderboardRow[];
}

/** "1h 05m" / "4m 12s" / "0s" — a month's talk time. */
export function fmtTalk(seconds: number): string {
  const s = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m) return `${m}m ${String(r).padStart(2, "0")}s`;
  return `${r}s`;
}

/** The month's leaderboard (YYYY-MM, Dubai months); this month when none is given; ranked by revenue unless asked. */
export const useLeaderboard = (month?: string, rankBy: LeaderboardRank = "revenue") =>
  useQuery({
    queryKey: ["leaderboard", month ?? "current", rankBy],
    queryFn: async () => {
      const res = await api.get<{ data: Leaderboard }>("/leaderboard", { params: { ...(month ? { month } : {}), ...(rankBy !== "revenue" ? { rankBy } : {}) } });
      return res.data.data;
    },
  });
