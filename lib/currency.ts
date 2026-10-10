import { getActiveCurrency } from "./store/currencyStore";

/** Compact: $1.2M / $123K / $500 */
export function fmtCompact(n: number): string {
  const { symbol } = getActiveCurrency();
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${symbol}${(n / 1_000).toFixed(1)}K`;
  return `${symbol}${n}`;
}

/** Full: $1,234,567 */
export function fmtFull(n: number): string {
  const { symbol, locale } = getActiveCurrency();
  return `${symbol}${n.toLocaleString(locale)}`;
}

/** Intl.NumberFormat full currency string: $1,234 */
export function fmtCurrency(n: number): string {
  const { code, locale } = getActiveCurrency();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Just the symbol for the active currency */
export function getCurrencySymbol(): string {
  return getActiveCurrency().symbol;
}

/** Rupees, the Bangalore academy's money: "₹1,23,456.50". */
export function fmtINR(n: number): string {
  return `₹${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * An enrolment's money in its academy's currency (the user, 2026-10-10): a
 * Bangalore close is INR; Dubai's — and everything from before the choice —
 * shows as the rest of the screen does.
 */
export function fmtAcademy(n: number, academy?: string | null): string {
  return academy === "bangalore" ? fmtINR(n) : fmtFull(n);
}

/** AED, as a payment taken in dirhams on a Bangalore close is shown: "AED 1,000". */
export function fmtAED(n: number): string {
  return `AED ${(Number(n) || 0).toLocaleString("en-AE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * A bonus, always in US dollars: the course bonus is an MT5 bonus, given and
 * sent to finance in USD in every sales CRM (2026-10-09) — whatever currency
 * the screen shows the fees in. "$1,234.50"
 */
export function fmtUSD(n: number): string {
  return `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
