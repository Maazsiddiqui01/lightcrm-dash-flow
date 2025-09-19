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
  opportunities: string; // Comma-separated deal names or empty string
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

  useEffect(() => {
    fetchContactsWithOpportunities();
  }, [filters]);

  const fetchContactsWithOpportunities = async () => {
    try {
      setLoading(true);

      // First get all contacts with filters
      let contactsQuery = supabase
        .from("contacts_raw")
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

      // Focus Areas - partial match in comma-separated list
      if (focusAreas.length > 0) {
        const focusQuery = focusAreas.map(fa => `lg_focus_areas_comprehensive_list.ilike.%${fa}%`).join(',');
        contactsQuery = contactsQuery.or(focusQuery);
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

      // Filter contacts by LG Lead if specified (contacts that have opportunities with these leads)
      if (lgLead.length > 0) {
        // First get opportunities that match the LG Lead criteria
        const lgLeadOppsQuery = supabase
          .from("opportunities_raw")
          .select("deal_source_individual_1, deal_source_individual_2");
        
        const leadQuery = lgLead.map(lead => 
          `investment_professional_point_person_1.ilike.%${lead}%,investment_professional_point_person_2.ilike.%${lead}%`
        ).join(',');
        
        const { data: lgLeadOpps } = await lgLeadOppsQuery.or(leadQuery);
        
        if (lgLeadOpps && lgLeadOpps.length > 0) {
          const sourceNames = new Set();
          lgLeadOpps.forEach(opp => {
            if (opp.deal_source_individual_1) sourceNames.add(opp.deal_source_individual_1.toLowerCase().trim());
            if (opp.deal_source_individual_2) sourceNames.add(opp.deal_source_individual_2.toLowerCase().trim());
          });
          
          if (sourceNames.size > 0) {
            const nameQueries = Array.from(sourceNames).map(name => `full_name.ilike.${name}`).join(',');
            contactsQuery = contactsQuery.or(nameQueries);
          }
        }
      }

      const { data: contactsData, error: contactsError } = await contactsQuery;

      if (contactsError) {
        console.error("Error fetching contacts:", contactsError);
        return;
      }

      // Get all opportunities with filters
      let opportunitiesQuery = supabase
        .from("opportunities_raw")
        .select("deal_name, deal_source_individual_1, deal_source_individual_2, tier, platform_add_on, ownership_type, status, date_of_origination, investment_professional_point_person_1, investment_professional_point_person_2, ebitda_in_ms");

      // Apply opportunity filters
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

      // Check if any opportunity filters are applied
      const hasOpportunityFilters = tier.length > 0 || platformAddon.length > 0 || ownershipType.length > 0 || 
        status.length > 0 || oppLgLead.length > 0 || dateRangeStart || dateRangeEnd || 
        (ebitdaMin !== null && ebitdaMin !== undefined) || (ebitdaMax !== null && ebitdaMax !== undefined);

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

      const { data: opportunitiesData, error: opportunitiesError } = await opportunitiesQuery;

      if (opportunitiesError) {
        console.error("Error fetching opportunities:", opportunitiesError);
        return;
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
    }
  };

  return { contacts, loading, refetch: fetchContactsWithOpportunities };
}