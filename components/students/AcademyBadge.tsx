import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACADEMY_LABELS, academyOf } from "@/types/student";

/**
 * Which academy an enrolment was closed for (the user, 2026-10-10) — Dubai or
 * Bangalore. Shown on the student and enrolment pages; an enrolment from before
 * the choice is Dubai's.
 */
export function AcademyBadge({ academy, className }: { academy?: string | null; className?: string }) {
  const a = academyOf(academy);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        a === "bangalore"
          ? "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
          : "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
        className,
      )}
      title={a === "bangalore" ? "Bangalore academy — fees in INR" : "Dubai academy"}
    >
      <MapPin className="h-2.5 w-2.5" />
      {ACADEMY_LABELS[a]}
    </span>
  );
}
