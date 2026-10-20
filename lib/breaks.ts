/** What a break is for — picked when "Take break" is pressed (the user, 2026-10-20). Every kind stops new leads the same. */
export const BREAK_KINDS = [
  { value: "meeting", label: "Meeting", emoji: "🤝" },
  { value: "lunch", label: "Lunch", emoji: "🍽️" },
  { value: "tea", label: "Tea", emoji: "☕" },
  { value: "washroom", label: "Washroom", emoji: "🚻" },
] as const;

export type BreakKind = (typeof BREAK_KINDS)[number]["value"];

/** "Lunch break", or "Break" when the kind isn't known (breaks from before kinds). */
export function breakLabel(kind?: string | null): string {
  const k = BREAK_KINDS.find((b) => b.value === kind);
  return k ? `${k.label} break` : "Break";
}
