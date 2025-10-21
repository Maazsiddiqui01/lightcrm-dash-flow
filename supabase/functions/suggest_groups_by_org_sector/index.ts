import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactData {
  id: string;
  email_address: string;
  full_name: string;
  organization: string;
  lg_sector: string;
  lg_focus_areas_comprehensive_list: string;
}

interface GroupMember {
  email: string;
  name: string;
  contactId: string;
  organization: string;
  focusAreas: string[];
}

interface GroupSuggestion {
  id: string;
  suggestedName: string;
  organization: string;
  sector?: string;
  focusArea?: string;
  domain: string;
  members: GroupMember[];
  memberCount: number;
  confidence: 'high';
}

// Combined Focus Area Rules - treat these as equivalent
const COMBINED_FOCUS_AREAS: Record<string, string[]> = {
  'Healthcare Services': [
    'HC: Services (Non-Clinical)',
    'HC: Life Sciences',
    'Life Sciences'
  ],
  'Financial Services': [
    'Financial Services',
    'Insurance',
    'Insurance Services/Wealth Management',
    'Wealth Management'
  ],
  'Food & Agriculture': [
    'Food & Agriculture',
    'Food & Beverage Services',
    'Food Manufacturing'
  ],
  'Capital Equipment': [
    'Capital Goods',
    'Capital Goods / Equipment',
    'Equipment',
    'Manufacturing'
  ]
};

// Normalize focus area using combined rules
function normalizeFocusArea(focusArea: string): string {
  const trimmed = focusArea.trim();
  
  for (const [canonical, variations] of Object.entries(COMBINED_FOCUS_AREAS)) {
    if (variations.some(v => v.toLowerCase() === trimmed.toLowerCase())) {
      return canonical;
    }
  }
  
  return trimmed;
}

// Extract and normalize focus areas from a contact
function extractFocusAreas(contact: ContactData): string[] {
  if (!contact.lg_focus_areas_comprehensive_list) return [];
  
  return contact.lg_focus_areas_comprehensive_list
    .split(',')
    .map(fa => fa.trim())
    .filter(fa => fa.length > 0)
    .map(fa => normalizeFocusArea(fa));
}

// Check if member has a specific normalized focus area
function memberHasFocusArea(contact: ContactData, normalizedFocusArea: string): boolean {
  const memberFocusAreas = extractFocusAreas(contact);
  return memberFocusAreas.includes(normalizedFocusArea);
}

// Analyze focus areas within an organization
function analyzeFocusAreas(members: ContactData[]): { normalized: string, display: string, count: number }[] {
  const focusAreaCounts = new Map<string, { display: string, count: number }>();
  
  for (const member of members) {
    const focusAreas = extractFocusAreas(member);
    
    for (const normalizedFA of focusAreas) {
      const current = focusAreaCounts.get(normalizedFA) || { display: normalizedFA, count: 0 };
      current.count += 1;
      focusAreaCounts.set(normalizedFA, current);
    }
  }
  
  return Array.from(focusAreaCounts.entries())
    .map(([normalized, data]) => ({
      normalized,
      display: data.display,
      count: data.count
    }))
    .sort((a, b) => b.count - a.count);
}

// Group members by sector
function groupBySector(members: ContactData[]): Map<string, ContactData[]> {
  const sectorMap = new Map<string, ContactData[]>();
  
  for (const member of members) {
    const sector = member.lg_sector?.trim() || 'Unknown';
    
    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, []);
    }
    sectorMap.get(sector)!.push(member);
  }
  
  return sectorMap;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching contacts for organization/focus area grouping...');

    // Fetch all contacts with organization, sector, email, and focus areas
    const { data: contacts, error } = await supabase
      .from('contacts_raw')
      .select('id, email_address, full_name, organization, lg_sector, lg_focus_areas_comprehensive_list')
      .not('email_address', 'is', null)
      .not('organization', 'is', null);

    if (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }

    console.log(`Fetched ${contacts.length} contacts`);

    // Group by domain (email domain)
    const domainGroups = new Map<string, ContactData[]>();

    for (const contact of contacts as ContactData[]) {
      // Skip internal domain
      if (contact.email_address.toLowerCase().includes('lindsaygoldbergllc.com')) {
        continue;
      }

      // Extract domain from email
      const emailParts = contact.email_address.split('@');
      if (emailParts.length !== 2) continue;
      
      const domain = emailParts[1].toLowerCase().trim();
      
      if (!domain) continue;

      if (!domainGroups.has(domain)) {
        domainGroups.set(domain, []);
      }
      domainGroups.get(domain)!.push(contact);
    }

    console.log(`Found ${domainGroups.size} unique domains`);

    // Process each domain group
    const suggestions: GroupSuggestion[] = [];

    for (const [domain, members] of domainGroups.entries()) {
      // Minimum 2 members per group
      if (members.length < 2) continue;

      const organization = members[0].organization;

      // Analyze focus areas
      const focusAreaAnalysis = analyzeFocusAreas(members);
      
      // Find strong focus areas (≥3 contacts)
      const strongFocusAreas = focusAreaAnalysis.filter(fa => fa.count >= 3);

      if (strongFocusAreas.length > 0) {
        // Create one group per strong focus area
        for (const focusArea of strongFocusAreas) {
          const focusAreaMembers = members.filter(m => 
            memberHasFocusArea(m, focusArea.normalized)
          );

          const groupMembers: GroupMember[] = focusAreaMembers.map(contact => ({
            email: contact.email_address,
            name: contact.full_name,
            contactId: contact.id,
            organization: contact.organization,
            focusAreas: contact.lg_focus_areas_comprehensive_list
              ? contact.lg_focus_areas_comprehensive_list.split(',').map(fa => fa.trim()).filter(Boolean)
              : []
          }));

          suggestions.push({
            id: crypto.randomUUID(),
            suggestedName: `${organization} – ${focusArea.display}`,
            organization,
            focusArea: focusArea.display,
            domain,
            members: groupMembers,
            memberCount: groupMembers.length,
            confidence: 'high'
          });
        }
      } else {
        // Fallback to sector grouping
        const sectorGroups = groupBySector(members);

        for (const [sector, sectorMembers] of sectorGroups.entries()) {
          if (sectorMembers.length < 2) continue;

          const groupMembers: GroupMember[] = sectorMembers.map(contact => ({
            email: contact.email_address,
            name: contact.full_name,
            contactId: contact.id,
            organization: contact.organization,
            focusAreas: contact.lg_focus_areas_comprehensive_list
              ? contact.lg_focus_areas_comprehensive_list.split(',').map(fa => fa.trim()).filter(Boolean)
              : []
          }));

          suggestions.push({
            id: crypto.randomUUID(),
            suggestedName: `${organization} – ${sector}`,
            organization,
            sector,
            domain,
            members: groupMembers,
            memberCount: sectorMembers.length,
            confidence: 'high'
          });
        }
      }
    }

    // Sort alphabetically by organization name, then by focus area/sector
    suggestions.sort((a, b) => {
      const orgCompare = a.organization.localeCompare(b.organization);
      if (orgCompare !== 0) return orgCompare;
      
      const aName = a.focusArea || a.sector || '';
      const bName = b.focusArea || b.sector || '';
      return aName.localeCompare(bName);
    });

    console.log(`Returning ${suggestions.length} group suggestions`);
    console.log(`Focus area groups: ${suggestions.filter(s => s.focusArea).length}`);
    console.log(`Sector groups: ${suggestions.filter(s => s.sector).length}`);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest_groups_by_org_sector:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
