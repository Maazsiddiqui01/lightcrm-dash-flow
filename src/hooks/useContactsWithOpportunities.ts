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
  most_recent_group_contact: string | null;
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
        
        // Fallback to contacts_raw if dynamic view fails (ensures group fields exist)
        try {
          console.log("Falling back to contacts_raw table...");
          const fallbackQuery = supabase
            .from("contacts_raw")
            .select("*")
            .order('updated_at', { ascending: false, nullsFirst: false })
            .limit(1000);
          
          const { data: fallbackData, error: fallbackError } = await fallbackQuery;
          
          if (fallbackError) {
            console.error("Fallback query (contacts_raw) failed:", fallbackError);
            return;
          }
          
          // Use fallback data with empty opportunities and ensure required fields exist
          const fallbackContacts: ContactWithOpportunities[] = (fallbackData || []).map((contact: any) => ({
            id: contact.id,
            full_name: contact.full_name ?? null,
            first_name: contact.first_name ?? null,
            last_name: contact.last_name ?? null,
            email_address: contact.email_address ?? null,
            phone: contact.phone ?? null,
            title: contact.title ?? null,
            organization: contact.organization ?? null,
            areas_of_specialization: contact.areas_of_specialization ?? null,
            lg_sector: contact.lg_sector ?? null,
            lg_focus_area_1: contact.lg_focus_area_1 ?? null,
            lg_focus_area_2: contact.lg_focus_area_2 ?? null,
            lg_focus_area_3: contact.lg_focus_area_3 ?? null,
            lg_focus_area_4: contact.lg_focus_area_4 ?? null,
            lg_focus_area_5: contact.lg_focus_area_5 ?? null,
            lg_focus_area_6: contact.lg_focus_area_6 ?? null,
            lg_focus_area_7: contact.lg_focus_area_7 ?? null,
            lg_focus_area_8: contact.lg_focus_area_8 ?? null,
            lg_focus_areas_comprehensive_list: contact.lg_focus_areas_comprehensive_list ?? null,
            category: contact.category ?? null,
            contact_type: contact.contact_type ?? null,
            delta_type: contact.delta_type ?? null,
            notes: contact.notes ?? null,
            url_to_online_bio: contact.url_to_online_bio ?? null,
            most_recent_contact: contact.most_recent_contact ?? null,
            latest_contact_email: contact.latest_contact_email ?? null,
            latest_contact_meeting: contact.latest_contact_meeting ?? null,
            outreach_date: contact.outreach_date ?? null,
            email_subject: contact.email_subject ?? null,
            meeting_title: contact.meeting_title ?? null,
            total_of_contacts: contact.total_of_contacts ?? null,
            of_emails: contact.of_emails ?? null,
            of_meetings: contact.of_meetings ?? null,
            delta: contact.delta ?? null,
            days_since_last_email: contact.days_since_last_email ?? null,
            days_since_last_meeting: contact.days_since_last_meeting ?? null,
            no_of_lg_focus_areas: contact.no_of_lg_focus_areas ?? null,
            all_opps: contact.all_opps ?? null,
            no_of_opps_sourced: contact.no_of_opps_sourced ?? null,
            email_from: contact.email_from ?? null,
            email_to: contact.email_to ?? null,
            email_cc: contact.email_cc ?? null,
            meeting_from: contact.meeting_from ?? null,
            meeting_to: contact.meeting_to ?? null,
            meeting_cc: contact.meeting_cc ?? null,
            all_emails: contact.all_emails ?? null,
            city: contact.city ?? null,
            state: contact.state ?? null,
            created_at: contact.created_at ?? null,
            updated_at: contact.updated_at ?? null,
            lg_lead: contact.lg_lead ?? null,
            lg_assistant: contact.lg_assistant ?? null,
            group_contact: contact.group_contact ?? null,
            most_recent_group_contact: contact.most_recent_group_contact ?? null,
            intentional_no_outreach: contact.intentional_no_outreach ?? null,
            intentional_no_outreach_date: contact.intentional_no_outreach_date ?? null,
            intentional_no_outreach_note: contact.intentional_no_outreach_note ?? null,
            opportunities: ''
          }));
          
          setContacts(fallbackContacts);
          return;
        } catch (fallbackErr) {
          console.error("Fallback failed:", fallbackErr);
          return;
        }
      }

      // Fetch opportunities directly from the view - simplified approach
      console.log('📊 Fetching opportunities from view...');
      
      const { data: oppsData, error: oppsError } = await supabase
        .from('contacts_with_opportunities_v')
        .select('id, opportunities');
      
      if (oppsError) {
        console.error('❌ Error fetching opportunities from view:', oppsError);
      }

      // Build a simple map: contact id -> opportunities string
      const oppsMap = new Map<string, string>();
      (oppsData || []).forEach(row => {
        if (row.id && row.opportunities) {
          oppsMap.set(row.id, row.opportunities);
        }
      });

      console.log('✅ Opportunities map built:', oppsMap.size, 'contacts have opportunities');
      console.log('🔍 Sample opportunities:', Array.from(oppsMap.entries()).slice(0, 3));

      // Attach opportunities to each contact
      const contactsWithOpportunities = contactsData?.map(contact => ({
        ...contact,
        opportunities: oppsMap.get(contact.id) || ''
      })) || [];

      const withOpps = contactsWithOpportunities.filter(c => c.opportunities).length;
      console.log('✅ Final result:', contactsWithOpportunities.length, 'total contacts,', withOpps, 'with opportunities');
      console.log('🔍 Sample contact with opportunities:', contactsWithOpportunities.find(c => c.opportunities));

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