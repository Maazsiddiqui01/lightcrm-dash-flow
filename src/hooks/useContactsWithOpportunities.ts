import { useState, useEffect, useRef } from 'react';
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
  group_email_role: string | null;
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
  const requestIdRef = useRef(0);

  useEffect(() => {
    // Allow new fetches to supersede old ones - "last write wins"
    fetchContactsWithOpportunities();
  }, [JSON.stringify(filters)]);

  const fetchContactsWithOpportunities = async () => {
    // Increment request ID - each new fetch gets a unique ID
    const reqId = ++requestIdRef.current;
    console.log(`[Contacts#${reqId}] Starting fetch with filters:`, JSON.stringify(filters).slice(0, 200));
    
    try {
      setIsFetching(true);
      
      // Only show full loading on initial load, use refreshing for subsequent updates
      if (contacts.length === 0) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      // Fetch contacts with computed stats from contacts_computed view
      let effectiveContactsData: any[] | null = null;
      let contactsQuery = supabase
        .from("contacts_raw")
        .select(`
          *,
          computed:contacts_computed!contact_id(
            of_emails,
            of_meetings,
            total_of_contacts,
            days_since_last_email,
            days_since_last_meeting,
            contact_type
          )
        `);

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

      // Normalize opportunity filters to arrays (URL may provide single strings)
      const rawOppFilters: any = opportunityFilters || {};
      const normalizedOppFilters = {
        tier: Array.isArray(rawOppFilters.tier) ? rawOppFilters.tier : (rawOppFilters.tier ? [String(rawOppFilters.tier)] : []),
        platformAddon: Array.isArray(rawOppFilters.platformAddon) ? rawOppFilters.platformAddon : (rawOppFilters.platformAddon ? [String(rawOppFilters.platformAddon)] : []),
        ownershipType: Array.isArray(rawOppFilters.ownershipType) ? rawOppFilters.ownershipType : (rawOppFilters.ownershipType ? [String(rawOppFilters.ownershipType)] : []),
        status: Array.isArray(rawOppFilters.status) ? rawOppFilters.status : (rawOppFilters.status ? [String(rawOppFilters.status)] : []),
        lgLead: Array.isArray(rawOppFilters.lgLead) ? rawOppFilters.lgLead : (rawOppFilters.lgLead ? [String(rawOppFilters.lgLead)] : []),
        dateRangeStart: rawOppFilters.dateRangeStart || null,
        dateRangeEnd: rawOppFilters.dateRangeEnd || null,
        ebitdaMin: rawOppFilters.ebitdaMin ?? null,
        ebitdaMax: rawOppFilters.ebitdaMax ?? null,
      } as const;

      // Pre-filter by focus areas using RPC if provided
      let contactIdsFromFocusAreas: string[] | null = null;
      let contactIdsFromOpportunityFilters: string[] | null = null;
      if (focusAreas.length > 0) {
        console.log('[Contacts] Pre-filtering by focus areas via RPC:', focusAreas);
        const { data: faContactIds, error: faError } = await supabase.rpc(
          "contacts_ids_by_focus_areas",
          { p_focus_areas: focusAreas }
        );
        if (faError) {
          console.error("[Contacts] Error fetching contact IDs by focus areas:", faError);
        } else {
          contactIdsFromFocusAreas = faContactIds?.map((r: { contact_id: string }) => r.contact_id) || [];
          console.log(`[Contacts] Focus area RPC returned ${contactIdsFromFocusAreas.length} contact IDs`);
        }
      }

      // Apply focus area filter via contact IDs if available
      if (contactIdsFromFocusAreas !== null) {
        if (contactIdsFromFocusAreas.length > 0) {
          contactsQuery = contactsQuery.in('id', contactIdsFromFocusAreas);
        } else {
          // No contacts match focus area filters, return empty result
          console.log(`[Contacts#${reqId}] No contacts match focus areas, returning empty`);
          if (reqId === requestIdRef.current) {
            setContacts([]);
            setLoading(false);
            setIsRefreshing(false);
            setIsFetching(false);
          }
          return;
        }
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
        (normalizedOppFilters.tier?.length || 0) > 0 ||
        (normalizedOppFilters.platformAddon?.length || 0) > 0 ||
        (normalizedOppFilters.ownershipType?.length || 0) > 0 ||
        (normalizedOppFilters.status?.length || 0) > 0 ||
        (normalizedOppFilters.lgLead?.length || 0) > 0 ||
        !!normalizedOppFilters.dateRangeStart ||
        !!normalizedOppFilters.dateRangeEnd ||
        (normalizedOppFilters.ebitdaMin !== null && normalizedOppFilters.ebitdaMin !== undefined) ||
        (normalizedOppFilters.ebitdaMax !== null && normalizedOppFilters.ebitdaMax !== undefined);

      // If opportunity filters are active, pre-filter contacts by matching opportunity set via RPC
      if (hasOpportunityFilters) {
        console.log(`[Contacts#${reqId}] Using backend RPC to pre-filter contacts by opportunity filters`);
        const { data: idRows, error: rpcError } = await (supabase as any).rpc('contacts_ids_by_opportunity_filters', {
          p_tier: normalizedOppFilters.tier?.length ? normalizedOppFilters.tier : null,
          p_platform_add_on: normalizedOppFilters.platformAddon?.length ? normalizedOppFilters.platformAddon : null,
          p_ownership_type: normalizedOppFilters.ownershipType?.length ? normalizedOppFilters.ownershipType : null,
          p_status: normalizedOppFilters.status?.length ? normalizedOppFilters.status : null,
          p_lg_lead: normalizedOppFilters.lgLead?.length ? normalizedOppFilters.lgLead : null,
          p_date_start: normalizedOppFilters.dateRangeStart || null,
          p_date_end: normalizedOppFilters.dateRangeEnd || null,
          p_ebitda_min: normalizedOppFilters.ebitdaMin ?? null,
          p_ebitda_max: normalizedOppFilters.ebitdaMax ?? null,
        });

        if (rpcError) {
          console.error(`[Contacts#${reqId}] RPC contacts_ids_by_opportunity_filters error:`, rpcError);
        } else {
          const ids = (idRows || []).map((r: any) => r.contact_id).filter(Boolean);
          contactIdsFromOpportunityFilters = ids; // Store in function scope for fallback
          console.log(`[Contacts#${reqId}] RPC returned ${ids.length} matching contact IDs`);
          if (ids.length === 0) {
            console.log(`[Contacts#${reqId}] No contacts match opportunity filters, returning empty`);
            if (reqId === requestIdRef.current) {
              setContacts([]);
              setLoading(false);
              setIsRefreshing(false);
              setIsFetching(false);
            }
            return;
          }
          contactsQuery = contactsQuery.in('id', ids);
        }
      }

      // Performance: sort by most recent and limit result set to avoid timeouts
      contactsQuery = contactsQuery
        .order('most_recent_contact', { ascending: false, nullsFirst: false })
        .limit(hasOpportunityFilters ? 5000 : 2000);

      const { data: contactsData, error: contactsError } = await contactsQuery;

      if (contactsError) {
        console.error(`[Contacts#${reqId}] Error fetching contacts:`, contactsError);
        
        // Fallback to contacts_raw if dynamic view fails (ensures group fields exist)
        try {
          console.log(`[Contacts#${reqId}] Falling back to contacts_raw table with filters applied...`);
          let fallbackQuery = supabase
            .from("contacts_raw")
            .select(`
              *,
              computed:contacts_computed!contact_id(
                of_emails,
                of_meetings,
                total_of_contacts,
                days_since_last_email,
                days_since_last_meeting,
                contact_type
              )
            `);
          
          // Apply focus area filter via contact IDs to fallback
          if (contactIdsFromFocusAreas !== null) {
            if (contactIdsFromFocusAreas.length > 0) {
              fallbackQuery = fallbackQuery.in('id', contactIdsFromFocusAreas);
            } else {
              console.log(`[Contacts#${reqId}] No contacts match focus areas in fallback, returning empty`);
              if (reqId === requestIdRef.current) {
                setContacts([]);
                setLoading(false);
                setIsRefreshing(false);
                setIsFetching(false);
              }
              return;
            }
          }

          // Apply opportunity filter IDs to fallback
          if (contactIdsFromOpportunityFilters !== null) {
            console.log(`[Contacts#${reqId}] Applying opportunity filter IDs to fallback query:`, contactIdsFromOpportunityFilters.length);
            if (contactIdsFromOpportunityFilters.length > 0) {
              fallbackQuery = fallbackQuery.in('id', contactIdsFromOpportunityFilters);
            } else {
              // No contacts match opportunity filters, return empty
              console.log(`[Contacts#${reqId}] No contacts match opportunity filters in fallback, returning empty`);
              if (reqId === requestIdRef.current) {
                setContacts([]);
                setLoading(false);
                setIsRefreshing(false);
                setIsFetching(false);
              }
              return;
            }
          }
          if (sectors.length > 0) fallbackQuery = fallbackQuery.in('lg_sector', sectors);
          if (areasOfSpecialization.length > 0) {
            const areasQuery = areasOfSpecialization.map(area => `areas_of_specialization.ilike.%${area}%`).join(',');
            fallbackQuery = fallbackQuery.or(areasQuery);
          }
          if (organizations.length > 0) fallbackQuery = fallbackQuery.in('organization', organizations);
          if (titles.length > 0) fallbackQuery = fallbackQuery.in('title', titles);
          if (categories.length > 0) fallbackQuery = fallbackQuery.in('category', categories);
          if (deltaType.length > 0) fallbackQuery = fallbackQuery.in('delta_type', deltaType);
          if (hasOpportunities.length > 0) {
            if (hasOpportunities.includes('Yes')) fallbackQuery = fallbackQuery.gt('all_opps', 0);
            if (hasOpportunities.includes('No')) fallbackQuery = fallbackQuery.or('all_opps.is.null,all_opps.eq.0');
          }
          if (mostRecentContactStart) fallbackQuery = fallbackQuery.gte('most_recent_contact', mostRecentContactStart);
          if (mostRecentContactEnd) fallbackQuery = fallbackQuery.lte('most_recent_contact', mostRecentContactEnd);
          if (deltaMin !== null && deltaMin !== undefined) fallbackQuery = fallbackQuery.gte('delta', deltaMin);
          if (deltaMax !== null && deltaMax !== undefined) fallbackQuery = fallbackQuery.lte('delta', deltaMax);
          if (lgLead.length > 0) {
            const leadConditions = lgLead.map(lead => `lg_lead.ilike.%${lead}%`).join(',');
            fallbackQuery = fallbackQuery.or(leadConditions);
          }
          if (groupContacts.length > 0) fallbackQuery = fallbackQuery.in('group_contact', groupContacts);
          
          fallbackQuery = fallbackQuery
            .order('most_recent_contact', { ascending: false, nullsFirst: false })
            .limit(2000);
          
          const { data: fallbackData, error: fallbackError } = await fallbackQuery;
          
          if (fallbackError) {
            console.error(`[Contacts#${reqId}] Fallback query (contacts_raw) failed:`, fallbackError);
            return;
          }

          // Check if this request is still the latest before updating state
          if (reqId !== requestIdRef.current) {
            console.log(`[Contacts#${reqId}] ⚠️ Discarding stale fallback result. Current request is #${requestIdRef.current}`);
            return;
          }
          
          // Use fallback data with empty opportunities and ensure required fields exist
          const fallbackContacts: ContactWithOpportunities[] = (fallbackData || []).map((contact: any) => ({
            id: contact.id,
            full_name: contact.full_name ?? null,
            // Override with accurate computed values
            of_emails: contact.computed?.of_emails ?? contact.of_emails,
            of_meetings: contact.computed?.of_meetings ?? contact.of_meetings,
            total_of_contacts: contact.computed?.total_of_contacts ?? contact.total_of_contacts,
            days_since_last_email: contact.computed?.days_since_last_email ?? contact.days_since_last_email,
            days_since_last_meeting: contact.computed?.days_since_last_meeting ?? contact.days_since_last_meeting,
            contact_type: contact.computed?.contact_type ?? contact.contact_type,
        first_name: contact.first_name ?? null,
        last_name: contact.last_name ?? null,
        email_address: contact.email_address ?? null,
        phone: contact.phone ?? null,
        group_email_role: contact.group_email_role ?? null,
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
        delta_type: contact.delta_type ?? null,
        notes: contact.notes ?? null,
        url_to_online_bio: contact.url_to_online_bio ?? null,
        most_recent_contact: contact.most_recent_contact ?? null,
        latest_contact_email: contact.latest_contact_email ?? null,
        latest_contact_meeting: contact.latest_contact_meeting ?? null,
        outreach_date: contact.outreach_date ?? null,
        email_subject: contact.email_subject ?? null,
        meeting_title: contact.meeting_title ?? null,
        delta: contact.delta ?? null,
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
            group_contact: contact.group_contact && contact.group_contact.trim() !== '' ? contact.group_contact : null,
            most_recent_group_contact: contact.most_recent_group_contact ?? null,
            intentional_no_outreach: contact.intentional_no_outreach ?? null,
            intentional_no_outreach_date: contact.intentional_no_outreach_date ?? null,
            intentional_no_outreach_note: contact.intentional_no_outreach_note ?? null,
            opportunities: ''
          }));
          
          console.log(`[Contacts#${reqId}] ✅ Fallback result:`, fallbackContacts.length, 'contacts');
          setContacts(fallbackContacts);
          return;
        } catch (fallbackErr) {
          console.error(`[Contacts#${reqId}] Fallback failed:`, fallbackErr);
          return;
        }
      }

      // Optimize: Fetch opportunities only for the filtered contact IDs
      const contactIds = (contactsData || []).map(c => c.id);
      console.log(`[Contacts#${reqId}] Fetching opportunities for ${contactIds.length} filtered contacts...`);
      
      // Batch processing to avoid URL length limits
      const BATCH_SIZE = 100;
      const batches: string[][] = [];
      
      for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
        batches.push(contactIds.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`[Contacts#${reqId}] Processing ${batches.length} batches of opportunities...`);
      
      // Fetch all batches in parallel
      const batchResults = await Promise.allSettled(
        batches.map((batch, index) => 
          supabase
            .from('contacts_with_opportunities_v')
            .select('id, opportunities')
            .in('id', batch)
            .then(result => ({ ...result, batchIndex: index }))
        )
      );
      
      // Build a simple map: contact id -> opportunities string
      const oppsMap = new Map<string, string>();
      let successfulBatches = 0;
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data) {
          successfulBatches++;
          result.value.data.forEach(row => {
            if (row.id && row.opportunities) {
              oppsMap.set(row.id, row.opportunities);
            }
          });
        } else if (result.status === 'rejected') {
          console.error(`[Contacts#${reqId}] Batch ${index + 1}/${batches.length} failed:`, result.reason);
        }
      });
      
      console.log(`[Contacts#${reqId}] Successfully processed ${successfulBatches}/${batches.length} batches`);

      console.log(`[Contacts#${reqId}] Opportunities map built:`, oppsMap.size, 'contacts have opportunities');

      // Attach opportunities to each contact with proper null handling for group fields
      const contactsWithOpportunities = contactsData?.map(contact => ({
        ...contact,
        // Override with accurate computed values from contacts_computed
        of_emails: (contact as any).computed?.of_emails ?? (contact as any).of_emails,
        of_meetings: (contact as any).computed?.of_meetings ?? (contact as any).of_meetings,
        total_of_contacts: (contact as any).computed?.total_of_contacts ?? (contact as any).total_of_contacts,
        days_since_last_email: (contact as any).computed?.days_since_last_email ?? (contact as any).days_since_last_email,
        days_since_last_meeting: (contact as any).computed?.days_since_last_meeting ?? (contact as any).days_since_last_meeting,
        contact_type: (contact as any).computed?.contact_type ?? (contact as any).contact_type,
        group_email_role: (contact as any).group_email_role ?? null,
        group_contact: (contact as any).group_contact && (contact as any).group_contact.trim() !== '' ? (contact as any).group_contact : null,
        most_recent_group_contact: (contact as any).most_recent_group_contact ?? null,
        opportunities: oppsMap.get(contact.id) || ''
      })) || [];

      // Check if this request is still the latest before updating state
      if (reqId !== requestIdRef.current) {
        console.log(`[Contacts#${reqId}] ⚠️ Discarding stale result. Current request is #${requestIdRef.current}`);
        return;
      }

      const withOpps = contactsWithOpportunities.filter(c => c.opportunities).length;
      console.log(`[Contacts#${reqId}] ✅ Final result:`, contactsWithOpportunities.length, 'total contacts,', withOpps, 'with opportunities');

      setContacts(contactsWithOpportunities);
    } catch (error) {
      console.error(`[Contacts#${reqId}] Unexpected error:`, error);
    } finally {
      // Only clear loading flags if this is still the current request
      if (reqId === requestIdRef.current) {
        setLoading(false);
        setIsRefreshing(false);
        setIsFetching(false);
      } else {
        console.log(`[Contacts#${reqId}] ⚠️ Not clearing loading flags - superseded by #${requestIdRef.current}`);
      }
    }
  };

  return { contacts, loading, isRefreshing, refetch: fetchContactsWithOpportunities };
}