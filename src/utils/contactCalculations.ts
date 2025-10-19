import { format, addDays, differenceInDays } from 'date-fns';
import { parseFlexibleDate } from '@/utils/dateUtils';

/**
 * Calculate days over/under max lag for a contact
 * Formula: (Most Recent Contact + Max Lag Days) - Today
 * 
 * @param mostRecentContact - The most recent contact date (ISO string)
 * @param maxLagDays - Maximum lag days (delta field)
 * @returns Number of days remaining (positive) or overdue (negative), or null if data is missing
 */
export function calculateDaysOverUnderMaxLag(
  mostRecentContact: string | null,
  maxLagDays: number | null
): number | null {
  // Return null if either required field is missing or zero
  if (!mostRecentContact || !maxLagDays || maxLagDays === 0) {
    return null;
  }

  try {
    const today = new Date();
    const contactDate = parseFlexibleDate(mostRecentContact);
    if (!contactDate) return null;
    const nextContactDue = addDays(contactDate, maxLagDays);
    
    // Calculate difference: (outreach date) - today
    // Positive means still have time, negative means overdue
    return differenceInDays(nextContactDue, today);
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
 * Positive = still have time (green), Negative = overdue (red)
 */
export function getDaysOverUnderColorClass(days: number | null): string {
  if (days === null || days === 0) return '';
  return days > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
}

/**
 * Check if a contact should be excluded from overdue calculations
 */
export function isIntentionallySkipped(contact: { intentional_no_outreach?: boolean | null }): boolean {
  return Boolean(contact.intentional_no_outreach);
}

/**
 * Calculate effective outreach data for a contact
 * Prioritizes group values if contact is in a group, otherwise uses individual values
 */
export function calculateEffectiveOutreachData(contact: {
  group_contact?: string | null;
  most_recent_contact?: string | null;
  most_recent_group_contact?: string | null;
  delta?: number | null;
  group_delta?: number | null;
}) {
  const isGroup = !!contact.group_contact;
  
  return {
    effectiveMostRecentContact: isGroup 
      ? contact.most_recent_group_contact 
      : contact.most_recent_contact,
    effectiveMaxLagDays: isGroup 
      ? contact.group_delta 
      : contact.delta,
    isUsingGroupValues: isGroup
  };
}