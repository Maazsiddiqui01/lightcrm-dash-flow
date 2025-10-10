/**
 * Batch Payload Builder
 * Constructs batch payloads for Group mode email generation
 */

import { supabase } from '@/integrations/supabase/client';
import { buildEnhancedDraftPayload } from './enhancedPayload';
import { mergeEffectiveConfig } from './previewMerge';
import type { ContactOverride, BatchPayload, FilterValues } from '@/types/groupEmailBuilder';
import type { ContactEmailComposer } from '@/types/emailComposer';
import type { MasterTemplateDefaults, PhraseLibraryItem } from '@/types/phraseLibrary';
import type { InquiryLibraryItem } from '@/hooks/useInquiryLibrary';
import type { SubjectLibraryItem } from '@/hooks/useSubjectLibrary';
import type { TeamMember } from '@/components/email-builder/EditableTeam';

interface SharedSettings {
  toneOverride?: 'casual' | 'hybrid' | 'formal';
  lengthOverride?: string;
  daysSinceContact: number;
  masterTemplate: MasterTemplateDefaults;
  subjectLinePool: {
    selectedIds: string[];
    style: 'formal' | 'hybrid' | 'casual';
  };
  curatedTeam: TeamMember[];
  curatedTo: string;
  curatedCc: string[];
  selectedArticle?: string | null;
  moduleOrder: Array<any>;
  moduleStates: Record<string, any>;
  moduleSelections: Record<string, any>;
  team: TeamMember[];
  cc: string[];
}

export async function buildBatchPayload(
  contactIds: string[],
  sharedSettings: SharedSettings,
  overrides: Map<string, ContactOverride>,
  filterParams: FilterValues,
  allPhrases: PhraseLibraryItem[],
  allInquiries: InquiryLibraryItem[],
  allSubjects: SubjectLibraryItem[]
): Promise<BatchPayload> {
  const batchId = `b_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Fetch contact data
  const { data: contacts, error } = await supabase
    .from('contacts_raw')
    .select('*')
    .in('id', contactIds);

  if (error) throw error;
  if (!contacts) throw new Error('No contacts found');

  // Build individual payloads for each contact
  const items = await Promise.all(
    contacts.map(async (contact) => {
      const override = overrides.get(contact.id);

      // Merge shared settings with per-contact overrides
      // CRITICAL: Include module order from override if present
      const effectiveSettings = {
        ...sharedSettings,
        // Module order override takes precedence
        ...(override?.moduleOrder && override.moduleOrder.length > 0 && {
          moduleOrder: override.moduleOrder,
        }),
        // Module states override
        ...(override?.moduleStates && {
          moduleStates: override.moduleStates,
        }),
        // Module selections override
        ...(override?.moduleSelections && {
          moduleSelections: override.moduleSelections,
        }),
        // Recipients override
        ...(override?.recipients && {
          curatedTo: override.recipients.to,
          curatedCc: override.recipients.cc,
        }),
        // Subject pool override
        ...(override?.subjectLinePool && {
          subjectPoolOverride: override.subjectLinePool.selectedIds,
        }),
      };

      // Convert contact to ContactEmailComposer format
      // Enhanced validation: Check all required fields
      if (!contact.email_address || contact.email_address.trim() === '') {
        throw new Error(`Contact ${contact.full_name || contact.id} is missing a valid email address`);
      }
      
      if (!contact.full_name || contact.full_name.trim() === '') {
        throw new Error(`Contact ${contact.email_address} is missing a name`);
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact.email_address.trim())) {
        throw new Error(`Contact ${contact.full_name} has invalid email format: ${contact.email_address}`);
      }
      
      // Generate first_name if missing
      let firstName = contact.first_name?.trim();
      if (!firstName) {
        const nameParts = contact.full_name.trim().split(' ');
        firstName = nameParts[0] || 'there';
      }
      
      const contactForPayload: ContactEmailComposer = {
        contact_id: contact.id,
        email: contact.email_address.trim(),
        full_name: contact.full_name.trim(),
        first_name: firstName,
        organization: contact.organization?.trim() || '',
        lg_emails_cc: null,
        focus_areas: contact.lg_focus_areas_comprehensive_list
          ? contact.lg_focus_areas_comprehensive_list.split(',').map(fa => fa.trim()).filter(Boolean)
          : [],
        fa_count: 0,
        fa_sectors: [],
        fa_descriptions: [],
        gb_present: false,
        hs_present: false,
        ls_present: false,
        has_opps: false,
        opps: [],
        articles: [],
        lead_emails: [],
        assistant_names: [],
        assistant_emails: [],
        most_recent_contact: contact.most_recent_contact,
        outreach_date: contact.outreach_date,
      };

      // Merge effective config to get contact-specific module order
      const effectiveConfig = mergeEffectiveConfig(
        sharedSettings,
        overrides.get(contact.id),
        contact
      );

      // Validate and use module order from effective config, fallback to shared settings
      const finalModuleOrder = effectiveConfig.moduleOrder && 
                               Array.isArray(effectiveConfig.moduleOrder) && 
                               effectiveConfig.moduleOrder.length > 0
        ? effectiveConfig.moduleOrder
        : sharedSettings.moduleOrder;
      
      // Build enhanced payload using existing function with all params
      const payload = await buildEnhancedDraftPayload(
        contactForPayload,
        effectiveSettings.masterTemplate,
        allPhrases,
        allInquiries,
        allSubjects,
        effectiveSettings.daysSinceContact,
        effectiveSettings.selectedArticle,
        effectiveSettings.toneOverride,
        effectiveSettings.subjectPoolOverride,
        finalModuleOrder as any, // Use validated module order
        effectiveSettings.curatedTeam,
        effectiveSettings.curatedTo,
        effectiveSettings.curatedCc,
        [], // autoTeam
        contact.delta_type as 'Email' | 'Meeting' || 'Email', // deltaType
        effectiveConfig.moduleStates, // moduleStates
        effectiveConfig.moduleSelections // moduleSelections
      );

      return {
        contactId: contact.id,
        payload,
      };
    })
  );

  return {
    mode: 'group',
    batchId,
    filterParams,
    sharedSettings: {
      toneOverride: sharedSettings.toneOverride,
      lengthOverride: sharedSettings.lengthOverride,
      daysSinceContact: sharedSettings.daysSinceContact,
      masterTemplate: sharedSettings.masterTemplate,
      moduleSelections: {}, // Simplified for MVP
      moduleOrder: sharedSettings.moduleOrder || [],
      moduleStates: sharedSettings.moduleStates || {},
      subjectLinePool: sharedSettings.subjectLinePool,
    },
    items,
    meta: {
      client: 'email-builder@web',
      version: 'v2-group-batch',
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Helper to chunk array for batch processing
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
