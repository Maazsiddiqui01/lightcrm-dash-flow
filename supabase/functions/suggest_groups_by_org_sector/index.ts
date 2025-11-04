import { createClient } from 'jsr:@supabase/supabase-js@2'

// Helper to generate stable suggestion ID
function generateStableSuggestionId(organization: string, focusAreaOrSector: string, memberEmails: string[]): string {
  const sortedEmails = [...memberEmails].sort().join('_');
  const baseString = `org_sector_${organization}_${focusAreaOrSector}_${sortedEmails}`;
  // Simple hash function for stable IDs
  let hash = 0;
  for (let i = 0; i < baseString.length; i++) {
    const char = baseString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `org_sector_${Math.abs(hash).toString(36)}`;
}

interface ContactData {
  id: string;
  email_address: string;
  full_name: string;
  organization: string;
  lg_sector: string;
  lg_focus_areas_comprehensive_list: string;
}

interface GroupMember {
  contact_id: string;
  email_address: string;
  full_name: string;
  organization: string;
  sector?: string;
  focus_areas: string[];
}

interface GroupSuggestion {
  suggestion_id: string;
  suggestedName: string;
  members: GroupMember[];
  organization: string;
  sector?: string;
  focusArea?: string;
  confidence: number;
}

// Function to check if the user is authenticated
async function isAuthenticated(req: Request, supabase: any): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.warn('No Authorization header provided');
    return false;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.warn('No token found in Authorization header');
    return false;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error) {
    console.error('Error getting user:', error);
    return false;
  }

  if (!user) {
    console.warn('User not found for token');
    return false;
  }

  return true;
}

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
    'Food Manufacturing',
    'Agriculture'
  ],
  'Manufacturing': [
    'Manufacturing',
    'Industrial Manufacturing',
    'Electronic Components',
    'Defense Manufacturing'
  ],
  'Technology': [
    'Technology',
    'Software',
    'IT Services',
    'SaaS'
  ],
  'Business Services': [
    'Business Services',
    'Professional Services',
    'Consulting'
  ]
};

function normalizeFocusArea(focusArea: string): string {
  focusArea = focusArea.trim();
  
  for (const [canonical, variations] of Object.entries(COMBINED_FOCUS_AREAS)) {
    if (variations.includes(focusArea)) {
      return canonical;
    }
  }
  
  return focusArea;
}

function extractFocusAreas(contact: ContactData): string[] {
  if (!contact.lg_focus_areas_comprehensive_list) return [];
  
  const areas = contact.lg_focus_areas_comprehensive_list
    .split(',')
    .map(a => a.trim())
    .filter(a => a.length > 0);
  
  return areas.map(normalizeFocusArea);
}

function memberHasFocusArea(contact: ContactData, normalizedFocusArea: string): boolean {
  const contactFocusAreas = extractFocusAreas(contact);
  return contactFocusAreas.includes(normalizedFocusArea);
}

function analyzeFocusAreas(members: ContactData[]): { normalized: string, display: string, count: number }[] {
  const focusAreaCounts = new Map<string, { display: string, count: number }>();
  
  for (const member of members) {
    const focusAreas = extractFocusAreas(member);
    
    for (const normalizedArea of focusAreas) {
      const current = focusAreaCounts.get(normalizedArea);
      if (current) {
        current.count++;
      } else {
        focusAreaCounts.set(normalizedArea, { display: normalizedArea, count: 1 });
      }
    }
  }
  
  return Array.from(focusAreaCounts.entries()).map(([normalized, data]) => ({
    normalized,
    display: data.display,
    count: data.count
  }));
}

function groupBySector(members: ContactData[]): Map<string, ContactData[]> {
  const sectorMap = new Map<string, ContactData[]>();
  
  for (const member of members) {
    if (!member.lg_sector) continue;
    
    const sector = member.lg_sector.trim();
    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, []);
    }
    sectorMap.get(sector)!.push(member);
  }
  
  return sectorMap;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: contacts, error } = await supabase
      .from('contacts_raw')
      .select('id, email_address, full_name, organization, lg_sector, lg_focus_areas_comprehensive_list')
      .not('organization', 'is', null)
      .not('organization', 'eq', '');

    if (error) throw error;

    const contactsData = contacts as ContactData[];
    
    const domainGroups = new Map<string, ContactData[]>();
    const INTERNAL_DOMAINS = ['example.com', 'localhost'];
    
    for (const contact of contactsData) {
      if (!contact.email_address || !contact.organization) continue;
      
      const emailParts = contact.email_address.toLowerCase().split('@');
      if (emailParts.length !== 2) continue;
      
      const domain = emailParts[1];
      if (INTERNAL_DOMAINS.includes(domain)) continue;
      
      const org = contact.organization.trim();
      if (org === '') continue;
      
      if (!domainGroups.has(org)) {
        domainGroups.set(org, []);
      }
      domainGroups.get(org)!.push(contact);
    }

    const suggestions: GroupSuggestion[] = [];
    
    for (const [organization, members] of domainGroups.entries()) {
      if (members.length < 2) continue;
      
      const focusAreaAnalysis = analyzeFocusAreas(members);
      const strongFocusAreas = focusAreaAnalysis.filter(fa => fa.count >= 3);
      
      if (strongFocusAreas.length > 0) {
        for (const focusArea of strongFocusAreas) {
          const groupMembers = members
            .filter(m => memberHasFocusArea(m, focusArea.normalized))
            .map(m => ({
              contact_id: m.id,
              email_address: m.email_address,
              full_name: m.full_name,
              organization: m.organization,
              sector: m.lg_sector,
              focus_areas: extractFocusAreas(m)
            }));
          
          if (groupMembers.length < 2) continue;
          
          const sector = members[0]?.lg_sector || '';
          const groupName = focusArea.display || sector || organization;
          const memberEmails = groupMembers.map(m => m.email_address);
          const suggestionId = generateStableSuggestionId(organization, focusArea.display || sector || '', memberEmails);
          
          suggestions.push({
            suggestion_id: suggestionId,
            suggestedName: groupName,
            members: groupMembers,
            organization,
            sector,
            focusArea: focusArea.display,
            confidence: Math.min(0.95, 0.7 + (focusArea.count / members.length) * 0.25)
          });
        }
      } else {
        const sectorGroups = groupBySector(members);
        
        for (const [sectorName, sectorMembers] of sectorGroups.entries()) {
          if (sectorMembers.length >= 2) {
            const groupName = `${organization} - ${sectorName}`;
            const memberEmails = sectorMembers.map(m => m.email_address);
            const suggestionId = generateStableSuggestionId(organization, sectorName, memberEmails);
            
            suggestions.push({
              suggestion_id: suggestionId,
              suggestedName: groupName,
              members: sectorMembers.map(m => ({
                contact_id: m.id,
                email_address: m.email_address,
                full_name: m.full_name,
                organization: m.organization,
                sector: m.lg_sector,
                focus_areas: extractFocusAreas(m)
              })),
              organization,
              sector: sectorName,
              confidence: 0.6
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
