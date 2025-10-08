/**
 * Client-side logic to merge shared settings with contact-specific overrides
 * to compute the effective configuration for a contact in Group mode.
 */

import type { ContactOverride, EffectiveConfig } from '@/types/groupEmailBuilder';
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
 * Merges shared settings with contact-specific overrides to produce the effective config
 */
export function mergeEffectiveConfig(
  sharedSettings: SharedSettings,
  contactOverride: ContactOverride | undefined,
  contactData: ContactData
): EffectiveConfig {
  // Master Template - return the whole template
  const effectiveMasterTemplate = contactOverride?.masterTemplate
    ? sharedSettings.masterTemplate // For now, keep the shared template even if override exists
    : sharedSettings.masterTemplate;

  // Core Settings
  const effectiveTone = contactOverride?.coreSettings?.tone || sharedSettings.toneOverride || 'hybrid';
  const effectiveLength = contactOverride?.coreSettings?.length || sharedSettings.lengthOverride || 'standard';
  const effectiveDaysSince = contactOverride?.coreSettings?.daysSince ?? sharedSettings.daysSinceContact;

  // Subject Line Pool
  const effectiveSubjectPool = contactOverride?.subjectLinePool || sharedSettings.subjectLinePool;

  // Module Selections
  const effectiveModuleSelections = contactOverride?.moduleSelections || sharedSettings.moduleSelections;

  // Module Order - contact override takes priority
  const effectiveModuleOrder = (contactOverride?.moduleOrder || sharedSettings.moduleOrder) as any;

  // Team
  const effectiveTeam = contactOverride?.team || sharedSettings.team;

  // Recipients
  const effectiveTo = contactOverride?.recipients?.to || contactData.email_address;
  const effectiveCc = contactOverride?.recipients?.cc || sharedSettings.cc;

  // Parse focus areas
  const focusAreasStr = contactData.lg_focus_areas_comprehensive_list || '';
  const focusAreas = focusAreasStr
    .split(',')
    .map(fa => fa.trim())
    .filter(Boolean);

  return {
    masterTemplate: effectiveMasterTemplate,
    coreSettings: {
      tone: effectiveTone,
      length: effectiveLength,
      daysSince: effectiveDaysSince,
    },
    subjectLinePool: effectiveSubjectPool,
    moduleSelections: effectiveModuleSelections,
    moduleOrder: effectiveModuleOrder, // Use merged module order
    moduleStates: sharedSettings.moduleStates,
    team: effectiveTeam,
    recipients: {
      to: effectiveTo,
      cc: effectiveCc,
    },
    contactInfo: {
      organization: contactData.organization || '',
      focusAreas,
      topOpps: [], // Will be fetched separately if needed
    },
  };
}
