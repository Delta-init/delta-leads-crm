import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date string for display in AED (Gulf Standard Time, UTC+4) */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-AE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Dubai",
  });
}

/** Return today's date as YYYY-MM-DD in AED timezone */
export function todayAED(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Dubai" });
}

/** Format a full datetime for display in AED (GST) */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-AE", {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }) + " GST";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Format a Date as "YYYY-MM-DD" in GST (Asia/Dubai) — timezone-safe.
 * Never use `.toISOString().slice(0, 10)` for filter dates: it converts to
 * UTC first, which shifts local midnight back to the previous day.
 */
export function toGstDateISO(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
}

/** Today's date as "YYYY-MM-DD" in GST. */
export function gstTodayISO(): string {
  return toGstDateISO(new Date());
}

/**
 * First day of the current week / month / quarter / year on the GST calendar,
 * as "YYYY-MM-DD". Works from GST's date, not the device's, so a phone set to
 * India time near midnight still gets the same range as the server counts.
 * Weeks start Monday unless `weekStartsSunday` is set.
 */
export function gstPeriodStartISO(
  period: "week" | "month" | "quarter" | "year",
  weekStartsSunday = false,
): string {
  const [y, m, d] = gstTodayISO().split("-").map(Number);
  let start: Date;
  if (period === "week") {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
    const back = weekStartsSunday ? dow : (dow + 6) % 7;
    start = new Date(Date.UTC(y, m - 1, d - back));
  } else if (period === "month") {
    start = new Date(Date.UTC(y, m - 1, 1));
  } else if (period === "quarter") {
    start = new Date(Date.UTC(y, Math.floor((m - 1) / 3) * 3, 1));
  } else {
    start = new Date(Date.UTC(y, 0, 1));
  }
  return start.toISOString().slice(0, 10); // a UTC-midnight date, so this is exact
}
