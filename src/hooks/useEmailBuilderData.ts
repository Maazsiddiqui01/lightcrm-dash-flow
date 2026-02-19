// @ts-nocheck - Supabase type inference causes deep instantiation errors
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

async function fetchEmailBuilderData(contactId: string) {
  // Fetch contact
  const { data: contactData, error: contactError } = await supabase
    .from('contacts_raw')
    .select('id, full_name, first_name, email_address, organization, email_cc, most_recent_contact, latest_contact_email, latest_contact_meeting, outreach_date, delta_type, all_opps, lg_focus_areas_comprehensive_list')
    .eq('id', contactId)
    .maybeSingle();
  
  if (contactError) throw contactError;
  if (!contactData) return null;

  // Parse focus areas
  const focus_areas = contactData.lg_focus_areas_comprehensive_list
    ? contactData.lg_focus_areas_comprehensive_list.split(',').map(fa => fa.trim()).filter(Boolean)
    : [];

  // Calculate lag
  const lag = contactData.most_recent_contact
    ? Math.max(0, Math.floor((Date.now() - new Date(contactData.most_recent_contact).getTime()) / (1000 * 60 * 60 * 24)))
    : 999;

  if (focus_areas.length === 0) {
    // Return early with minimal data if no focus areas
    const { data: oppsData } = await supabase
      .from('opportunities_raw')
      .select('deal_name, ebitda_in_ms')
      .or(`deal_source_individual_1.eq.${contactData.full_name},deal_source_individual_2.eq.${contactData.full_name}`)
      .eq('tier', 'Tier 1')
      .eq('status', 'Active')
      .order('ebitda_in_ms', { ascending: false })
      .limit(10);

    return {
      contact: contactData,
      focus_areas: [],
      lag,
      descriptions: [],
      articles: [],
      directory: [],
      opportunities: oppsData || []
    };
  }

  // Fetch all dependent data in parallel - using type assertions to avoid TS deep instantiation issue
  const descriptionsQuery = supabase.from('focus_area_description').select('"LG Focus Area", "Description", "LG Sector", "Platform / Add-On", "Existing Platform (for Add-Ons)"').in('"LG Focus Area"', focus_areas) as any;
  const articlesQuery = supabase.from('articles').select('focus_area, article_link, Title').in('focus_area', focus_areas).gte('added_date', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()) as any;
  const directoryQuery = supabase.from('lg_focus_area_directory').select('focus_area, lead1_name, lead1_email, lead2_name, lead2_email, assistant_name, assistant_email').in('focus_area', focus_areas) as any;
  const oppsQuery = supabase.from('opportunities_raw').select('deal_name, ebitda_in_ms').or(`deal_source_individual_1.eq.${contactData.full_name},deal_source_individual_2.eq.${contactData.full_name}`).eq('tier', 'Tier 1').eq('status', 'Active').order('ebitda_in_ms', { ascending: false }).limit(10) as any;
  
  const [descriptionsRes, articlesRes, directoryRes, oppsRes] = await Promise.all([
    descriptionsQuery,
    articlesQuery,
    directoryQuery,
    oppsQuery
  ]);

  return {
    contact: contactData,
    focus_areas,
    lag,
    descriptions: descriptionsRes.data || [],
    articles: articlesRes.data || [],
    directory: directoryRes.data || [],
    opportunities: oppsRes.data || []
  };
}

export function useEmailBuilderData(contactId: string | null, template: EmailTemplate | null) {
  const consolidatedQuery = useQuery({
    queryKey: ['email_builder_consolidated', contactId],
    queryFn: () => fetchEmailBuilderData(contactId!),
    enabled: !!contactId,
    staleTime: 1000 * 60 * 2,
  });

  const data = consolidatedQuery.data;
  const contact = data?.contact;
  const focusAreas = data?.focus_areas || [];
  const lag = data?.lag;
  const opportunities = data?.opportunities || [];
  const focusAreaDescriptions = data?.descriptions || [];
  const articles = data?.articles || [];
  const focusAreaDirectory = data?.directory || [];

  const payload = useQuery({
    queryKey: ['email_builder_payload', contactId, template?.id, data],
    queryFn: async (): Promise<EmailBuilderPayload | null> => {
      if (!contact || !template) return null;

      const assistantNames: string[] = contact.delta_type === 'Meeting'
        ? Array.from(new Set(focusAreaDirectory.map((d: any) => d.assistant_name).filter(Boolean))) as string[]
        : [];

      const ccEmails = Array.from(new Set([
        ...focusAreaDirectory.flatMap((d: any) => [d.lead1_email, d.lead2_email, d.assistant_email]),
        contact.email_cc
      ].filter(Boolean)));

      const mergedDescriptions = focusAreaDescriptions.map((d: any) => ({
        focus_area: d['LG Focus Area'] || '',
        description: d['Description'] || '',
        sector: d['LG Sector'] || '',
        platform_type: d['Platform / Add-On'] as 'New Platform' | 'Add-On' | undefined
      }));

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
        opps: opportunities.map((opp: any) => opp.deal_name).filter(Boolean),
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
        articles: articles.map((article: any) => ({
          focus_area: article.focus_area,
          article_link: article.article_link,
        })),
      };
    },
    enabled: !!(contact && template && !consolidatedQuery.isLoading),
  });

  return {
    contact,
    lag,
    opportunities,
    focusAreaDescriptions,
    articles,
    focusAreaDirectory,
    payload: payload.data,
    isLoading: consolidatedQuery.isLoading || payload.isLoading,
    error: consolidatedQuery.error || payload.error,
  };
}
