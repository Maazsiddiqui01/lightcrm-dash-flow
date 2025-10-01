import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FocusAreaMapping {
  focus_area: string;
  sector: string;
}

// Common name variations mapping
const nameVariations: Record<string, string> = {
  'jeff': 'Jeffrey',
  'jeffery': 'Jeffrey',
  'jeffrey': 'Jeffrey',
  'bob': 'Robert',
  'bobby': 'Robert',
  'mike': 'Michael',
  'mikey': 'Michael',
  'liz': 'Elizabeth',
  'beth': 'Elizabeth',
  'jim': 'James',
  'jimmy': 'James',
  'bill': 'William',
  'billy': 'William',
  'dan': 'Daniel',
  'danny': 'Daniel',
  'dave': 'David',
  'tom': 'Thomas',
  'tommy': 'Thomas',
};

// Company suffix normalizations
const companySuffixes: Record<string, string> = {
  'corp': 'Corporation',
  'inc': 'Incorporated',
  'llc': 'Limited Liability Company',
  'ltd': 'Limited',
  'co': 'Company',
  'plc': 'Public Limited Company',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { action, entityType, groupId, changes } = await req.json();

    if (action === 'scan') {
      return await scanForNormalization(supabaseClient);
    } else if (action === 'normalize') {
      return await applyNormalization(supabaseClient, changes);
    } else if (action === 'scan_duplicates') {
      return await scanForDuplicates(supabaseClient, entityType);
    } else if (action === 'merge_duplicates') {
      return await mergeDuplicates(supabaseClient, groupId, entityType);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function scanForNormalization(supabase: any) {
  console.log('Scanning for normalization issues...');

  // Get focus area master mapping
  const { data: focusAreaMaster } = await supabase
    .from('lg_focus_area_master')
    .select('focus_area, sector')
    .eq('is_active', true);

  const validFocusAreas = new Set((focusAreaMaster || []).map((fa: FocusAreaMapping) => 
    fa.focus_area.toLowerCase().trim()
  ));

  // Scan contacts for non-standard focus areas
  const { data: contacts } = await supabase
    .from('contacts_raw')
    .select('id, lg_focus_areas_comprehensive_list, full_name, organization')
    .not('lg_focus_areas_comprehensive_list', 'is', null);

  const focusAreaChanges = new Map<string, { to: string; count: number }>();
  const nameChanges = new Map<string, { to: string; count: number }>();
  const companyChanges = new Map<string, { to: string; count: number }>();

  // Analyze focus areas
  for (const contact of contacts || []) {
    const focusAreas = contact.lg_focus_areas_comprehensive_list?.split(',') || [];
    
    for (const fa of focusAreas) {
      const trimmed = fa.trim();
      const normalized = trimmed.toLowerCase();
      
      if (!validFocusAreas.has(normalized)) {
        // Try to find a match
        const standardized = findStandardFocusArea(normalized, focusAreaMaster || []);
        if (standardized && standardized !== trimmed) {
          const key = `${trimmed}→${standardized}`;
          const existing = focusAreaChanges.get(key) || { to: standardized, count: 0 };
          focusAreaChanges.set(key, { ...existing, count: existing.count + 1 });
        }
      }
    }

    // Analyze names
    if (contact.full_name) {
      const firstName = contact.full_name.split(' ')[0]?.toLowerCase();
      const standardName = nameVariations[firstName];
      if (standardName && !contact.full_name.includes(standardName)) {
        const key = `${firstName}→${standardName}`;
        const existing = nameChanges.get(key) || { to: standardName, count: 0 };
        nameChanges.set(key, { ...existing, count: existing.count + 1 });
      }
    }

    // Analyze company names
    if (contact.organization) {
      const words = contact.organization.split(' ');
      const lastWord = words[words.length - 1]?.toLowerCase().replace(/[.,]/g, '');
      const standardSuffix = companySuffixes[lastWord];
      if (standardSuffix && !contact.organization.includes(standardSuffix)) {
        const key = `${lastWord}→${standardSuffix}`;
        const existing = companyChanges.get(key) || { to: standardSuffix, count: 0 };
        companyChanges.set(key, { ...existing, count: existing.count + 1 });
      }
    }
  }

  const results = {
    totalIssues: focusAreaChanges.size + nameChanges.size + companyChanges.size,
    focusAreaIssues: focusAreaChanges.size,
    nameVariations: nameChanges.size,
    companyVariations: companyChanges.size,
    focusAreaChanges: Array.from(focusAreaChanges.entries()).map(([key, value]) => ({
      from: key.split('→')[0],
      to: value.to,
      count: value.count
    })),
    nameChanges: Array.from(nameChanges.entries()).map(([key, value]) => ({
      from: key.split('→')[0],
      to: value.to,
      count: value.count
    })),
    companyChanges: Array.from(companyChanges.entries()).map(([key, value]) => ({
      from: key.split('→')[0],
      to: value.to,
      count: value.count
    })),
  };

  console.log('Scan complete:', results);

  return new Response(
    JSON.stringify(results),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function applyNormalization(supabase: any, changes: any) {
  console.log('Applying normalization...');

  // Apply focus area normalizations
  for (const change of changes.focusAreaChanges || []) {
    await supabase.rpc('replace_text_in_column', {
      p_table: 'contacts_raw',
      p_column: 'lg_focus_areas_comprehensive_list',
      p_old_text: change.from,
      p_new_text: change.to
    });
  }

  console.log('Normalization complete');

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function scanForDuplicates(supabase: any, entityType: string) {
  console.log(`Scanning for ${entityType} duplicates...`);

  if (entityType === 'contacts') {
    // Find duplicate contacts by email
    const { data: emailDupes } = await supabase
      .from('contacts_raw')
      .select('id, full_name, email_address, organization')
      .not('email_address', 'is', null)
      .order('email_address');

    // Group by email
    const groups: any[] = [];
    const emailMap = new Map<string, any[]>();

    for (const contact of emailDupes || []) {
      const email = contact.email_address.toLowerCase().trim();
      if (!emailMap.has(email)) {
        emailMap.set(email, []);
      }
      emailMap.get(email)!.push(contact);
    }

    let groupId = 1;
    for (const [email, records] of emailMap.entries()) {
      if (records.length > 1) {
        groups.push({
          id: `group-${groupId++}`,
          confidence: 100,
          matchReason: 'Exact email match',
          records: records.map(r => ({
            id: r.id,
            full_name: r.full_name,
            email: email,
            organization: r.organization
          }))
        });
      }
    }

    const totalDuplicates = groups.reduce((sum, g) => sum + g.records.length, 0);
    const avgConfidence = groups.length > 0 
      ? groups.reduce((sum, g) => sum + g.confidence, 0) / groups.length 
      : 0;

    return new Response(
      JSON.stringify({ groups, totalDuplicates, avgConfidence }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    // Opportunities deduplication
    return new Response(
      JSON.stringify({ groups: [], totalDuplicates: 0, avgConfidence: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function mergeDuplicates(supabase: any, groupId: string, entityType: string) {
  console.log(`Merging ${entityType} duplicates for group ${groupId}...`);

  // This is a placeholder - actual merge logic would:
  // 1. Select primary record (usually the one with most complete data)
  // 2. Merge data from other records into primary
  // 3. Update foreign key references
  // 4. Delete duplicate records
  // 5. Log the merge action

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function findStandardFocusArea(input: string, masterList: FocusAreaMapping[]): string | null {
  // Common abbreviations and variations
  const mappings: Record<string, string> = {
    'f&b': 'Food Manufacturing',
    'food & beverage': 'Food Manufacturing',
    'food and beverage': 'Food Manufacturing',
    'a&d': 'Aerospace & Defense',
    'aerospace': 'Aerospace & Defense',
    'defense': 'Aerospace & Defense',
    'hc': 'Healthcare',
    'healthcare it': 'HC: Tech Enablement',
    'health tech': 'HC: Tech Enablement',
    'tech': 'Technology Services',
    'it services': 'Technology Services',
    'mfg': 'Manufacturing',
    'manufacturing': 'Capital Goods / Equipment',
  };

  // Check direct mapping first
  if (mappings[input]) {
    return mappings[input];
  }

  // Try fuzzy match with master list
  for (const item of masterList) {
    const normalized = item.focus_area.toLowerCase().trim();
    if (normalized === input || normalized.includes(input) || input.includes(normalized)) {
      return item.focus_area;
    }
  }

  return null;
}
