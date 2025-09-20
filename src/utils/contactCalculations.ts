import { format, addDays, differenceInDays, parseISO } from 'date-fns';

/**
 * Calculate days over/under max lag for a contact
 * Formula: Today - (Most Recent Contact + Max Lag Days)
 * 
 * @param mostRecentContact - The most recent contact date (ISO string)
 * @param maxLagDays - Maximum lag days (delta field)
 * @returns Number of days over (positive) or under (negative) max lag, or null if data is missing
 */
export function calculateDaysOverUnderMaxLag(
  mostRecentContact: string | null,
  maxLagDays: number | null
): number | null {
  // Return null if either required field is missing
  if (!mostRecentContact || !maxLagDays) {
    return null;
  }

  try {
    const today = new Date();
    const contactDate = parseISO(mostRecentContact);
    const nextContactDue = addDays(contactDate, maxLagDays);
    
    // Calculate difference: positive means overdue, negative means still have time
    return differenceInDays(today, nextContactDue);
  } catch (error) {
    console.warn('Error calculating days over/under max lag:', error);
    return null;
  }
}

/**
 * Format the days over/under value with proper sign
 */
export function formatDaysOverUnder(days: number | null): string {
  if (days === null) return '—';
  if (days === 0) return '0';
  return days > 0 ? `+${days}` : `${days}`;
}

/**
 * Get color class for days over/under value
 */
export function getDaysOverUnderColorClass(days: number | null): string {
  if (days === null || days === 0) return '';
  return days > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
}