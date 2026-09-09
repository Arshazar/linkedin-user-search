/**
 * Normalizes variable date strings into ISO YYYY-MM-DD format or null.
 * 
 * Supports:
 * - YYYY (e.g. '2005') -> '2005-01-01'
 * - YYYY-MM (e.g. '2019-10') -> '2019-10-01'
 * - YYYY-MM-DD (e.g. '2015-10-01') -> '2015-10-01'
 * - Empty string / invalid -> null
 */
export function normalizeDate(dateStr?: string | null): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed === 'None' || trimmed === 'null') return null;

  // Pattern: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Pattern: YYYY-MM
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }

  // Pattern: YYYY
  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed}-01-01`;
  }

  // Try parsing standard Date string if format differs (e.g., MM/DD/YYYY)
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getUTCFullYear();
    const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}
