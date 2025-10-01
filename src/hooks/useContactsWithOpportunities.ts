import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContactWithOpportunities {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email_address: string | null;
  phone: string | null;
  title: string | null;
  organization: string | null;
  areas_of_specialization: string | null;
  lg_sector: string | null;
  lg_focus_area_1: string | null;
  lg_focus_area_2: string | null;
  lg_focus_area_3: string | null;
  lg_focus_area_4: string | null;
  lg_focus_area_5: string | null;
  lg_focus_area_6: string | null;
  lg_focus_area_7: string | null;
  lg_focus_area_8: string | null;
  lg_focus_areas_comprehensive_list: string | null;
  category: string | null;
  contact_type: string | null;
  delta_type: string | null;
  notes: string | null;
  url_to_online_bio: string | null;
  most_recent_contact: string | null;
  latest_contact_email: string | null;
  latest_contact_meeting: string | null;
  outreach_date: string | null;
  email_subject: string | null;
  meeting_title: string | null;
  total_of_contacts: number | null;
  of_emails: number | null;
  of_meetings: number | null;
  delta: number | null;
  days_since_last_email: number | null;
  days_since_last_meeting: number | null;
  no_of_lg_focus_areas: number | null;
  all_opps: number | null;
  no_of_opps_sourced: number | null;
  email_from: string | null;
  email_to: string | null;
  email_cc: string | null;
  meeting_from: string | null;
  meeting_to: string | null;
  meeting_cc: string | null;
  all_emails: string | null;
  city: string | null;
  state: string | null;
  created_at: string | null;
  updated_at: string | null;
  lg_lead: string | null; // Added new column
  lg_assistant: string | null; // Added new column
  group_contact: string | null;
  intentional_no_outreach: boolean | null;
  intentional_no_outreach_date: string | null;
  intentional_no_outreach_note: string | null;
  opportunities: string; // Comma-separated deal names or empty string
  mapped_sectors?: string; // Computed field for sectors mapped from focus areas
}

interface OpportunityFilters {
  tier?: string[];
  platformAddon?: string[];
  ownershipType?: string[];
  status?: string[];
  lgLead?: string[];
  dateRangeStart?: string;
  dateRangeEnd?: string;
  ebitdaMin?: number;
  ebitdaMax?: number;
}

interface ContactFilters {
  focusAreas?: string[];
  sectors?: string[];
  areasOfSpecialization?: string[];
  organizations?: string[];
  titles?: string[];
  categories?: string[];
  deltaType?: string[];
  hasOpportunities?: string[];
  lgLead?: string[];
  groupContacts?: string[];
  mostRecentContactStart?: string;
  mostRecentContactEnd?: string;
  deltaMin?: number;
  deltaMax?: number;
  opportunityFilters?: OpportunityFilters;
}

export function useContactsWithOpportunities(filters: ContactFilters = {}) {
  const [contacts, setContacts] = useState<ContactWithOpportunities[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (isFetching) return; // Prevent overlapping fetches
    fetchContactsWithOpportunities();
  }, [JSON.stringify(filters)]);

  const fetchContactsWithOpportunities = async () => {
    if (isFetching) return; // Prevent overlapping fetches
    
    try {
      setIsFetching(true);
      
      // Only show full loading on initial load, use refreshing for subsequent updates
      if (contacts.length === 0) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      // First get all contacts with filters using dynamic view
      let effectiveContactsData: any[] | null = null;
      let contactsQuery = supabase
        .from("contacts_with_dynamic_interactions")
        .select("*");

      // Apply contact filters
      const {
        focusAreas = [],
        sectors = [],
        areasOfSpecialization = [],
        organizations = [],
        titles = [],
        categories = [],
        deltaType = [],
        hasOpportunities = [],
        lgLead = [],
        groupContacts = [],
        mostRecentContactStart,
        mostRecentContactEnd,
        deltaMin,
        deltaMax,
        opportunityFilters = {}
      } = filters;

      // Focus Areas - use comprehensive list only for exact matching
      if (focusAreas.length > 0) {
        console.log('Filtering contacts with focus areas:', focusAreas);
        const focusAreaConditions = focusAreas.map(area => `lg_focus_areas_comprehensive_list.ilike.*${area}*`);
        console.log('Focus area query conditions:', focusAreaConditions);
        contactsQuery = contactsQuery.or(focusAreaConditions.join(','));
      }

      // Sectors
      if (sectors.length > 0) {
        contactsQuery = contactsQuery.in('lg_sector', sectors);
      }

      // Areas of specialization
      if (areasOfSpecialization.length > 0) {
        const areasQuery = areasOfSpecialization.map(area => `areas_of_specialization.ilike.*${area}*`).join(',');
        contactsQuery = contactsQuery.or(areasQuery);
      }

      // Organizations
      if (organizations.length > 0) {
        contactsQuery = contactsQuery.in('organization', organizations);
      }

      // Titles
      if (titles.length > 0) {
        contactsQuery = contactsQuery.in('title', titles);
      }

      // Categories
      if (categories.length > 0) {
        contactsQuery = contactsQuery.in('category', categories);
      }

      // Delta Type
      if (deltaType.length > 0) {
        contactsQuery = contactsQuery.in('delta_type', deltaType);
      }

      // Has Opportunities
      if (hasOpportunities.length > 0) {
        if (hasOpportunities.includes('Yes')) {
          contactsQuery = contactsQuery.gt('all_opps', 0);
        }
        if (hasOpportunities.includes('No')) {
          contactsQuery = contactsQuery.or('all_opps.is.null,all_opps.eq.0');
        }
      }

      // Date range for most recent contact
      if (mostRecentContactStart) {
        contactsQuery = contactsQuery.gte('most_recent_contact', mostRecentContactStart);
      }
      if (mostRecentContactEnd) {
        contactsQuery = contactsQuery.lte('most_recent_contact', mostRecentContactEnd);
      }

      // Delta range
      if (deltaMin !== null && deltaMin !== undefined) {
        contactsQuery = contactsQuery.gte('delta', deltaMin);
      }
      if (deltaMax !== null && deltaMax !== undefined) {
        contactsQuery = contactsQuery.lte('delta', deltaMax);
      }

      // Filter contacts by LG Lead if specified (contact's lg_lead field)
      if (lgLead.length > 0) {
        const leadConditions = lgLead.map(lead => 
          `lg_lead.ilike.*${lead}*`
        ).join(',');
        contactsQuery = contactsQuery.or(leadConditions);
      }

      // Filter contacts by Group Contact if specified
      if (groupContacts.length > 0) {
        contactsQuery = contactsQuery.in('group_contact', groupContacts);
      }

      // Determine if opportunity filters are applied to adjust result size early
      const hasOpportunityFilters =
        (Array.isArray((opportunityFilters as any).tier) && (opportunityFilters as any).tier.length > 0) ||
        (Array.isArray((opportunityFilters as any).platformAddon) && (opportunityFilters as any).platformAddon.length > 0) ||
        (Array.isArray((opportunityFilters as any).ownershipType) && (opportunityFilters as any).ownershipType.length > 0) ||
        (Array.isArray((opportunityFilters as any).status) && (opportunityFilters as any).status.length > 0) ||
        (Array.isArray((opportunityFilters as any).lgLead) && (opportunityFilters as any).lgLead.length > 0) ||
        !!(opportunityFilters as any).dateRangeStart ||
        !!(opportunityFilters as any).dateRangeEnd ||
        (opportunityFilters as any).ebitdaMin !== null && (opportunityFilters as any).ebitdaMin !== undefined ||
        (opportunityFilters as any).ebitdaMax !== null && (opportunityFilters as any).ebitdaMax !== undefined;

      // If opportunity filters are active, pre-filter contacts by matching opportunity set via RPC
      if (hasOpportunityFilters) {
        console.log('🔎 Using backend RPC to pre-filter contacts by opportunity filters');
        const { data: idRows, error: rpcError } = await (supabase as any).rpc('contacts_ids_by_opportunity_filters', {
          p_tier: (opportunityFilters as any).tier?.length ? (opportunityFilters as any).tier : null,
          p_platform_add_on: (opportunityFilters as any).platformAddon?.length ? (opportunityFilters as any).platformAddon : null,
          p_ownership_type: (opportunityFilters as any).ownershipType?.length ? (opportunityFilters as any).ownershipType : null,
          p_status: (opportunityFilters as any).status?.length ? (opportunityFilters as any).status : null,
          p_lg_lead: (opportunityFilters as any).lgLead?.length ? (opportunityFilters as any).lgLead : null,
          p_date_start: (opportunityFilters as any).dateRangeStart || null,
          p_date_end: (opportunityFilters as any).dateRangeEnd || null,
          p_ebitda_min: (opportunityFilters as any).ebitdaMin ?? null,
          p_ebitda_max: (opportunityFilters as any).ebitdaMax ?? null,
        });

        if (rpcError) {
          console.error('RPC contacts_ids_by_opportunity_filters error:', rpcError);
        } else {
          const ids = (idRows || []).map((r: any) => r.contact_id).filter(Boolean);
          console.log('✅ RPC returned matching contact IDs:', ids.length);
          if (ids.length === 0) {
            setContacts([]);
            setLoading(false);
            setIsRefreshing(false);
            setIsFetching(false);
            return;
          }
          contactsQuery = contactsQuery.in('id', ids);
        }
      }

      // Performance: sort by most recent and limit result set to avoid timeouts
      contactsQuery = contactsQuery
        .order('most_recent_contact', { ascending: false, nullsFirst: false })
        .limit(hasOpportunityFilters ? 5000 : 1000);

      const { data: contactsData, error: contactsError } = await contactsQuery;

      if (contactsError) {
        console.error("Error fetching contacts:", contactsError);
        
        // Fallback to contacts_app if dynamic view fails
        try {
          console.log("Falling back to contacts_app table...");
          const fallbackQuery = supabase
            .from("contacts_app")
            .select("*")
            .order('most_recent_contact', { ascending: false, nullsFirst: false })
            .limit(1000);
          
          const { data: fallbackData, error: fallbackError } = await fallbackQuery;
          
          if (fallbackError) {
            console.error("Fallback query failed:", fallbackError);
            return;
          }
          
          // Use fallback data with empty opportunities
          const fallbackContacts = (fallbackData || []).map(contact => ({
            ...contact,
            opportunities: ''
          })) as ContactWithOpportunities[];
          
          setContacts(fallbackContacts);
          return;
        } catch (fallbackErr) {
          console.error("Fallback failed:", fallbackErr);
          return;
        }
      }

      console.log('📊 Fetching opportunities for', contactsData?.length || 0, 'contacts');

      // Fetch opportunities from the backend view
      const contactIds = contactsData?.map(c => c.id).filter(Boolean) || [];
      
      let opportunitiesData: any[] = [];
      if (contactIds.length > 0) {
        const BATCH_SIZE = 1000;
        for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
          const batch = contactIds.slice(i, i + BATCH_SIZE);
          const { data: oppData, error: oppError } = await supabase
            .from('contacts_with_opportunities_v')
            .select('id, opportunities')
            .in('id', batch);
          
          if (oppError) {
            console.error('Error fetching opportunities from view:', oppError);
          } else {
            opportunitiesData.push(...(oppData || []));
          }
        }
      }

      console.log('💼 Total opportunities fetched:', opportunitiesData.length);

      // Build contact ID -> opportunities map
      const contactOppsMap = new Map<string, string>();
      opportunitiesData.forEach(opp => {
        if (opp.id && opp.opportunities) {
          contactOppsMap.set(opp.id, opp.opportunities);
        }
      });

      console.log('📦 Opportunities map size:', contactOppsMap.size);
      console.log('📦 Sample opportunities:', Array.from(contactOppsMap.entries()).slice(0, 3));

      // Join contacts with their opportunities
      const contactsWithOpportunities = contactsData?.map(contact => ({
        ...contact,
        opportunities: contactOppsMap.get(contact.id) || ''
      })) || [];

      console.log('🎯 Final contacts with opportunities:', contactsWithOpportunities.length);
      console.log('🎯 Sample contact with opps:', contactsWithOpportunities.find(c => c.opportunities) || 'none found');

      setContacts(contactsWithOpportunities);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setIsFetching(false);
    }
  };

  return { contacts, loading, isRefreshing, refetch: fetchContactsWithOpportunities };
}