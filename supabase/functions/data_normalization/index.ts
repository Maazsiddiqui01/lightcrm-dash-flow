import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { scheduledDuplicateScan } from "./scheduled-scan.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify authentication
async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Invalid authentication');
  }

  return { user, supabase };
}

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

// Levenshtein distance for fuzzy string matching
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

// Calculate similarity score (0-100)
function similarityScore(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 100;
  
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;
  
  const distance = levenshteinDistance(s1, s2);
  return Math.round((1 - distance / maxLen) * 100);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user, supabase: authSupabase } = await verifyAuth(req);
    console.log(`Authenticated user: ${user.id}`);
    
    // Check if user is admin
    const { data: isAdmin } = await authSupabase.rpc('is_admin', {
      _user_id: user.id,
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { action, entityType, groupId, changes, preview, primaryId, contactIds, manual, scan_type } = await req.json();

    if (action === 'scan') {
      return await scanForNormalization(supabaseClient, preview);
    } else if (action === 'normalize') {
      return await applyNormalization(supabaseClient, changes);
    } else if (action === 'scan_duplicates') {
      return await scanForDuplicates(supabaseClient, entityType);
    } else if (action === 'scan_fuzzy_duplicates') {
      return await scanForFuzzyDuplicates(authSupabase, user.id, isAdmin);
    } else if (action === 'scheduled_duplicate_scan') {
      return await scheduledDuplicateScan(supabaseClient, scan_type);
    } else if (action === 'merge_duplicates') {
      return await mergeDuplicates(supabaseClient, groupId, entityType);
    } else if (action === 'merge_contacts') {
      return await mergeContacts(authSupabase, groupId, primaryId, user.id, contactIds);
    } else if (action === 'dismiss_duplicate_group') {
      return await dismissDuplicateGroup(authSupabase, groupId, user.id);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  } catch (error) {
    console.error('Error:', error);
    
    // Return 401 for authentication errors
    if (error.message?.includes('authorization') || error.message?.includes('authentication')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function scanForNormalization(supabase: any, preview: boolean = false) {
  console.log('Scanning for normalization issues...', preview ? '(PREVIEW MODE)' : '');

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

  // If preview mode, fetch sample records that will be affected
  let previewRecords = [];
  if (preview && focusAreaChanges.size > 0) {
    const { data: samples } = await supabase
      .from('contacts_raw')
      .select('id, full_name, organization, lg_focus_areas_comprehensive_list')
      .not('lg_focus_areas_comprehensive_list', 'is', null)
      .limit(5);
    previewRecords = samples || [];
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
    previewRecords: preview ? previewRecords : undefined,
  };

  console.log('Scan complete:', results);

  return new Response(
    JSON.stringify(results),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function applyNormalization(supabase: any, changes: any) {
  console.log('Applying normalization...');

  let totalUpdates = 0;

  // Apply focus area normalizations
  for (const change of changes.focusAreaChanges || []) {
    const { data, error } = await supabase.rpc('replace_text_in_column', {
      p_table: 'contacts_raw',
      p_column: 'lg_focus_areas_comprehensive_list',
      p_old_text: change.from,
      p_new_text: change.to
    });

    if (error) {
      console.error('Focus area normalization error:', error);
    } else {
      totalUpdates += data || 0;
      console.log(`Updated ${data || 0} records for focus area: ${change.from} → ${change.to}`);
    }
  }

  // Apply name normalizations
  for (const change of changes.nameChanges || []) {
    const { data: contacts, error: fetchError } = await supabase
      .from('contacts_raw')
      .select('id, full_name')
      .ilike('full_name', `${change.from}%`);

    if (fetchError) {
      console.error('Name fetch error:', fetchError);
      continue;
    }

    for (const contact of contacts || []) {
      const nameParts = contact.full_name.split(' ');
      const firstName = nameParts[0]?.toLowerCase();
      
      if (firstName === change.from.toLowerCase()) {
        const newFullName = [change.to, ...nameParts.slice(1)].join(' ');
        
        const { error: updateError } = await supabase
          .from('contacts_raw')
          .update({ full_name: newFullName })
          .eq('id', contact.id);

        if (updateError) {
          console.error('Name update error:', updateError);
        } else {
          totalUpdates++;
          console.log(`Updated name: ${contact.full_name} → ${newFullName}`);
        }
      }
    }
  }

  // Apply company suffix normalizations
  for (const change of changes.companyChanges || []) {
    const { data: contacts, error: fetchError } = await supabase
      .from('contacts_raw')
      .select('id, organization')
      .not('organization', 'is', null)
      .ilike('organization', `%${change.from}`);

    if (fetchError) {
      console.error('Company fetch error:', fetchError);
      continue;
    }

    for (const contact of contacts || []) {
      const words = contact.organization.split(' ');
      const lastWord = words[words.length - 1]?.toLowerCase().replace(/[.,]/g, '');
      
      if (lastWord === change.from.toLowerCase()) {
        // Replace last word with standardized suffix
        const newOrganization = [...words.slice(0, -1), change.to].join(' ');
        
        const { error: updateError } = await supabase
          .from('contacts_raw')
          .update({ organization: newOrganization })
          .eq('id', contact.id);

        if (updateError) {
          console.error('Company update error:', updateError);
        } else {
          totalUpdates++;
          console.log(`Updated organization: ${contact.organization} → ${newOrganization}`);
        }
      }
    }
  }

  console.log(`Normalization complete: ${totalUpdates} total updates`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      totalUpdates,
      message: `Successfully normalized ${totalUpdates} records` 
    }),
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

// Fuzzy duplicate detection with human-in-the-loop
async function scanForFuzzyDuplicates(supabase: any, userId: string, isAdmin: boolean) {
  console.log('Scanning for fuzzy duplicate contacts...');

  // Get all contacts for the user (using authenticated client for RLS)
  let query = supabase
    .from('contacts_raw')
    .select('id, full_name, email_address, organization, most_recent_contact, of_emails, of_meetings, assigned_to, created_by')
    .not('email_address', 'is', null)
    .not('full_name', 'is', null);

  // If not admin, filter by user access
  if (!isAdmin) {
    query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
  }

  const { data: contacts, error: contactsError } = await query.order('full_name');

  if (contactsError) {
    console.error('Error fetching contacts:', contactsError);
    throw new Error(`Failed to fetch contacts: ${contactsError.message}`);
  }

  console.log(`Found ${contacts?.length || 0} contacts to analyze`);

  if (!contacts || contacts.length === 0) {
    return new Response(
      JSON.stringify({ groups: [], totalDuplicates: 0, avgConfidence: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch all email addresses for contacts
  const { data: allEmails } = await supabase
    .from('contact_email_addresses')
    .select('contact_id, email_address, email_type, is_primary')
    .in('contact_id', contacts.map(c => c.id));

  const emailsByContact = new Map<string, string[]>();
  for (const emailRec of allEmails || []) {
    if (!emailsByContact.has(emailRec.contact_id)) {
      emailsByContact.set(emailRec.contact_id, []);
    }
    emailsByContact.get(emailRec.contact_id)!.push(emailRec.email_address);
  }

  // Fetch dismissed duplicate groups to exclude
  const { data: dismissed } = await supabase
    .from('contact_duplicates')
    .select('contact_ids')
    .eq('status', 'dismissed');

  const dismissedPairs = new Set<string>();
  for (const d of dismissed || []) {
    const ids = d.contact_ids.sort();
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        dismissedPairs.add(`${ids[i]}-${ids[j]}`);
      }
    }
  }

  // Candidate bucketing for performance
  const domainBuckets = new Map<string, string[]>();
  const orgBuckets = new Map<string, string[]>();
  const nameBuckets = new Map<string, string[]>();

  for (const contact of contacts) {
    const domain = contact.email_address.split('@')[1]?.toLowerCase();
    if (domain) {
      if (!domainBuckets.has(domain)) domainBuckets.set(domain, []);
      domainBuckets.get(domain)!.push(contact.id);
    }

    const orgNorm = contact.organization?.toLowerCase().trim();
    if (orgNorm) {
      if (!orgBuckets.has(orgNorm)) orgBuckets.set(orgNorm, []);
      orgBuckets.get(orgNorm)!.push(contact.id);
    }

    const nameParts = contact.full_name.toLowerCase().split(' ');
    const lastName = nameParts[nameParts.length - 1];
    const nameKey = lastName[0] + lastName.slice(0, 3);
    if (!nameBuckets.has(nameKey)) nameBuckets.set(nameKey, []);
    nameBuckets.get(nameKey)!.push(contact.id);
  }

  const groups: any[] = [];
  const processed = new Set<string>();
  const contactMap = new Map(contacts.map(c => [c.id, c]));

  for (let i = 0; i < contacts.length; i++) {
    const contact1 = contacts[i];
    if (processed.has(contact1.id)) continue;

    const potentialDuplicates: any[] = [contact1];

    // Get candidate contacts from buckets
    const candidates = new Set<string>();
    const domain1 = contact1.email_address.split('@')[1]?.toLowerCase();
    if (domain1 && domainBuckets.has(domain1)) {
      domainBuckets.get(domain1)!.forEach(id => candidates.add(id));
    }
    const org1 = contact1.organization?.toLowerCase().trim();
    if (org1 && orgBuckets.has(org1)) {
      orgBuckets.get(org1)!.forEach(id => candidates.add(id));
    }
    const name1Parts = contact1.full_name.toLowerCase().split(' ');
    const lastName1 = name1Parts[name1Parts.length - 1];
    const nameKey1 = lastName1[0] + lastName1.slice(0, 3);
    if (nameBuckets.has(nameKey1)) {
      nameBuckets.get(nameKey1)!.forEach(id => candidates.add(id));
    }

    for (const candidateId of candidates) {
      if (candidateId === contact1.id || processed.has(candidateId)) continue;

      const contact2 = contactMap.get(candidateId);
      if (!contact2) continue;

      // Check if this pair was dismissed
      const pairKey = [contact1.id, contact2.id].sort().join('-');
      if (dismissedPairs.has(pairKey)) continue;

      const nameSimilarity = similarityScore(contact1.full_name, contact2.full_name);
      
      // Get all emails for both contacts
      const emails1 = emailsByContact.get(contact1.id) || [contact1.email_address];
      const emails2 = emailsByContact.get(contact2.id) || [contact2.email_address];
      
      // Check for cross-email matches (shared email addresses)
      const emailOverlap = emails1.filter(e => emails2.includes(e.toLowerCase()));
      
      // Calculate max email similarity
      let maxEmailSim = 0;
      for (const e1 of emails1) {
        for (const e2 of emails2) {
          maxEmailSim = Math.max(maxEmailSim, similarityScore(e1, e2));
        }
      }

      const emailDomain1 = contact1.email_address.split('@')[1]?.toLowerCase();
      const emailDomain2 = contact2.email_address.split('@')[1]?.toLowerCase();
      const orgSimilarity = contact1.organization && contact2.organization
        ? similarityScore(contact1.organization, contact2.organization)
        : 0;

      let confidence = 0;
      let matchReasons: string[] = [];

      // Perfect match: Shared email address
      if (emailOverlap.length > 0) {
        confidence = 100;
        matchReasons.push(`Shared email: ${emailOverlap[0]}`);
      }
      // High confidence: 95-100% name match + same email domain
      else if (nameSimilarity >= 95 && emailDomain1 === emailDomain2) {
        confidence = Math.round(nameSimilarity);
        matchReasons.push(`${nameSimilarity}% name match, same email domain (@${emailDomain1})`);
      }
      // Medium confidence: 85-94% name match + (same org OR high email similarity)
      else if (nameSimilarity >= 85 && nameSimilarity < 95) {
        if (orgSimilarity >= 80 && maxEmailSim >= 70) {
          confidence = Math.round((nameSimilarity + orgSimilarity + maxEmailSim) / 3);
          matchReasons.push(`${nameSimilarity}% name, ${orgSimilarity}% org, ${maxEmailSim}% email match`);
        } else if (emailDomain1 === emailDomain2) {
          confidence = Math.round(nameSimilarity);
          matchReasons.push(`${nameSimilarity}% name match, same domain`);
        }
      }
      // Low confidence: 70-84% name match + strong supporting evidence
      else if (nameSimilarity >= 70 && nameSimilarity < 85) {
        if (orgSimilarity >= 80 && maxEmailSim >= 70) {
          confidence = Math.round((nameSimilarity + orgSimilarity * 0.5 + maxEmailSim * 0.5) / 2);
          matchReasons.push(`${nameSimilarity}% name, ${orgSimilarity}% org, ${maxEmailSim}% email match`);
        } else if (emailDomain1 === emailDomain2 && nameSimilarity >= 80) {
          confidence = Math.round(nameSimilarity * 0.9);
          matchReasons.push(`${nameSimilarity}% name match, same domain`);
        }
      }

      // Only include if >= 70% confidence
      if (confidence >= 70) {
        potentialDuplicates.push({
          ...contact2,
          matchConfidence: confidence,
          matchReasons: matchReasons.join('; '),
          allEmails: emails2
        });
        processed.add(contact2.id);
      }
    }

    if (potentialDuplicates.length > 1) {
      // Sort by most_recent_contact, then by total interactions
      potentialDuplicates.sort((a, b) => {
        const dateA = a.most_recent_contact ? new Date(a.most_recent_contact).getTime() : 0;
        const dateB = b.most_recent_contact ? new Date(b.most_recent_contact).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        
        const interactionsA = (a.of_emails || 0) + (a.of_meetings || 0);
        const interactionsB = (b.of_emails || 0) + (b.of_meetings || 0);
        return interactionsB - interactionsA;
      });

      const suggestedPrimary = potentialDuplicates[0];
      const totalInteractions = (suggestedPrimary.of_emails || 0) + (suggestedPrimary.of_meetings || 0);
      const avgConfidence = potentialDuplicates.slice(1).reduce((sum, c) => sum + (c.matchConfidence || 70), 0) / (potentialDuplicates.length - 1);

      const allContactIds = potentialDuplicates.map(c => c.id);
      const emails1 = emailsByContact.get(contact1.id) || [contact1.email_address];

      groups.push({
        id: `fuzzy-${allContactIds.join(',')}`,
        confidence: Math.round(avgConfidence),
        matchReason: potentialDuplicates[1]?.matchReasons || 'Similar names and email domains',
        suggestedPrimary: suggestedPrimary.id,
        suggestedReason: suggestedPrimary.most_recent_contact 
          ? `Most recent: ${new Date(suggestedPrimary.most_recent_contact).toLocaleDateString()} (${totalInteractions} interactions)`
          : `${totalInteractions} total interactions`,
        records: potentialDuplicates.map(c => {
          const cEmails = emailsByContact.get(c.id) || [c.email_address];
          return {
            id: c.id,
            full_name: c.full_name,
            email: c.email_address,
            all_emails: cEmails,
            organization: c.organization,
            most_recent_contact: c.most_recent_contact,
            emails_count: c.of_emails || 0,
            meetings_count: c.of_meetings || 0,
            owner: c.assigned_to || c.created_by
          };
        })
      });
      
      processed.add(contact1.id);
    }
  }

  const totalDuplicates = groups.reduce((sum, g) => sum + g.records.length, 0);
  const avgConfidence = groups.length > 0 
    ? groups.reduce((sum, g) => sum + g.confidence, 0) / groups.length 
    : 0;

  console.log(`Found ${groups.length} potential duplicate groups (${totalDuplicates} total duplicates)`);

  return new Response(
    JSON.stringify({ groups, totalDuplicates, avgConfidence }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Enhanced merge contacts with multi-email support
async function mergeContacts(supabase: any, groupId: string | undefined, primaryId: string, userId: string, contactIdsParam?: string[]) {
  console.log(`Merging contacts for group ${groupId}, primary: ${primaryId}`);

  try {
    // Determine contact IDs from explicit list (manual merge) or from groupId
    let contactIds: string[] = [];
    if (Array.isArray(contactIdsParam) && contactIdsParam.length > 0) {
      contactIds = [...new Set(contactIdsParam.filter(Boolean))];
    } else if (groupId) {
      contactIds = groupId.replace('fuzzy-', '').split(',').filter(Boolean);
    }

    if (!contactIds || contactIds.length === 0) {
      throw new Error('No contact IDs provided for merge');
    }

    // Ensure the primary is included
    if (!contactIds.includes(primaryId)) {
      contactIds.push(primaryId);
    }

    console.log(`Contact IDs to merge: ${contactIds.join(', ')}`);

    // Get all contacts in the group (using authenticated client)
    const { data: groupContacts, error: fetchError } = await supabase
      .from('contacts_raw')
      .select('*')
      .in('id', contactIds);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw new Error(`Failed to fetch contacts: ${fetchError.message}`);
    }

    if (!groupContacts || groupContacts.length < 2) {
      throw new Error(`Insufficient contacts found (${groupContacts?.length || 0})`);
    }

    const primaryContact = groupContacts.find(c => c.id === primaryId);
    if (!primaryContact) {
      throw new Error('Primary contact not found in group');
    }

    const duplicateIds = groupContacts.filter(c => c.id !== primaryId).map(c => c.id);
    console.log(`Merging ${duplicateIds.length} duplicates into primary ${primaryId}`);

    // Only collect the primary email_address from each contact being merged
    const allEmails = new Set<string>();
    
    for (const contact of groupContacts) {
      if (contact.email_address) {
        const email = contact.email_address.toLowerCase().trim();
        if (email) {
          allEmails.add(email);
        }
      }
    }

    console.log(`Collected ${allEmails.size} unique emails from ${groupContacts.length} contacts`);

    // Insert/update all emails into contact_email_addresses for primary contact
    const primaryEmail = primaryContact.email_address?.toLowerCase().trim();
    for (const email of Array.from(allEmails)) {
      const isPrimary = email === primaryEmail;
      const { error: upsertError } = await supabase
        .from('contact_email_addresses')
        .upsert({
          contact_id: primaryId,
          email_address: email,
          email_type: isPrimary ? 'primary' : 'alternate',
          is_primary: isPrimary,
          source: 'merge',
          added_by: userId
        }, {
          onConflict: 'contact_id,email_address',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error(`Error upserting email ${email}:`, upsertError);
      }
    }

    // Whitelist of mergeable fields (exclude system fields and constrained fields)
    const mergeableFields = [
      'full_name', 'first_name', 'last_name', 'organization', 'title', 
      'phone', 'linkedin', 'notes', 'next_steps', 'next_steps_due_date',
      'lg_sector', 'lg_focus_area_1', 'lg_focus_area_2', 'lg_focus_area_3',
      'lg_focus_areas_comprehensive_list', 'areas_of_specialization',
      'category', 'contact_type', 'delta_type', 'group_delta',
      'group_email_role', 'group_contact', 'group_focus_area', 'group_sector',
      'group_notes', 'no_of_emails', 'no_of_meetings', 'total_no_of_contacts',
      'next_scheduled_outreach_date', 'assigned_to'
    ];

    // Build merged data from whitelisted fields only
    const mergedData: any = { id: primaryId };
    
    // Start with primary contact's values
    for (const field of mergeableFields) {
      if (field in primaryContact) {
        mergedData[field] = primaryContact[field];
      }
    }
    
    // Merge non-null values from duplicates
    for (const duplicate of groupContacts) {
      if (duplicate.id === primaryId) continue;
      
      for (const field of mergeableFields) {
        const value = duplicate[field];
        if (value !== null && value !== '' && 
            (mergedData[field] === null || mergedData[field] === '' || mergedData[field] === undefined)) {
          mergedData[field] = value;
        }
      }
    }

    // Special handling for date fields - keep the most recent (maximum) date
    const dateFieldsToMaximize = ['most_recent_contact', 'most_recent_group_contact'];
    
    for (const dateField of dateFieldsToMaximize) {
      let maxDate: string | null = mergedData[dateField];
      
      for (const contact of groupContacts) {
        const contactDate = contact[dateField];
        if (!contactDate) continue;
        
        if (!maxDate || new Date(contactDate) > new Date(maxDate)) {
          maxDate = contactDate;
        }
      }
      
      if (maxDate) {
        mergedData[dateField] = maxDate;
      }
    }
    
    // Explicitly preserve email_address from primary contact (never set to null)
    mergedData.email_address = primaryContact.email_address;
    
    console.log(`Updated most_recent_contact to: ${mergedData.most_recent_contact}`);
    console.log(`Preserving email_address: ${mergedData.email_address}`);

    // Update primary contact with merged data
    const { error: updateError } = await supabase
      .from('contacts_raw')
      .update(mergedData)
      .eq('id', primaryId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update primary contact: ${updateError.message}`);
    }

    // Update foreign key references
    const fullNames = groupContacts.map(c => c.full_name).filter(n => n);

    await supabase
      .from('opportunities_raw')
      .update({ deal_source_individual_1: primaryContact.full_name })
      .in('deal_source_individual_1', fullNames);

    await supabase
      .from('opportunities_raw')
      .update({ deal_source_individual_2: primaryContact.full_name })
      .in('deal_source_individual_2', fullNames);

    await supabase
      .from('contact_note_events')
      .update({ contact_id: primaryId })
      .in('contact_id', duplicateIds);

    await supabase
      .from('contact_email_builder_settings')
      .update({ contact_id: primaryId })
      .in('contact_id', duplicateIds);

    await supabase
      .from('contact_group_memberships')
      .update({ contact_id: primaryId })
      .in('contact_id', duplicateIds);

    await supabase
      .from('contact_intentional_no_outreach_events')
      .update({ contact_id: primaryId })
      .in('contact_id', duplicateIds);

    // Log the merge
    const { error: logError } = await supabase
      .from('duplicate_merge_log')
      .insert({
        entity_type: 'contacts',
        primary_record_id: primaryId,
        merged_record_ids: duplicateIds,
        merge_reason: `Fuzzy match merge - user approved`,
        data_preserved: { emails: Array.from(allEmails), full_names: fullNames },
        merged_by: userId
      });

    if (logError) {
      console.error('Log error:', logError);
    }

    // Delete duplicate contacts
    const { error: deleteError } = await supabase
      .from('contacts_raw')
      .delete()
      .in('id', duplicateIds);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Failed to delete duplicates: ${deleteError.message}`);
    }

    console.log(`Successfully merged ${duplicateIds.length} contacts into ${primaryId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        primaryId,
        mergedIds: duplicateIds,
        emailsPreserved: Array.from(allEmails).length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Merge error:', error);
    throw error;
  }
}

// Dismiss a duplicate group so it won't appear in future scans
async function dismissDuplicateGroup(supabase: any, groupId: string, userId: string) {
  console.log(`Dismissing duplicate group ${groupId}`);

  try {
    const contactIds = groupId.replace('fuzzy-', '').split(',');

    // Fetch contacts to get email for the duplicate record
    const { data: contacts } = await supabase
      .from('contacts_raw')
      .select('id, email_address, assigned_to, created_by')
      .in('id', contactIds);

    if (!contacts || contacts.length === 0) {
      throw new Error('Contacts not found');
    }

    const userIds = [...new Set(contacts.map(c => c.assigned_to || c.created_by).filter(Boolean))];
    const representativeEmail = contacts[0].email_address;

    // Insert or update in contact_duplicates
    const { error: upsertError } = await supabase
      .from('contact_duplicates')
      .upsert({
        email_address: representativeEmail,
        contact_ids: contactIds,
        user_ids: userIds,
        user_count: userIds.length,
        status: 'dismissed',
        resolution_note: 'Dismissed by user - not duplicates'
      }, {
        onConflict: 'email_address'
      });

    if (upsertError) {
      console.error('Dismiss error:', upsertError);
      throw new Error(`Failed to dismiss: ${upsertError.message}`);
    }

    console.log(`Successfully dismissed group ${groupId}`);

    return new Response(
      JSON.stringify({ success: true, groupId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Dismiss error:', error);
    throw error;
  }
}

async function mergeDuplicates(supabase: any, groupId: string, entityType: string) {
  console.log(`Merging ${entityType} duplicates for group ${groupId}...`);

  try {
    const tableName = entityType === 'contacts' ? 'contacts_raw' : 'opportunities_raw';
    
    // Parse group info from groupId (format: email or UUID)
    // Get all records that match the duplicate criteria using parameterized queries
    let query;
    if (groupId.includes('@')) {
      // Email-based grouping - use exact match instead of ILIKE to prevent injection
      const email = groupId.toLowerCase().trim();
      query = supabase
        .from(tableName)
        .select('*')
        .eq('email_address', email);
    } else {
      // UUID-based grouping - validate UUID format first
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(groupId)) {
        throw new Error('Invalid groupId format');
      }
      query = supabase
        .from(tableName)
        .select('*')
        .eq('id', groupId);
    }

    const { data: duplicateRecords, error: fetchError } = await query;

    if (fetchError || !duplicateRecords || duplicateRecords.length < 2) {
      throw new Error('Could not find duplicate records or insufficient records to merge');
    }

    console.log(`Found ${duplicateRecords.length} duplicate records`);

    // Determine primary record (most complete data, or first created)
    const primaryRecord = duplicateRecords.reduce((best, current) => {
      const bestScore = calculateCompletenessScore(best);
      const currentScore = calculateCompletenessScore(current);
      return currentScore > bestScore ? current : best;
    });

    console.log(`Primary record selected: ${primaryRecord.id}`);

    // Merge data from duplicates into primary
    const mergedData = { ...primaryRecord };
    const duplicateIds: string[] = [];

    for (const duplicate of duplicateRecords) {
      if (duplicate.id === primaryRecord.id) continue;
      
      duplicateIds.push(duplicate.id);
      
      // Merge non-null fields from duplicate into primary
      for (const [key, value] of Object.entries(duplicate)) {
        if (value !== null && value !== '' && 
            (mergedData[key] === null || mergedData[key] === '')) {
          mergedData[key] = value;
        }
      }
    }

    // Update primary record with merged data
    const { error: updateError } = await supabase
      .from(tableName)
      .update(mergedData)
      .eq('id', primaryRecord.id);

    if (updateError) {
      throw new Error(`Failed to update primary record: ${updateError.message}`);
    }

    console.log('Updated primary record with merged data');

    // Update foreign key references in related tables
    if (entityType === 'contacts') {
      // Update contact references in opportunities
      await supabase
        .from('opportunities_raw')
        .update({ deal_source_individual_1: mergedData.full_name })
        .in('deal_source_individual_1', duplicateRecords.map(d => d.full_name));

      await supabase
        .from('opportunities_raw')
        .update({ deal_source_individual_2: mergedData.full_name })
        .in('deal_source_individual_2', duplicateRecords.map(d => d.full_name));

      // Update contact notes
      await supabase
        .from('contact_note_events')
        .update({ contact_id: primaryRecord.id })
        .in('contact_id', duplicateIds);

      // Update email builder settings
      await supabase
        .from('contact_email_builder_settings')
        .update({ contact_id: primaryRecord.id })
        .in('contact_id', duplicateIds);

      console.log('Updated related table references');
    }

    // Delete duplicate records
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .in('id', duplicateIds);

    if (deleteError) {
      console.error('Failed to delete duplicates:', deleteError);
      // Don't throw - primary record was updated successfully
    } else {
      console.log(`Deleted ${duplicateIds.length} duplicate records`);
    }

    // Log the merge action
    const { error: logError } = await supabase
      .from('duplicate_merge_log')
      .insert({
        entity_type: entityType,
        primary_record_id: primaryRecord.id,
        merged_record_ids: duplicateIds,
        merge_reason: 'Manual merge via Data Maintenance',
        data_preserved: { 
          merged_count: duplicateIds.length,
          primary_completeness: calculateCompletenessScore(primaryRecord)
        }
      });

    if (logError) {
      console.error('Failed to log merge:', logError);
    }

    // Track the detection run
    await supabase
      .from('duplicate_detection_runs')
      .insert({
        entity_type: entityType,
        total_groups: 1,
        total_duplicates: duplicateIds.length,
        avg_confidence: 100
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Merged ${duplicateIds.length} duplicate records into primary record`,
        primaryId: primaryRecord.id,
        mergedIds: duplicateIds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Merge error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

// Helper function to calculate how complete a record is
function calculateCompletenessScore(record: any): number {
  let score = 0;
  const importantFields = [
    'full_name', 'email_address', 'organization', 'title',
    'phone', 'linkedin_url', 'areas_of_specialization',
    'lg_focus_areas_comprehensive_list', 'notes'
  ];
  
  for (const field of importantFields) {
    if (record[field] && record[field] !== '') {
      score++;
    }
  }
  
  return score;
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
