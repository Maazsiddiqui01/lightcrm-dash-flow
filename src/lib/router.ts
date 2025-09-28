/**
 * Router utilities for Email Builder Master Templates and Case routing
 */

export function daysSince(d?: string | null): number {
  if (!d) return 9999;
  const t = new Date(d).getTime();
  return Math.max(0, Math.round((Date.now() - t) / 86400000));
}

export function routeCase(gb_present: boolean, fa_count: number, has_opps: boolean): string {
  if (gb_present) {
    return has_opps ? (fa_count <= 1 ? 'case_5' : 'case_6') : (fa_count <= 1 ? 'case_1' : 'case_2');
  }
  return has_opps ? (fa_count <= 2 ? 'case_7' : 'case_8') : (fa_count <= 1 ? 'case_3' : 'case_4');
}

export interface MasterTemplate {
  master_key: 'relationship_maintenance' | 'hybrid_neutral' | 'business_development';
  tone: 'casual' | 'hybrid' | 'formal';
  subject_style: 'casual' | 'mixed' | 'formal';
}

export function routeMaster(mostRecent?: string | null): MasterTemplate {
  const d = daysSince(mostRecent);
  if (d <= 45) return { master_key: 'relationship_maintenance', tone: 'casual', subject_style: 'casual' };
  if (d <= 60) return { master_key: 'hybrid_neutral', tone: 'hybrid', subject_style: 'mixed' };
  return { master_key: 'business_development', tone: 'formal', subject_style: 'formal' };
}

export const MASTER_TEMPLATES: Record<string, { label: string; description: string }> = {
  relationship_maintenance: {
    label: 'Relationship Maintenance',
    description: 'Casual tone for recent contacts'
  },
  hybrid_neutral: {
    label: 'Hybrid Neutral',
    description: 'Balanced approach for periodic contacts'
  },
  business_development: {
    label: 'Business Development',
    description: 'Formal tone for new outreach'
  }
};

export const CASE_LABELS: Record<string, string> = {
  case_1: 'GB + No Opps + 1 FA',
  case_2: 'GB + No Opps + 2+ FA',
  case_3: 'No GB + No Opps + 1 FA',
  case_4: 'No GB + No Opps + 2+ FA',
  case_5: 'GB + Has Opps + 1 FA',
  case_6: 'GB + Has Opps + 2+ FA',
  case_7: 'No GB + Has Opps + 1-2 FA',
  case_8: 'No GB + Has Opps + 3+ FA'
};