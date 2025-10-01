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

      console.log('📊 Fetching opportunities for', contactsData?.length || 0, 'contacts');
      console.log('🔍 Opportunity filters active:', hasOpportunityFilters);

      // STEP 1: Build normalized name set from all contacts
      const normalizedContactNames = new Set<string>();
      const contactNameMap = new Map<string, any>(); // Map normalized name -> contact
      
      contactsData?.forEach(contact => {
        if (contact.full_name) {
          const normalized = contact.full_name.toLowerCase().replace(/\s+/g, ' ').trim();
          normalizedContactNames.add(normalized);
          contactNameMap.set(normalized, contact);
        }
      });

      console.log('📝 Total unique contact names:', normalizedContactNames.size);

      // STEP 2: Query opportunities in batches matching contact names
      let allOpportunities: any[] = [];
      
      if (normalizedContactNames.size > 0) {
        const nameArray = Array.from(normalizedContactNames);
        const BATCH_SIZE = 200;
        
        // Query opportunities where norm_src_1 OR norm_src_2 matches any contact name
        for (let i = 0; i < nameArray.length; i += BATCH_SIZE) {
          const batch = nameArray.slice(i, i + BATCH_SIZE);
          
          try {
            // Build base query
            let oppsQuery1 = supabase
              .from('opportunities_norm')
              .select('deal_name, norm_src_1, norm_src_2, tier, platform_add_on, ownership_type, status, date_of_origination, investment_professional_point_person_1, investment_professional_point_person_2, ebitda_in_ms')
              .in('norm_src_1', batch);

            // Apply opportunity filters to query 1
            if (tier.length > 0) oppsQuery1 = oppsQuery1.in('tier', tier);
            if (platformAddon.length > 0) oppsQuery1 = oppsQuery1.in('platform_add_on', platformAddon);
            if (ownershipType.length > 0) oppsQuery1 = oppsQuery1.in('ownership_type', ownershipType);
            if (status.length > 0) oppsQuery1 = oppsQuery1.in('status', status);
            if (oppLgLead.length > 0) {
              const leadConditions = oppLgLead.map(lead => 
                `investment_professional_point_person_1.ilike.*${lead}*,investment_professional_point_person_2.ilike.*${lead}*`
              ).join(',');
              oppsQuery1 = oppsQuery1.or(leadConditions);
            }
            if (ebitdaMin !== null && ebitdaMin !== undefined) oppsQuery1 = oppsQuery1.gte('ebitda_in_ms', ebitdaMin);
            if (ebitdaMax !== null && ebitdaMax !== undefined) oppsQuery1 = oppsQuery1.lte('ebitda_in_ms', ebitdaMax);
            if (dateRangeStart) oppsQuery1 = oppsQuery1.gte('date_of_origination', dateRangeStart);
            if (dateRangeEnd) oppsQuery1 = oppsQuery1.lte('date_of_origination', dateRangeEnd);

            const { data: opps1, error: error1 } = await oppsQuery1;
            
            if (error1) {
              console.error('Error fetching opportunities (src_1):', error1);
            } else {
              allOpportunities.push(...(opps1 || []));
            }

            // Query for norm_src_2
            let oppsQuery2 = supabase
              .from('opportunities_norm')
              .select('deal_name, norm_src_1, norm_src_2, tier, platform_add_on, ownership_type, status, date_of_origination, investment_professional_point_person_1, investment_professional_point_person_2, ebitda_in_ms')
              .in('norm_src_2', batch);

            // Apply same filters to query 2
            if (tier.length > 0) oppsQuery2 = oppsQuery2.in('tier', tier);
            if (platformAddon.length > 0) oppsQuery2 = oppsQuery2.in('platform_add_on', platformAddon);
            if (ownershipType.length > 0) oppsQuery2 = oppsQuery2.in('ownership_type', ownershipType);
            if (status.length > 0) oppsQuery2 = oppsQuery2.in('status', status);
            if (oppLgLead.length > 0) {
              const leadConditions = oppLgLead.map(lead => 
                `investment_professional_point_person_1.ilike.*${lead}*,investment_professional_point_person_2.ilike.*${lead}*`
              ).join(',');
              oppsQuery2 = oppsQuery2.or(leadConditions);
            }
            if (ebitdaMin !== null && ebitdaMin !== undefined) oppsQuery2 = oppsQuery2.gte('ebitda_in_ms', ebitdaMin);
            if (ebitdaMax !== null && ebitdaMax !== undefined) oppsQuery2 = oppsQuery2.lte('ebitda_in_ms', ebitdaMax);
            if (dateRangeStart) oppsQuery2 = oppsQuery2.gte('date_of_origination', dateRangeStart);
            if (dateRangeEnd) oppsQuery2 = oppsQuery2.lte('date_of_origination', dateRangeEnd);

            const { data: opps2, error: error2 } = await oppsQuery2;
            
            if (error2) {
              console.error('Error fetching opportunities (src_2):', error2);
            } else {
              allOpportunities.push(...(opps2 || []));
            }
          } catch (err) {
            console.error('Error in batch', i, ':', err);
          }
        }

        // Deduplicate opportunities by deal_name
        const uniqueOppsMap = new Map();
        allOpportunities.forEach(opp => {
          if (opp.deal_name && !uniqueOppsMap.has(opp.deal_name)) {
            uniqueOppsMap.set(opp.deal_name, opp);
          }
        });
        allOpportunities = Array.from(uniqueOppsMap.values());
        
        console.log('💼 Total opportunities fetched:', allOpportunities.length);
      }

      // STEP 3: Build contact -> opportunities map
      const contactOppsMap = new Map<string, any[]>();
      
      allOpportunities.forEach(opp => {
        const src1 = String(opp.norm_src_1 || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const src2 = String(opp.norm_src_2 || '').toLowerCase().replace(/\s+/g, ' ').trim();
        
        if (src1 && normalizedContactNames.has(src1)) {
          if (!contactOppsMap.has(src1)) contactOppsMap.set(src1, []);
          contactOppsMap.get(src1)!.push(opp);
        }
        
        if (src2 && normalizedContactNames.has(src2)) {
          if (!contactOppsMap.has(src2)) contactOppsMap.set(src2, []);
          contactOppsMap.get(src2)!.push(opp);
        }
      });

      console.log('🔗 Contacts with opportunities:', contactOppsMap.size);

      // STEP 4: Filter contacts if opportunity filters are active
      let finalContactsData = contactsData;
      
      if (hasOpportunityFilters) {
        // Only keep contacts that have at least one matching opportunity
        finalContactsData = contactsData?.filter(contact => {
          if (!contact.full_name) return false;
          const normalized = contact.full_name.toLowerCase().replace(/\s+/g, ' ').trim();
          return contactOppsMap.has(normalized);
        }) || [];
        
        console.log('✅ Contacts after opportunity filtering:', finalContactsData.length);
      }

      // STEP 5: Join contacts with their opportunities
      const contactsWithOpportunities = finalContactsData?.map(contact => {
        const normalized = contact.full_name?.toLowerCase().replace(/\s+/g, ' ').trim() || '';
        const matchingOpps = contactOppsMap.get(normalized) || [];
        
        // Build comma-separated deal names, deduplicated
        const dealNames = [...new Set(matchingOpps.map(opp => opp.deal_name).filter(Boolean))];
        const opportunityNames = dealNames.join(', ');

        return {
          ...contact,
          opportunities: opportunityNames
        };
      }) || [];

      console.log('🎯 Final contacts with opportunities:', contactsWithOpportunities.length);

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