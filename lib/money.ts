/**
 * Format an integer rupiah amount into "Rp 12.345" style.
 * We store all money as integer rupiah (no cents) to avoid float issues.
 */
export function formatRupiah(amount: number): string {
  const safe = Math.trunc(amount);
  const sign = safe < 0 ? "-" : "";
  const digits = Math.abs(safe).toString();
  const withDots = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}Rp ${withDots}`;
}

/**
 * Parse a user-entered rupiah string (may include dots/commas/"Rp") into an integer.
 * Returns null when the input is not a valid non-negative integer.
 */
export function parseRupiahInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9]/g, "");
  if (cleaned.length === 0) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}
