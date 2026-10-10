"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coffee, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyBreak, useSetBreak } from "@/hooks/useBreak";

/**
 * "Take break" in the header (the user, 2026-10-10): while on a break no new
 * leads come from a team that splits by HRMS attendance. Shows how long the
 * break has run; one click ends it. A break ends with the GST day too.
 */
export function BreakButton() {
  const { data } = useMyBreak();
  const { mutate, isPending } = useSetBreak();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!data?.onBreak) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [data?.onBreak]);

  const onBreak = !!data?.onBreak;
  const mins = onBreak && data?.since ? Math.max(0, Math.floor((now - new Date(data.since).getTime()) / 60_000)) : 0;
  const length = mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={() => mutate(!onBreak)}
      disabled={isPending || !data}
      title={onBreak ? "End your break — new leads come to you again" : "Take a break — no new leads until you end it"}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:opacity-60",
        onBreak
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
          : "border-border text-muted-foreground hover:text-foreground dark:bg-muted/40",
      )}
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Coffee className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{onBreak ? `On break · ${length} — End` : "Take break"}</span>
    </motion.button>
  );
}
