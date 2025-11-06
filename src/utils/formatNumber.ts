/**
 * Number formatting utility
 * Extracted from utils.ts for better organization
 */

export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseInt(value) : value;
  if (isNaN(num)) return value.toString();
  return num.toLocaleString();
}
