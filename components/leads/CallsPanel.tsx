"use client";

import { useState } from "react";
import { Clock, Phone, PhoneCall, PhoneMissed, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/authStore";
import { useLeadThreecxCalls } from "@/hooks/useThreecxCalls";
import { ClickToCall } from "@/components/leads/ClickToCall";
import { CallPerson, CallResult, RecordingPlayer, SyncNote, fmtDuration, fmtTalkTotal, fmtWhen } from "@/components/calls/callUi";

const FIRST = 8;

interface CallsPanelProps {
  leadId: string;
  phone: string;
  leadName?: string;
}

/**
 * A lead's calls through 3CX (2026-10-12): when, in or out, connected or
 * missed, who, how long, and the recording — the same calls as the Calls page,
 * synced from 3CX every minute. The Call button stays as it was.
 */
export function CallsPanel({ leadId, phone, leadName }: CallsPanelProps) {
  // A role with Calls unticked keeps the Call button, without the history.
  const canSee = useAuthStore((s) => s.hasPermission("calls", "view"));
  const { data, isLoading, error, refetch, isFetching } = useLeadThreecxCalls(leadId, canSee);
  const [all, setAll] = useState(false);
  const calls = data?.calls ?? [];
  const stats = data?.stats;
  const list = all ? calls : calls.slice(0, FIRST);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <PhoneCall className="h-4 w-4 text-primary" />
            Calls
          </CardTitle>
          <div className="flex items-center gap-2">
            <ClickToCall phoneNumber={phone} leadId={leadId} leadName={leadName} variant="outline" size="sm" showLabel={true} />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} disabled={!canSee || isFetching} title="Refresh">
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {!!stats?.calls && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" /> {stats.calls} call{stats.calls === 1 ? "" : "s"} · {stats.outgoing} out · {stats.incoming} in
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs text-green-500">
              {stats.connected} connected
            </span>
            {stats.missed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs text-red-500">
                <PhoneMissed className="h-3 w-3" /> {stats.missed} missed
              </span>
            )}
            {stats.notAnswered > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-500">
                {stats.notAnswered} not answered
              </span>
            )}
            {stats.talkSeconds > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {fmtTalkTotal(stats.talkSeconds)} talking
              </span>
            )}
            {stats.recorded > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                <Play className="h-3 w-3" /> {stats.recorded} recorded
              </span>
            )}
          </div>
        )}
        <div className="mt-2"><SyncNote threecx={data?.threecx} /></div>
      </CardHeader>

      <CardContent className="p-0">
        {!canSee ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">Call history is not open to your role.</p>
        ) : isLoading ? (
          <div className="space-y-2 px-6 pb-6">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/40" />)}
          </div>
        ) : error ? (
          <div className="mx-6 mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {(error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not load the calls"}
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
            <div className="rounded-full bg-muted/60 p-3"><Phone className="h-5 w-5 text-muted-foreground" /></div>
            <p className="text-sm text-muted-foreground">No calls with this lead through 3CX yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {["When (GST)", "Call", "Who", "Talk", "Ring", "Recording"].map((h) => (
                    <th key={h} className={cn("whitespace-nowrap px-3 py-2 font-medium", h === "Talk" || h === "Ring" ? "text-right" : "text-left")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c._id} className="border-b border-border/50 align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{fmtWhen(c.startedAt)}</td>
                    <td className="px-3 py-2"><CallResult call={c} /></td>
                    <td className="px-3 py-2"><CallPerson call={c} /></td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums">{c.talkSeconds ? fmtDuration(c.talkSeconds) : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">{c.ringSeconds ? fmtDuration(c.ringSeconds) : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="px-3 py-1.5"><RecordingPlayer call={c} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {calls.length > FIRST && (
              <div className="px-3 py-2 text-center">
                <Button variant="ghost" size="sm" onClick={() => setAll((a) => !a)}>{all ? "Show fewer" : `Show all ${calls.length} calls`}</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
