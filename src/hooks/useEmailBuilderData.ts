import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useContactLag } from './useContactLag';
import { useContactTopOpps } from './useContactTopOpps';
import { useFocusAreaDescriptions } from './useFocusAreaDescriptions';
import { useArticlesByFocusAreas } from './useArticlesByFocusAreas';
import type { EmailTemplate } from './useEmailTemplates';

export interface EmailBuilderPayload {
  contact: {
    firstName: string;
    fullName: string;
    email: string;
    organization: string;
    lgEmailsCc: string;
  };
  focusAreas: string[];
  focusAreaDescriptions: Array<{
    focus_area: string;
    description: string;
    sector: string;
    platform_type?: 'New Platform' | 'Add-On';
  }>;
  opps: string[];
  assistantNames: string[];
  delta_type: 'Email' | 'Meeting';
  mostRecentContact: string;
  OutreachDate: string;
  template: {
    id: string;
    name: string;
    description?: string;
    is_preset: boolean;
    customInstructions?: string;
    customInsertion?: 'before_closing' | 'after_open' | 'after_fa';
  };
  articles?: Array<{
    focus_area: string;
    article_link: string;
  }>;
}

export function useEmailBuilderData(contactId: string | null, template: EmailTemplate | null) {
  // Base contact query
  const contactQuery = useQuery({
    queryKey: ['contact_email_builder', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      
      const { data, error } = await supabase
        .from('contacts_raw')
        .select(`
          id,
          full_name,
          first_name,
          email_address,
          organization,
          email_cc,
          most_recent_contact,
          outreach_date,
          all_opps,
          lg_focus_areas_comprehensive_list,
          delta_type
        `)
        .eq('id', contactId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });

  // Parse focus areas from contact data
  const focusAreas = contactQuery.data?.lg_focus_areas_comprehensive_list
    ? contactQuery.data.lg_focus_areas_comprehensive_list
        .split(',')
        .map(fa => fa.trim())
        .filter(Boolean)
    : [];

  // Dependent queries
  const lagQuery = useContactLag(contactId);
  const oppsQuery = useContactTopOpps(contactId);
  const focusAreaDescriptionsQuery = useFocusAreaDescriptions(focusAreas);
  const articlesQuery = useArticlesByFocusAreas(focusAreas);

  // Focus area directory query for leads/assistants
  const focusAreaDirectoryQuery = useQuery({
    queryKey: ['focus_area_directory', focusAreas],
    queryFn: async () => {
      if (!focusAreas.length) return [];
      
      const { data, error } = await supabase
        .from('lg_focus_area_directory')
        .select('*')
        .in('focus_area', focusAreas);
      
      if (error) throw error;
      return data || [];
    },
    enabled: focusAreas.length > 0,
  });

  // Sector mapping query for focus areas
  const sectorMappingQuery = useQuery({
    queryKey: ['focus_area_sectors', focusAreas],
    queryFn: async () => {
      if (!focusAreas.length) return [];
      
      const { data, error } = await supabase
        .from('lookup_focus_areas')
        .select('label, sector_id')
        .in('label', focusAreas);
      
      if (error) throw error;
      return data || [];
    },
    enabled: focusAreas.length > 0,
  });

  // Compute final payload
  const payload = useQuery({
    queryKey: [
      'email_builder_payload',
      contactId,
      template?.id,
      contactQuery.data,
      lagQuery.data,
      oppsQuery.data,
      focusAreaDescriptionsQuery.data,
      articlesQuery.data,
      focusAreaDirectoryQuery.data,
      sectorMappingQuery.data,
    ],
    queryFn: async (): Promise<EmailBuilderPayload | null> => {
      if (!contactQuery.data || !template) return null;

      const contact = contactQuery.data;
      const directory = focusAreaDirectoryQuery.data || [];
      const descriptions = focusAreaDescriptionsQuery.data || [];
      const sectors = sectorMappingQuery.data || [];
      const opps = oppsQuery.data || [];
      const articles = articlesQuery.data || [];

      // Collect unique assistant names (only if delta_type is Meeting)
      const assistantNames = contact.delta_type === 'Meeting'
        ? Array.from(new Set(
            directory
              .map(d => d.assistant_name)
              .filter(Boolean)
          ))
        : [];

      // Collect CC emails from directory
      const ccEmails = Array.from(new Set([
        ...directory.flatMap(d => [d.lead1_email, d.lead2_email, d.assistant_email]),
        contact.email_cc
      ].filter(Boolean)));

      // Map descriptions with sectors and platform types
      const mappedDescriptions = descriptions.map(desc => {
        const sector = sectors.find(s => s.label === desc.focus_area)?.sector_id || '';
        return {
          focus_area: desc.focus_area,
          description: desc.description,
          sector,
          platform_type: desc.platform_type as 'New Platform' | 'Add-On' | undefined,
        };
      });

      // Handle duplicate focus areas by merging, preferring "New Platform" over "Add-On"
      const mergedDescriptions = mappedDescriptions.reduce((acc, curr) => {
        const existing = acc.find(item => item.focus_area === curr.focus_area);
        if (existing) {
          // Prefer "New Platform" over "Add-On" or undefined
          if (curr.platform_type === 'New Platform' || 
              (curr.platform_type === 'Add-On' && !existing.platform_type)) {
            existing.platform_type = curr.platform_type;
          }
          // Merge descriptions if different
          if (curr.description && curr.description !== existing.description) {
            existing.description = [existing.description, curr.description]
              .filter(Boolean)
              .join(' | ');
          }
        } else {
          acc.push({ ...curr });
        }
        return acc;
      }, [] as typeof mappedDescriptions);

      return {
        contact: {
          firstName: contact.first_name || '',
          fullName: contact.full_name || '',
          email: contact.email_address || '',
          organization: contact.organization || '',
          lgEmailsCc: ccEmails.join('; '),
        },
        focusAreas,
        focusAreaDescriptions: mergedDescriptions,
      opps: opps
        .map(opp => opp.deal_name)
        .filter(Boolean), // No slice - include all active tier 1 opps
        assistantNames,
        delta_type: (contact.delta_type as 'Email' | 'Meeting') || 'Email',
        mostRecentContact: contact.most_recent_contact 
          ? new Date(contact.most_recent_contact).toISOString()
          : '0',
        OutreachDate: contact.outreach_date 
          ? new Date(contact.outreach_date).toISOString()
          : new Date().toISOString(),
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          is_preset: template.is_preset,
          customInstructions: template.custom_instructions,
          customInsertion: template.custom_insertion as any,
        },
        articles: articles.map(article => ({
          focus_area: article.focus_area,
          article_link: article.article_link,
        })),
      };
    },
    enabled: !!(contactQuery.data && template && 
      !lagQuery.isLoading && 
      !oppsQuery.isLoading && 
      !focusAreaDescriptionsQuery.isLoading && 
      !articlesQuery.isLoading && 
      !focusAreaDirectoryQuery.isLoading && 
      !sectorMappingQuery.isLoading),
  });

  return {
    contact: contactQuery.data,
    lag: lagQuery.data,
    opportunities: oppsQuery.data,
    focusAreaDescriptions: focusAreaDescriptionsQuery.data,
    articles: articlesQuery.data,
    focusAreaDirectory: focusAreaDirectoryQuery.data,
    payload: payload.data,
    isLoading: contactQuery.isLoading || 
               lagQuery.isLoading || 
               oppsQuery.isLoading || 
               focusAreaDescriptionsQuery.isLoading || 
               articlesQuery.isLoading || 
               focusAreaDirectoryQuery.isLoading || 
               sectorMappingQuery.isLoading ||
               payload.isLoading,
    error: contactQuery.error || 
           lagQuery.error || 
           oppsQuery.error || 
           focusAreaDescriptionsQuery.error || 
           articlesQuery.error || 
           focusAreaDirectoryQuery.error ||
           sectorMappingQuery.error ||
           payload.error,
  };
}