import { useMemo } from 'react';
import type { ContactOverride, EffectiveConfig } from '@/types/groupEmailBuilder';
import { mergeEffectiveConfig } from '@/lib/previewMerge';
import type { ModuleSelections } from '@/types/moduleSelections';
import type { MasterTemplateDefaults } from '@/types/phraseLibrary';
import type { TeamMember } from '@/components/email-builder/EditableTeam';
import type { TriState } from '@/types/phraseLibrary';

interface SharedSettings {
  toneOverride?: string;
  lengthOverride?: string;
  daysSinceContact: number;
  masterTemplate: MasterTemplateDefaults;
  moduleSelections: ModuleSelections;
  moduleOrder: Array<keyof ModuleSelections>;
  moduleStates: Record<string, TriState>;
  subjectLinePool: {
    selectedIds: string[];
    style: 'formal' | 'hybrid' | 'casual';
  };
  team: TeamMember[];
  cc: string[];
}

interface ContactData {
  id: string;
  email_address: string;
  organization: string;
  lg_focus_areas_comprehensive_list?: string;
  first_name?: string;
  full_name?: string;
}

/**
 * Hook to compute effective preview configuration for a contact
 * Merges shared settings with contact-specific overrides
 */
export function useContactPreview(
  contactData: ContactData | null,
  sharedSettings: SharedSettings,
  contactOverride: ContactOverride | undefined
): EffectiveConfig | null {
  return useMemo(() => {
    if (!contactData) return null;

    return mergeEffectiveConfig(sharedSettings, contactOverride, contactData);
  }, [contactData, sharedSettings, contactOverride]);
}
