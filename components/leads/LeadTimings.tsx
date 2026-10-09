"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarPlus, RefreshCw, PhoneCall, CalendarClock } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

/**
 * A lead's timings at the top of its page, in GST (the user, 2026-10-09):
 * when it was created, when it last changed, when it was last followed up —
 * and when the next follow-up is due, red once it has passed. Each with how
 * long ago (or how soon), kept current while the page stays open.
 */
interface LeadTimingsProps {
  /** For a handed-over lead, the hand-over (createdAt is reset then). */
  createdAt: string;
  /** When a handed-over lead first came in. */
  originalCreatedAt?: string | null;
  updatedAt: string;
  lastFollowupDate?: string | null;
  nextFollowUpAt?: string | null;
}

const MINUTE = 60_000;

/** "just now", "12 min", "3 h", "2 days" — the gap between two moments. */
function gapText(ms: number): string {
  const mins = Math.floor(Math.abs(ms) / MINUTE);
  if (mins < 1) return "a moment";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function agoText(iso: string, now: number): string {
  const ms = now - new Date(iso).getTime();
  return ms < MINUTE ? "just now" : `${gapText(ms)} ago`;
}

export function LeadTimings({ createdAt, originalCreatedAt, updatedAt, lastFollowupDate, nextFollowUpAt }: LeadTimingsProps) {
  // "3 h ago" and "overdue" move on while the page is open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(t);
  }, []);

  const nextAt = nextFollowUpAt ? new Date(nextFollowUpAt).getTime() : null;
  const overdue = nextAt !== null && nextAt < now;

  const items = [
    {
      key: "created",
      icon: CalendarPlus,
      label: "Created",
      value: formatDateTime(createdAt),
      hint: originalCreatedAt
        ? `Handed over · first came in ${formatDateTime(originalCreatedAt)}`
        : agoText(createdAt, now),
      tone: "text-primary bg-primary/10",
    },
    {
      key: "updated",
      icon: RefreshCw,
      label: "Last updated",
      value: formatDateTime(updatedAt),
      hint: agoText(updatedAt, now),
      tone: "text-sky-400 bg-sky-500/10",
    },
    {
      key: "followup",
      icon: PhoneCall,
      label: "Last follow-up",
      value: lastFollowupDate ? formatDateTime(lastFollowupDate) : "None yet",
      hint: lastFollowupDate ? agoText(lastFollowupDate, now) : "Not followed up so far",
      tone: "text-violet-400 bg-violet-500/10",
    },
    {
      key: "next",
      icon: CalendarClock,
      label: "Next follow-up",
      value: nextFollowUpAt ? formatDateTime(nextFollowUpAt) : "Not scheduled",
      hint: nextAt === null ? "None due" : overdue ? `Overdue by ${gapText(now - nextAt)}` : `In ${gapText(nextAt - now)}`,
      tone: overdue ? "text-red-400 bg-red-500/10" : "text-emerald-400 bg-emerald-500/10",
      alert: overdue,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, i) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 * i }}
          className={cn(
            "flex items-start gap-3 rounded-xl border bg-card p-3",
            item.alert ? "border-red-500/40" : "border-border/50",
          )}
        >
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", item.tone)}>
            <item.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">{item.value}</p>
            <p className={cn("text-[11px]", item.alert ? "font-medium text-red-400" : "text-muted-foreground")}>{item.hint}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
