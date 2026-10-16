"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Target, Volume2, VolumeX } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/store/authStore";
import { getViewAs } from "@/lib/impersonation";
import { playAlertSound } from "@/lib/alertTone";
import { cn } from "@/lib/utils";

/** What the server sends with a "target_warning" (dailyTargetService). */
interface TargetWarning {
  scope: "team" | "department";
  teamName?: string;
  collected: number;
  target: number;
  short: number;
  hour: string;
  teams?: { name: string; collected: number; target: number }[];
  url?: string;
}

const aed = (n: number) => `AED ${Math.round(n).toLocaleString("en-US")}`;
const say = (n: number) => `${Math.round(n).toLocaleString("en-US")} dirhams`;

/** The warning read aloud in the device's own voice (the user, 2026-10-16: "with AI voice"). */
function speak(w: TargetWarning): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const who = w.scope === "team" ? w.teamName ?? "Your team" : "The department";
  const text =
    `Warning. ${who} has collected ${say(w.collected)} of ${say(w.target)} today. ` +
    `${say(w.short)} still to collect.`;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    // No voice on this device: the tone and the pop-up still show.
  }
}

/**
 * The hourly target warning as a pop-up on any page, with a tone and the
 * warning spoken. Only for whoever the server sent it to (team leaders, the
 * Sales Manager); never while viewing the CRM as someone else. Several at once
 * (a leader who is also the Sales Manager) wait their turn.
 */
export function TargetWarningDialog() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [queue, setQueue] = useState<TargetWarning[]>([]);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    if (!accessToken || typeof window === "undefined") return;
    const socket = getSocket(accessToken);
    const handler = (payload: { type?: string; url?: string; data?: Partial<TargetWarning> & { type?: string } }) => {
      if ((payload?.data?.type ?? payload?.type) !== "target_warning" || !payload.data || getViewAs()) return;
      const d = payload.data;
      if (typeof d.collected !== "number" || typeof d.target !== "number") return;
      setQueue((q) => [...q, { ...(d as TargetWarning), url: payload.url }]);
    };
    socket.on("notification", handler);
    return () => { socket.off("notification", handler); };
  }, [accessToken]);

  const current = queue[0];
  // Tone, then the voice, each time a new warning comes to the front.
  useEffect(() => {
    if (!current) return;
    playAlertSound("other", { force: true });
    if (!mutedRef.current) {
      const t = setTimeout(() => speak(current), 500);
      return () => clearTimeout(t);
    }
  }, [current]);

  const close = () => {
    try { window.speechSynthesis?.cancel(); } catch { /* nothing to stop */ }
    setQueue((q) => q.slice(1));
  };

  if (!current) return null;
  const pct = current.target > 0 ? Math.min(100, (current.collected / current.target) * 100) : 0;
  const title = current.scope === "team" ? `${current.teamName} is behind today's target` : "The department is behind today's target";

  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-md border-red-500/40">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 text-red-500"
            >
              <AlertTriangle className="h-5 w-5" />
            </motion.span>
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
              Target warning · {current.hour}
            </span>
          </div>
          <DialogTitle className="text-left">{title}</DialogTitle>
          <DialogDescription className="text-left">
            {aed(current.collected)} collected of {aed(current.target)} today —{" "}
            <span className="font-semibold text-red-600 dark:text-red-400">{aed(current.short)} still to collect.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn("h-full origin-left rounded-full", pct >= 66 ? "bg-amber-500" : "bg-red-500")}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: pct / 100 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ width: "100%" }}
            />
          </div>
          <p className="text-right text-[11px] tabular-nums text-muted-foreground">{Math.round(pct)}% of target</p>
        </div>

        {current.scope === "department" && current.teams?.length ? (
          <div className="space-y-1.5 rounded-lg border border-border/60 p-2.5">
            {current.teams.map((t) => {
              const p = t.target > 0 ? Math.min(100, (t.collected / t.target) * 100) : 0;
              return (
                <div key={t.name} className="flex items-center gap-2 text-xs">
                  <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  <span className={cn("tabular-nums", p >= 100 ? "text-green-600 dark:text-green-400" : "text-foreground")}>
                    {aed(t.collected)} / {aed(t.target)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => {
              setMuted((m) => !m);
              if (!muted) try { window.speechSynthesis?.cancel(); } catch { /* nothing */ }
              else speak(current);
            }}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {muted ? "Voice off" : "Voice on"}
          </Button>
          <div className="flex gap-2">
            {current.url && (
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button asChild variant="outline" size="sm" onClick={close}>
                  <Link href={current.url}>{current.scope === "team" ? "Open team" : "Open reports"}</Link>
                </Button>
              </motion.div>
            )}
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button size="sm" onClick={close}>
                {queue.length > 1 ? `OK · next (${queue.length - 1})` : "OK"}
              </Button>
            </motion.div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
