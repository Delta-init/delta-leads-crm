"use client";
import { Eye, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store/authStore";
import { useImpersonate } from "@/hooks/useUsers";
import { canViewAs } from "@/lib/impersonation";
import { cn } from "@/lib/utils";
import type { Role, User } from "@/types";

interface ViewAsButtonProps {
  userId: string;
  name: string;
  status?: User["status"];
  role?: Pick<Role, "roleName" | "isSystemRole"> | null;
  className?: string;
}

/**
 * The Users page's "View as" eye, for any list of people (rankings, team
 * reports). Shown only when the same rule allows it: a super admin, not
 * already viewing, looking at an active user who isn't themselves or a super
 * admin. The server checks all of this again.
 */
export function ViewAsButton({ userId, name, status, role, className }: ViewAsButtonProps) {
  const me = useAuthStore((s) => s.user);
  const impersonate = useImpersonate();
  if (!status || !canViewAs(me, { _id: userId, status, role: (role ?? "") as Role | string })) return null;

  const busy = impersonate.isPending;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      title={`View as ${name} — 30 minutes, view only`}
      aria-label={`View as ${name}`}
      disabled={busy}
      onClick={(e) => { e.stopPropagation(); impersonate.mutate(userId); }}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:opacity-50",
        className,
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
    </motion.button>
  );
}
