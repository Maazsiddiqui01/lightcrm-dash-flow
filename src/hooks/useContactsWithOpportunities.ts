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
        const areasQuery = areasOfSpecialization.map(area => `areas_of_specialization.ilike.%${area}%`).join(',');
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
          `lg_lead.ilike.%${lead}%`
        ).join(',');
        contactsQuery = contactsQuery.or(leadConditions);
      }

      // Performance: sort by most recent and limit result set to avoid timeouts
      contactsQuery = contactsQuery
        .order('most_recent_contact', { ascending: false, nullsFirst: false })
        .limit(1000);

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

      // Prepare opportunity filters
      const {
        tier = [],
        platformAddon = [],
        ownershipType = [],
        status = [],
        lgLead: oppLgLead = [],
        dateRangeStart,
        dateRangeEnd,
        ebitdaMin,
        ebitdaMax
      } = opportunityFilters;

      // Determine if we need to query opportunities at all
      const hasOpportunityFilters = tier.length > 0 || platformAddon.length > 0 || ownershipType.length > 0 || 
        status.length > 0 || oppLgLead.length > 0 || dateRangeStart || dateRangeEnd || 
        (ebitdaMin !== null && ebitdaMin !== undefined) || (ebitdaMax !== null && ebitdaMax !== undefined);

      let opportunitiesData: any[] = [];

      if (hasOpportunityFilters) {
        let opportunitiesQuery = supabase
          .from('opportunities_raw')
          .select('deal_name, deal_source_individual_1, deal_source_individual_2, tier, platform_add_on, ownership_type, status, date_of_origination, investment_professional_point_person_1, investment_professional_point_person_2, ebitda_in_ms');

        if (tier.length > 0) {
          opportunitiesQuery = opportunitiesQuery.in('tier', tier);
        }

        if (platformAddon.length > 0) {
          opportunitiesQuery = opportunitiesQuery.in('platform_add_on', platformAddon);
        }

        if (ownershipType.length > 0) {
          opportunitiesQuery = opportunitiesQuery.in('ownership_type', ownershipType);
        }

        if (status.length > 0) {
          opportunitiesQuery = opportunitiesQuery.in('status', status);
        }

        if (oppLgLead.length > 0) {
          const leadQuery = oppLgLead.map(lead => 
            `investment_professional_point_person_1.ilike.%${lead}%,investment_professional_point_person_2.ilike.%${lead}%`
          ).join(',');
          opportunitiesQuery = opportunitiesQuery.or(leadQuery);
        }

        if (ebitdaMin !== null && ebitdaMin !== undefined) {
          opportunitiesQuery = opportunitiesQuery.gte('ebitda_in_ms', ebitdaMin);
        }

        if (ebitdaMax !== null && ebitdaMax !== undefined) {
          opportunitiesQuery = opportunitiesQuery.lte('ebitda_in_ms', ebitdaMax);
        }

        if (dateRangeStart) {
          opportunitiesQuery = opportunitiesQuery.gte('date_of_origination', dateRangeStart);
        }

        if (dateRangeEnd) {
          opportunitiesQuery = opportunitiesQuery.lte('date_of_origination', dateRangeEnd);
        }

        const { data: oppData, error: opportunitiesError } = await opportunitiesQuery;

        if (opportunitiesError) {
          console.error('Error fetching opportunities:', opportunitiesError);
          // Do not fail the contacts load due to opp errors
        } else {
          opportunitiesData = oppData || [];
        }
      }

      // If opportunity filters are applied, filter contacts to only those with matching opportunities
      let finalContactsData = contactsData;
      
      if (hasOpportunityFilters && opportunitiesData && opportunitiesData.length > 0) {
        // Get unique contact names from filtered opportunities
        const contactNamesWithOpps = new Set<string>();
        opportunitiesData.forEach(opp => {
          if (opp.deal_source_individual_1) {
            contactNamesWithOpps.add(opp.deal_source_individual_1.toLowerCase().trim());
          }
          if (opp.deal_source_individual_2) {
            contactNamesWithOpps.add(opp.deal_source_individual_2.toLowerCase().trim());
          }
        });

        // Filter contacts to only include those who sourced the filtered opportunities
        finalContactsData = contactsData?.filter(contact => {
          if (!contact.full_name) return false;
          const normalizedContactName = contact.full_name.toLowerCase().trim();
          return contactNamesWithOpps.has(normalizedContactName);
        }) || [];
      } else if (hasOpportunityFilters && (!opportunitiesData || opportunitiesData.length === 0)) {
        // If opportunity filters are applied but no opportunities match, show no contacts
        finalContactsData = [];
      }

      // Join contacts with their opportunities
      const contactsWithOpportunities = finalContactsData?.map(contact => {
        const matchingOpportunities = opportunitiesData?.filter(opp => {
          if (!contact.full_name) return false;
          
          const normalizedContactName = contact.full_name.toLowerCase().trim();
          const normalizedSource1 = (opp.deal_source_individual_1 || '').toLowerCase().trim();
          const normalizedSource2 = (opp.deal_source_individual_2 || '').toLowerCase().trim();
          
          return normalizedSource1 === normalizedContactName || 
                 normalizedSource2 === normalizedContactName;
        }) || [];

        const opportunityNames = matchingOpportunities
          .map(opp => opp.deal_name)
          .filter(name => name && name.trim())
          .join(', ');

        return {
          ...contact,
          opportunities: opportunityNames
        };
      }) || [];

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