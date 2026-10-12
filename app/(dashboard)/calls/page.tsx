"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownUp, CheckCircle2, Clock, Download, Loader2, PhoneCall, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing,
  PlugZap, RefreshCw, Search, Timer, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, gstPeriodStartISO, gstTodayISO, toGstDateISO } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/lib/store/authStore";
import { ClickToCall } from "@/components/leads/ClickToCall";
import { CallPerson, CallResult, RecordingPlayer, SyncNote, fmtDuration, fmtTalkTotal, fmtWhen } from "@/components/calls/callUi";
import { ThreecxTestDialog } from "@/components/calls/ThreecxTestDialog";
import { downloadCallsCsv, useCallList, useCallStats, useSyncCallsNow, type CallFilters } from "@/hooks/useThreecxCalls";

/**
 * Calls (2026-10-12) — every call with a lead through 3CX, synced every
 * minute: in or out, connected / missed / not answered, who took it, how long,
 * and the recording. Only 3CX calls with a lead's number are here; the older
 * click-to-call log is not. The API decides who sees which calls (your own,
 * your team's as a team leader, everyone's for managers).
 */

type Preset = "today" | "7d" | "30d" | "month" | "custom";
const PRESETS: { id: Preset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom" },
];
const daysAgo = (n: number) => toGstDateISO(new Date(Date.now() - n * 86_400_000));
function presetRange(p: Preset): { from: string; to: string } {
  const today = gstTodayISO();
  if (p === "today") return { from: today, to: today };
  if (p === "7d") return { from: daysAgo(6), to: today };
  if (p === "30d") return { from: daysAgo(29), to: today };
  return { from: gstPeriodStartISO("month"), to: today };
}

const SORTS: { id: string; label: string; sort: CallFilters["sort"]; order: CallFilters["order"] }[] = [
  { id: "date-desc", label: "Newest first", sort: "date", order: "desc" },
  { id: "date-asc", label: "Oldest first", sort: "date", order: "asc" },
  { id: "talk-desc", label: "Longest talk", sort: "talk", order: "desc" },
  { id: "talk-asc", label: "Shortest talk", sort: "talk", order: "asc" },
  { id: "ring-desc", label: "Longest ring", sort: "ring", order: "desc" },
  { id: "ring-asc", label: "Shortest ring", sort: "ring", order: "asc" },
];
const PAGE = 50;

function Stat({ label, value, hint, icon: Icon, color, active, onClick }: {
  label: string; value: string; hint?: string; icon: React.ElementType; color: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn("border-border transition-colors", onClick && "cursor-pointer hover:bg-muted/40", active && "ring-2 ring-primary/50")}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("rounded-lg p-2.5", color)}><Icon className="h-4 w-4" /></div>
        <div className="min-w-0">
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          {hint && <p className="truncate text-[10px] text-muted-foreground/70">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CallsPage() {
  const { hasPermission } = useAuthStore();
  const [preset, setPreset] = useState<Preset>("7d");
  const [range, setRange] = useState(() => presetRange("7d"));
  const [direction, setDirection] = useState<CallFilters["direction"]>("all");
  const [result, setResult] = useState<CallFilters["result"]>("all");
  const [person, setPerson] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("date-desc");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  const sort = SORTS.find((s) => s.id === sortId) ?? SORTS[0]!;
  const filters: CallFilters = useMemo(
    () => ({ from: range.from, to: range.to, direction, result, person, search, sort: sort.sort, order: sort.order }),
    [range, direction, result, person, search, sort],
  );
  useEffect(() => setPage(1), [filters]);

  const statsQ = useCallStats(filters);
  const listQ = useCallList(filters, page, PAGE);
  const syncNow = useSyncCallsNow();
  const [testing, setTesting] = useState(false);
  const stats = statsQ.data?.stats;
  const people = statsQ.data?.people ?? [];
  const calls = listQ.data?.calls ?? [];
  const pagination = listQ.data?.pagination;
  const canExport = hasPermission("calls", "export");

  function pickPreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") setRange(presetRange(p));
  }
  const hasFilters = direction !== "all" || result !== "all" || person !== "all" || !!searchText;
  function clearFilters() {
    setDirection("all"); setResult("all"); setPerson("all"); setSearchText(""); setSearch("");
  }

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadCallsCsv(filters);
    } catch {
      toast.error("Could not export the calls");
    } finally {
      setExporting(false);
    }
  }

  async function runSync() {
    try {
      const r = await syncNow.mutateAsync();
      toast.success(r?.message || "Synced with 3CX");
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "The sync failed");
    }
  }

  const n = (v?: number) => (v ?? 0).toLocaleString("en-US");
  const dash = <span className="text-muted-foreground/40">—</span>;
  const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th className={cn("whitespace-nowrap px-3 py-2.5 font-medium", right ? "text-right" : "text-left")}>{children}</th>
  );
  const named = people.filter((p) => p.key !== "-");
  const loadError = (statsQ.error || listQ.error) as { response?: { data?: { message?: string } } } | null;

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <PhoneCall className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">Calls</h1>
            <p className="text-sm text-muted-foreground">Every call with a lead through 3CX — in or out, connected or missed, who took it, how long, and the recording.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <Button variant="outline" size="sm" onClick={() => { statsQ.refetch(); listQ.refetch(); }} disabled={statsQ.isFetching || listQ.isFetching}>
            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", (statsQ.isFetching || listQ.isFetching) && "animate-spin")} /> Refresh
          </Button>
          {/* Super Admin, as Sync now: the connection step by step (2026-10-12). */}
          {statsQ.data?.canSync && (
            <Button variant="outline" size="sm" onClick={() => setTesting(true)}>
              <PlugZap className="mr-2 h-3.5 w-3.5" /> Test connection
            </Button>
          )}
          {statsQ.data?.canSync && (
            <Button size="sm" onClick={runSync} disabled={syncNow.isPending}>
              {syncNow.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />} Sync now
            </Button>
          )}
        </div>
      </motion.div>

      <SyncNote threecx={statsQ.data?.threecx} />

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="space-y-3 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pickPreset(p.id)}
                  className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors", preset === p.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <div className="flex items-center gap-1.5">
                <Input type="date" value={range.from} max={range.to || gstTodayISO()} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="h-8 w-[150px] text-xs" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={range.to} min={range.from} max={gstTodayISO()} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="h-8 w-[150px] text-xs" />
              </div>
            )}
            {(statsQ.isFetching || listQ.isFetching) && !statsQ.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Lead name or number…" className="h-8 pl-8 text-sm" />
            </div>
            <Select value={direction} onValueChange={(v) => setDirection(v as CallFilters["direction"])}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">In and out</SelectItem>
                <SelectItem value="out">Outgoing</SelectItem>
                <SelectItem value="in">Incoming</SelectItem>
              </SelectContent>
            </Select>
            <Select value={result} onValueChange={(v) => setResult(v as CallFilters["result"])}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="not_answered">Not answered</SelectItem>
              </SelectContent>
            </Select>
            {(named.length > 1 || person !== "all") && (
              <Select value={person} onValueChange={setPerson}>
                <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Salesperson" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.name} ({p.calls})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={sortId} onValueChange={setSortId}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><ArrowDownUp className="mr-1.5 h-3 w-3 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}><X className="mr-1 h-3 w-3" /> Clear</Button>
            )}
            {canExport && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCsv} disabled={exporting || !stats?.calls}>
                {exporting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Download className="mr-1.5 h-3 w-3" />} CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Totals — clicking one filters the list by it */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <Stat label="All calls" value={n(stats?.calls)} icon={PhoneCall} color="bg-primary/10 text-primary" active={direction === "all" && result === "all"} onClick={() => { setDirection("all"); setResult("all"); }} />
        <Stat label="Outgoing" value={n(stats?.outgoing)} icon={PhoneOutgoing} color="bg-green-500/10 text-green-500" active={direction === "out"} onClick={() => setDirection(direction === "out" ? "all" : "out")} />
        <Stat label="Incoming" value={n(stats?.incoming)} icon={PhoneIncoming} color="bg-blue-500/10 text-blue-500" active={direction === "in"} onClick={() => setDirection(direction === "in" ? "all" : "in")} />
        <Stat label="Connected" value={n(stats?.connected)} icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-500" active={result === "connected"} onClick={() => setResult(result === "connected" ? "all" : "connected")} />
        <Stat label="Missed" value={n(stats?.missed)} hint="They called, nobody answered" icon={PhoneMissed} color="bg-red-500/10 text-red-500" active={result === "missed"} onClick={() => setResult(result === "missed" ? "all" : "missed")} />
        <Stat label="Not answered" value={n(stats?.notAnswered)} hint="We called, they didn't pick up" icon={PhoneOff} color="bg-amber-500/10 text-amber-500" active={result === "not_answered"} onClick={() => setResult(result === "not_answered" ? "all" : "not_answered")} />
        <Stat label="Talk time" value={fmtTalkTotal(stats?.talkSeconds ?? 0)} icon={Clock} color="bg-cyan-500/10 text-cyan-500" />
        <Stat label="Average call" value={stats?.connected ? fmtDuration(stats.avgTalkSeconds) : "—"} hint="Of connected calls" icon={Timer} color="bg-purple-500/10 text-purple-500" />
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {loadError.response?.data?.message || "Could not load the calls"}
        </div>
      )}

      {/* Per person */}
      {named.length > 1 && (
        <Card className="overflow-hidden border-border">
          <CardHeader className="px-4 pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> By salesperson</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
                    <TH>Salesperson</TH><TH right>Calls</TH><TH right>Connected</TH><TH right>Missed</TH><TH right>Not answered</TH><TH right>Talk time</TH><TH right>Average</TH>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr
                      key={p.key}
                      title={person === p.key ? "Show everyone" : `Show only ${p.name}'s calls`}
                      onClick={() => setPerson(person === p.key ? "all" : p.key)}
                      className={cn("cursor-pointer border-b border-border/50 hover:bg-muted/30", person === p.key && "bg-primary/10")}
                    >
                      <td className="px-3 py-2">
                        <div className={cn("text-xs", p.key === "-" ? "text-muted-foreground" : "font-medium text-foreground")}>{p.name}</div>
                        {p.extensions.length > 0 && !p.name.startsWith("Ext ") && (
                          <div className="text-[11px] text-muted-foreground">Ext {p.extensions.join(", ")}{!p.userId && " · not linked to a CRM user"}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-medium tabular-nums">{p.calls}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-green-500">{p.connected || dash}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-red-500">{p.missed || dash}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-amber-500">{p.notAnswered || dash}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">{p.talkSeconds ? fmtTalkTotal(p.talkSeconds) : dash}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">{p.connected ? fmtDuration(p.avgTalkSeconds) : dash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* The calls */}
      <Card className="overflow-hidden border-border">
        <CardHeader className="px-4 pb-0 pt-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {n(pagination?.total ?? 0)} call{pagination?.total === 1 ? "" : "s"}{hasFilters && " (filtered)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-2 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <TH>When (GST)</TH><TH>Lead</TH><TH>Call</TH><TH>Who</TH><TH right>Talk</TH><TH right>Ring</TH><TH>Recording</TH>
                </tr>
              </thead>
              <tbody>
                {listQ.isLoading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Loading calls…</td></tr>
                ) : calls.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">{hasFilters ? "No calls match these filters." : "No calls with leads in this period."}</td></tr>
                ) : calls.map((c) => (
                  <tr key={c._id} className="group border-b border-border/50 align-top hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-foreground">{fmtWhen(c.startedAt)}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/leads/${c.leadId}`} className="text-xs font-medium text-primary hover:underline">{c.leadName || "Lead"}</Link>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[11px] text-muted-foreground">{c.number}</span>
                        <ClickToCall phoneNumber={c.number} leadId={c.leadId} leadName={c.leadName} size="icon" variant="ghost" className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><CallResult call={c} /></td>
                    <td className="px-3 py-2.5"><CallPerson call={c} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs tabular-nums">{c.talkSeconds ? fmtDuration(c.talkSeconds) : dash}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs tabular-nums text-muted-foreground">{c.ringSeconds ? fmtDuration(c.ringSeconds) : dash}</td>
                    <td className="px-3 py-2"><RecordingPlayer call={c} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={!pagination.hasPrevPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ThreecxTestDialog open={testing} onClose={() => setTesting(false)} />
    </div>
  );
}
