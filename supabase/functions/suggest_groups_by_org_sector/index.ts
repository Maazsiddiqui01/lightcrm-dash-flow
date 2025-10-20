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
  sector: string;
  domain: string;
  members: GroupMember[];
  memberCount: number;
  confidence: 'high';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching contacts for organization/sector grouping...');

    // Fetch all contacts with organization, sector, email, and focus areas
    const { data: contacts, error } = await supabase
      .from('contacts_raw')
      .select('id, email_address, full_name, organization, lg_sector, lg_focus_areas_comprehensive_list')
      .not('email_address', 'is', null)
      .not('organization', 'is', null)
      .not('lg_sector', 'is', null); // Exclude contacts with no sector

    if (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }

    console.log(`Fetched ${contacts.length} contacts`);

    // Extract domain from email and group by domain + sector
    const groupMap = new Map<string, ContactData[]>();

    for (const contact of contacts as ContactData[]) {
      // Skip internal domain
      if (contact.email_address.toLowerCase().includes('lindsaygoldbergllc.com')) {
        continue;
      }

      // Extract domain from email
      const emailParts = contact.email_address.split('@');
      if (emailParts.length !== 2) continue;
      
      const domain = emailParts[1].toLowerCase().trim();
      const sector = contact.lg_sector?.trim() || '';
      
      if (!domain || !sector) continue;

      // Create a key: domain + sector
      const groupKey = `${domain}|||${sector}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(contact);
    }

    console.log(`Found ${groupMap.size} unique domain+sector combinations`);

    // Convert to suggestions, filter groups with 2+ members
    const suggestions: GroupSuggestion[] = [];

    for (const [groupKey, members] of groupMap.entries()) {
      if (members.length < 2) continue; // Minimum 2 members

      const [domain, sector] = groupKey.split('|||');
      
      // Use the organization name from the first contact (they should all be same org)
      const organization = members[0].organization;
      
      const groupMembers: GroupMember[] = members.map(contact => ({
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
        suggestedName: `${organization} - ${sector}`,
        organization,
        sector,
        domain,
        members: groupMembers,
        memberCount: members.length,
        confidence: 'high' // Always high for structural data
      });
    }

    // Sort alphabetically by organization name, then by sector
    suggestions.sort((a, b) => {
      const orgCompare = a.organization.localeCompare(b.organization);
      if (orgCompare !== 0) return orgCompare;
      return a.sector.localeCompare(b.sector);
    });

    console.log(`Returning ${suggestions.length} group suggestions`);

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
