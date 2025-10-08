import { useMemo } from 'react';
import { useTemplateSettings } from './useTemplateSettings';
import { useContactSettings } from './useContactSettings';
import type { ModuleStates } from '@/components/email-builder/ModulesCard';
import type { TemplateSettings } from '@/types/phraseLibrary';
import type { ContactSettings } from './useContactSettings';

export type SettingSource = 'global' | 'contact';

export interface EffectiveSettings {
  // Core Settings
  toneOverride: string | null;
  lengthOverride: string | null;
  daysSinceContact: number;
  subjectPoolOverride: string[];
  
  // Module configuration
  moduleStates: ModuleStates;
  moduleOrder: string[] | null;
  moduleSelections: Record<string, any> | null;
  
  // Recipients & Team
  curatedRecipients: ContactSettings['curated_recipients'];
  
  // Source tracking
  _sources: {
    coreSettings: SettingSource;
    moduleStates: SettingSource;
    moduleOrder: SettingSource;
    moduleSelections: SettingSource;
    recipients: SettingSource;
    team: SettingSource;
  };
  
  // Metadata
  globalRevision?: number;
  contactOverrideRevision?: number;
}

/**
 * Computes effective settings by merging global template defaults with contact-specific overrides
 * Contact overrides always win over global defaults
 */
export function useEffectiveSettings(
  contactId: string | null,
  templateId: string | null
) {
  const { data: globalSettings, isLoading: globalLoading } = useTemplateSettings(templateId);
  const { settings: contactOverride, isLoading: contactLoading } = useContactSettings(contactId);

  const effectiveSettings = useMemo<EffectiveSettings | null>(() => {
    if (!globalSettings) return null;

    // Start with global defaults
    const effective: EffectiveSettings = {
      toneOverride: globalSettings.tone_override,
      lengthOverride: globalSettings.length_override,
      daysSinceContact: 0, // Default
      subjectPoolOverride: globalSettings.subject_pool_override ? [globalSettings.subject_pool_override] : [],
      moduleStates: globalSettings.module_states as unknown as ModuleStates,
      moduleOrder: (globalSettings as any).module_order || null,
      moduleSelections: null,
      curatedRecipients: null,
      _sources: {
        coreSettings: 'global',
        moduleStates: 'global',
        moduleOrder: 'global',
        moduleSelections: 'global',
        recipients: 'global',
        team: 'global',
      },
      globalRevision: (globalSettings as any).revision,
      contactOverrideRevision: undefined,
    };

    // Apply contact overrides if they exist
    if (contactOverride) {
      // Core Settings - only tone/length can be overridden at contact level
      if (contactOverride.delta_type) {
        // Delta type affects core behavior but isn't directly a "setting"
        effective._sources.coreSettings = 'contact';
      }

      // Module States
      if (contactOverride.module_states) {
        effective.moduleStates = contactOverride.module_states;
        effective._sources.moduleStates = 'contact';
      }

      // Module Order
      if (contactOverride.module_order) {
        effective.moduleOrder = contactOverride.module_order;
        effective._sources.moduleOrder = 'contact';
      }

      // Module Selections
      if (contactOverride.module_selections) {
        effective.moduleSelections = contactOverride.module_selections;
        effective._sources.moduleSelections = 'contact';
      }

      // Recipients & Team
      if (contactOverride.curated_recipients) {
        effective.curatedRecipients = contactOverride.curated_recipients;
        effective._sources.recipients = 'contact';
        if (contactOverride.curated_recipients.team) {
          effective._sources.team = 'contact';
        }
      }

      effective.contactOverrideRevision = (contactOverride as any).revision;
    }

    return effective;
  }, [globalSettings, contactOverride]);

  return {
    effectiveSettings,
    globalSettings,
    contactOverride,
    isLoading: globalLoading || contactLoading,
  };
}
