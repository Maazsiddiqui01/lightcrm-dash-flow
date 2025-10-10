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
 * HIGH-9 fix: Added deep merge validation for moduleSelections and proper fallbacks
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

  // Subject Line Pool - validate structure
  const effectiveSubjectPool = contactOverride?.subjectLinePool && 
                                Array.isArray(contactOverride.subjectLinePool.selectedIds) &&
                                contactOverride.subjectLinePool.selectedIds.length > 0
    ? contactOverride.subjectLinePool
    : sharedSettings.subjectLinePool;

  // Module Selections - deep merge with validation (HIGH-9 fix)
  const effectiveModuleSelections = contactOverride?.moduleSelections && 
                                     typeof contactOverride.moduleSelections === 'object' &&
                                     Object.keys(contactOverride.moduleSelections).length > 0
    ? { ...sharedSettings.moduleSelections, ...contactOverride.moduleSelections }
    : sharedSettings.moduleSelections;

  // Module Order - validate array structure (HIGH-9 fix)
  const effectiveModuleOrder = contactOverride?.moduleOrder && 
                                Array.isArray(contactOverride.moduleOrder) && 
                                contactOverride.moduleOrder.length > 0
    ? contactOverride.moduleOrder
    : sharedSettings.moduleOrder;

  // Module States - with validation (HIGH-9 fix)
  const effectiveModuleStates = contactOverride?.moduleStates &&
                                 typeof contactOverride.moduleStates === 'object' &&
                                 Object.keys(contactOverride.moduleStates).length > 0
    ? { ...sharedSettings.moduleStates, ...contactOverride.moduleStates }
    : sharedSettings.moduleStates;

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
    moduleOrder: effectiveModuleOrder as any, // Use validated merged order
    moduleStates: effectiveModuleStates, // Use validated merged states (HIGH-9 fix)
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
