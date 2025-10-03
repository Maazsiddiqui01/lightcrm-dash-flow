import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify authentication and return user
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

interface GroupSuggestion {
  id: string;
  suggestedName: string;
  members: Array<{
    email: string;
    name?: string;
    contactId?: string;
    organization?: string;
  }>;
  interactionCount: number;
  lastInteraction: string;
  firstInteraction: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  sharedOrganization?: string;
  sampleSubjects: string[];
}

// Calculate Jaccard similarity between two sets
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Calculate cohesion score (how often ALL members appear together)
function calculateCohesion(
  members: Set<string>, 
  emailRecords: Array<{ emails: Set<string> }>
): number {
  let fullGroupCount = 0;
  let partialGroupCount = 0;
  
  for (const record of emailRecords) {
    const intersection = [...members].filter(m => record.emails.has(m));
    if (intersection.length === members.size) {
      fullGroupCount++;
    } else if (intersection.length >= 2) {
      partialGroupCount++;
    }
  }
  
  return fullGroupCount / Math.max(1, fullGroupCount + partialGroupCount);
}

// Extract domain from email
function getDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

// Calculate ML-based score
function calculateMLScore(features: {
  frequency: number;
  recency: number;
  consistency: number;
  cohesion: number;
  organizationMatch: number;
  size: number;
  maxFrequency: number;
}): number {
  const normalizedFreq = features.frequency / Math.max(1, features.maxFrequency);
  const normalizedRecency = features.recency / 180; // 180 days max
  const sizeScore = features.size >= 3 && features.size <= 8 ? 1 : 0.5;
  
  return (
    normalizedFreq * 0.25 +
    (1 - normalizedRecency) * 0.20 +
    features.consistency * 0.15 +
    features.cohesion * 0.15 +
    sizeScore * 0.10 +
    features.organizationMatch * 0.15
  ) * 100;
}

// Generate intelligent group name
function generateGroupName(
  members: Array<{ email: string; name?: string; organization?: string }>,
  subjects: string[],
  sharedOrg?: string
): string {
  // Priority 1: Shared organization
  if (sharedOrg) {
    return `${sharedOrg} Team`;
  }
  
  // Priority 2: Extract common keywords from subjects
  const stopwords = new Set(['re', 'fw', 'fwd', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  const wordFreq = new Map<string, number>();
  
  subjects.forEach(subject => {
    const words = subject.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopwords.has(w));
    
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
  });
  
  const topWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  
  if (topWords.length > 0) {
    return topWords.join(' ') + ' Group';
  }
  
  // Priority 3: Lead person name
  const leadPerson = members[0];
  if (leadPerson.name) {
    return `${leadPerson.name.split(' ')[0]} Group`;
  }
  
  // Fallback
  return 'Suggested Group';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user, supabase: authSupabase } = await verifyAuth(req);
    console.log(`Authenticated user: ${user.id}`);

    // Use service role key for data access (bypasses RLS for admin-level analysis)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting group suggestion analysis...');

    // Fetch interactions from last 180 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);
    
    const { data: interactions, error: interactionsError } = await supabase
      .from('emails_meetings_raw')
      .select('id, emails_arr, subject, occurred_at, organization, source')
      .gte('occurred_at', cutoffDate.toISOString())
      .order('occurred_at', { ascending: false });

    if (interactionsError) throw interactionsError;

    console.log(`Processing ${interactions?.length || 0} interactions`);

    // Fetch all contacts for enrichment
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts_raw')
      .select('id, email_address, full_name, organization, group_contact');

    if (contactsError) throw contactsError;

    // Build contact lookup
    const contactMap = new Map(
      (contacts || []).map(c => [c.email_address?.toLowerCase().trim(), {
        id: c.id,
        name: c.full_name,
        organization: c.organization,
        currentGroup: c.group_contact
      }])
    );

    // Build interaction graph using email co-occurrence
    const emailPairs = new Map<string, Map<string, number>>();
    const emailRecords: Array<{ emails: Set<string>; subject: string; date: Date; org?: string }> = [];
    const emailFirstSeen = new Map<string, Date>();
    const emailLastSeen = new Map<string, Date>();
    
    const internalDomain = 'lindsaygoldbergllc.com';
    const spamPatterns = ['no-reply', 'noreply', 'proofpoint', 'exchangelabs', 'bounce', 'mailer-daemon'];

    for (const interaction of interactions || []) {
      if (!interaction.emails_arr || interaction.emails_arr.length < 3) continue;

      // Filter and normalize emails
      const validEmails = interaction.emails_arr
        .map((e: string) => e?.toLowerCase().trim())
        .filter((e: string) => {
          if (!e || !e.includes('@')) return false;
          const domain = getDomain(e);
          if (domain === internalDomain) return false;
          if (spamPatterns.some(p => e.includes(p))) return false;
          return true;
        });

      if (validEmails.length < 3 || validEmails.length > 10) continue;

      const emailSet = new Set(validEmails);
      const interactionDate = new Date(interaction.occurred_at);
      
      emailRecords.push({
        emails: emailSet,
        subject: interaction.subject || '',
        date: interactionDate,
        org: interaction.organization
      });

      // Track first and last seen
      validEmails.forEach((email: string) => {
        if (!emailFirstSeen.has(email) || interactionDate < emailFirstSeen.get(email)!) {
          emailFirstSeen.set(email, interactionDate);
        }
        if (!emailLastSeen.has(email) || interactionDate > emailLastSeen.get(email)!) {
          emailLastSeen.set(email, interactionDate);
        }
      });

      // Build co-occurrence graph
      for (let i = 0; i < validEmails.length; i++) {
        for (let j = i + 1; j < validEmails.length; j++) {
          const email1 = validEmails[i];
          const email2 = validEmails[j];
          
          if (!emailPairs.has(email1)) {
            emailPairs.set(email1, new Map());
          }
          if (!emailPairs.has(email2)) {
            emailPairs.set(email2, new Map());
          }
          
          emailPairs.get(email1)!.set(email2, (emailPairs.get(email1)!.get(email2) || 0) + 1);
          emailPairs.get(email2)!.set(email1, (emailPairs.get(email2)!.get(email1) || 0) + 1);
        }
      }
    }

    console.log(`Built graph with ${emailPairs.size} nodes`);

    // Community detection using label propagation algorithm
    const communities = new Map<string, Set<string>>();
    const emailToCluster = new Map<string, string>();
    
    // Initialize: each email is its own cluster
    for (const email of emailPairs.keys()) {
      emailToCluster.set(email, email);
      communities.set(email, new Set([email]));
    }

    // Iterate until convergence (max 10 iterations)
    for (let iter = 0; iter < 10; iter++) {
      let changed = false;
      
      for (const [email, neighbors] of emailPairs.entries()) {
        const labelCounts = new Map<string, number>();
        
        // Count labels of neighbors weighted by edge strength
        for (const [neighbor, weight] of neighbors.entries()) {
          const label = emailToCluster.get(neighbor)!;
          labelCounts.set(label, (labelCounts.get(label) || 0) + weight);
        }
        
        // Choose most common label
        let maxLabel = emailToCluster.get(email)!;
        let maxCount = 0;
        for (const [label, count] of labelCounts.entries()) {
          if (count > maxCount) {
            maxCount = count;
            maxLabel = label;
          }
        }
        
        // Update if changed
        if (maxLabel !== emailToCluster.get(email)) {
          const oldLabel = emailToCluster.get(email)!;
          communities.get(oldLabel)?.delete(email);
          if (communities.get(oldLabel)?.size === 0) {
            communities.delete(oldLabel);
          }
          
          emailToCluster.set(email, maxLabel);
          if (!communities.has(maxLabel)) {
            communities.set(maxLabel, new Set());
          }
          communities.get(maxLabel)!.add(email);
          changed = true;
        }
      }
      
      if (!changed) break;
    }

    console.log(`Detected ${communities.size} communities`);

    // Score and filter communities
    const suggestions: GroupSuggestion[] = [];
    let maxFrequency = 0;

    for (const [_, memberEmails] of communities.entries()) {
      if (memberEmails.size < 3 || memberEmails.size > 10) continue;

      // Calculate interaction frequency
      const relevantRecords = emailRecords.filter(r => 
        [...memberEmails].every(m => r.emails.has(m)) ||
        [...memberEmails].filter(m => r.emails.has(m)).length >= 2
      );
      
      const frequency = relevantRecords.length;
      if (frequency < 3) continue;
      
      maxFrequency = Math.max(maxFrequency, frequency);

      // Calculate recency (days since last interaction)
      const lastInteraction = Math.max(
        ...[...memberEmails].map(e => emailLastSeen.get(e)?.getTime() || 0)
      );
      const firstInteraction = Math.min(
        ...[...memberEmails].map(e => emailFirstSeen.get(e)?.getTime() || Date.now())
      );
      const daysSinceLast = (Date.now() - lastInteraction) / (1000 * 60 * 60 * 24);

      // Calculate consistency (temporal distribution)
      const timeSpan = (lastInteraction - firstInteraction) / (1000 * 60 * 60 * 24);
      const consistency = timeSpan > 0 ? Math.min(1, frequency / (timeSpan / 7)) : 0;

      // Calculate cohesion
      const cohesion = calculateCohesion(memberEmails, emailRecords);

      // Check organization match
      const memberData = [...memberEmails].map(e => contactMap.get(e)).filter(Boolean);
      const orgs = memberData.map(m => m?.organization).filter(Boolean);
      const orgCounts = new Map<string, number>();
      orgs.forEach(org => {
        if (org) orgCounts.set(org, (orgCounts.get(org) || 0) + 1);
      });
      const dominantOrg = Array.from(orgCounts.entries())
        .sort((a, b) => b[1] - a[1])[0];
      const organizationMatch = dominantOrg ? dominantOrg[1] / memberEmails.size : 0;
      const sharedOrganization = organizationMatch >= 0.8 ? dominantOrg?.[0] : undefined;

      // Collect sample subjects
      const sampleSubjects = relevantRecords
        .map(r => r.subject)
        .filter(Boolean)
        .slice(0, 5);

      // Build member list with enrichment
      const members = [...memberEmails].map(email => {
        const contactInfo = contactMap.get(email);
        return {
          email,
          name: contactInfo?.name,
          contactId: contactInfo?.id,
          organization: contactInfo?.organization,
          currentGroup: contactInfo?.currentGroup
        };
      }).filter(m => m.contactId); // Only include members who exist in contacts

      if (members.length < 3) continue;

      // Calculate ML score
      const score = calculateMLScore({
        frequency,
        recency: daysSinceLast,
        consistency,
        cohesion,
        organizationMatch,
        size: members.length,
        maxFrequency: 1 // Will normalize later
      });

      suggestions.push({
        id: crypto.randomUUID(),
        suggestedName: generateGroupName(members, sampleSubjects, sharedOrganization),
        members: members.map(({ currentGroup, ...m }) => m),
        interactionCount: frequency,
        lastInteraction: new Date(lastInteraction).toISOString(),
        firstInteraction: new Date(firstInteraction).toISOString(),
        score,
        confidence: score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low',
        sharedOrganization,
        sampleSubjects
      });
    }

    // Normalize scores with actual max frequency
    suggestions.forEach(s => {
      const features = {
        frequency: s.interactionCount,
        recency: (Date.now() - new Date(s.lastInteraction).getTime()) / (1000 * 60 * 60 * 24),
        consistency: 0.8, // Placeholder
        cohesion: 0.8, // Placeholder
        organizationMatch: s.sharedOrganization ? 0.8 : 0.3,
        size: s.members.length,
        maxFrequency
      };
      s.score = calculateMLScore(features);
      s.confidence = s.score >= 75 ? 'high' : s.score >= 50 ? 'medium' : 'low';
    });

    // Deduplicate overlapping groups (keep higher score)
    const finalSuggestions = suggestions.filter((s1, i) => {
      for (let j = i + 1; j < suggestions.length; j++) {
        const s2 = suggestions[j];
        const set1 = new Set(s1.members.map(m => m.email));
        const set2 = new Set(s2.members.map(m => m.email));
        const similarity = jaccardSimilarity(set1, set2);
        
        if (similarity >= 0.7) {
          return s1.score >= s2.score;
        }
      }
      return true;
    });

    // Sort by score and return top 20
    const topSuggestions = finalSuggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    console.log(`Returning ${topSuggestions.length} suggestions`);

    return new Response(
      JSON.stringify({ suggestions: topSuggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest_contact_groups:', error);
    
    // Return 401 for authentication errors
    if (error.message?.includes('authorization') || error.message?.includes('authentication')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
