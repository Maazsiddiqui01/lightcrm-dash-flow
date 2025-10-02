import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting group suggestion analysis...");

    // Fetch email interactions from last 180 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);

    const { data: interactions, error } = await supabase
      .from('emails_meetings_raw')
      .select('id, emails_arr, subject, occurred_at, organization, source')
      .gte('occurred_at', cutoffDate.toISOString())
      .ilike('source', '%email%')
      .order('occurred_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    console.log(`Analyzing ${interactions?.length || 0} email interactions...`);

    // Fetch existing contacts for matching
    const { data: contacts } = await supabase
      .from('contacts_raw')
      .select('id, email_address, full_name, organization');

    const contactMap = new Map(
      contacts?.map(c => [c.email_address?.toLowerCase(), c]) || []
    );

    // Track participant combinations
    const participantGroups = new Map<string, {
      emails: Set<string>;
      count: number;
      firstSeen: string;
      lastSeen: string;
      subjects: string[];
      organizations: Set<string>;
    }>();

    const lgDomain = '@lindsaygoldbergllc.com';
    const excludePatterns = ['noreply', 'no-reply', 'donotreply', 'proofpoint', 'notifications'];

    for (const interaction of interactions || []) {
      if (!interaction.emails_arr || interaction.emails_arr.length < 3) continue;

      // Filter out internal and spam emails
      const validEmails = interaction.emails_arr
        .filter((email: string) => {
          const lower = email.toLowerCase();
          return !lower.includes(lgDomain) &&
                 !excludePatterns.some(pattern => lower.includes(pattern));
        })
        .map((e: string) => e.toLowerCase());

      if (validEmails.length < 2 || validEmails.length > 10) continue;

      // Create a sorted key for this group
      const groupKey = [...validEmails].sort().join('|');

      if (!participantGroups.has(groupKey)) {
        participantGroups.set(groupKey, {
          emails: new Set(validEmails),
          count: 0,
          firstSeen: interaction.occurred_at,
          lastSeen: interaction.occurred_at,
          subjects: [],
          organizations: new Set(),
        });
      }

      const group = participantGroups.get(groupKey)!;
      group.count++;
      group.lastSeen = interaction.occurred_at;
      if (group.subjects.length < 5 && interaction.subject) {
        group.subjects.push(interaction.subject);
      }
      if (interaction.organization) {
        group.organizations.add(interaction.organization);
      }
    }

    console.log(`Found ${participantGroups.size} potential groups`);

    // Score and rank groups
    const suggestions: GroupSuggestion[] = [];
    const now = new Date();
    const maxCount = Math.max(...Array.from(participantGroups.values()).map(g => g.count), 1);

    for (const [key, group] of participantGroups.entries()) {
      if (group.count < 3) continue; // Minimum interaction threshold

      const daysSinceLast = Math.floor((now.getTime() - new Date(group.lastSeen).getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceFirst = Math.floor((now.getTime() - new Date(group.firstSeen).getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate scores
      const frequencyScore = (group.count / maxCount) * 100;
      const recencyScore = Math.max(0, 100 - (daysSinceLast / 180) * 100);
      const consistencyScore = daysSinceFirst > 0 ? (group.count / daysSinceFirst) * 100 : 50;
      const sizeScore = group.emails.size >= 2 && group.emails.size <= 8 ? 100 : 50;

      const totalScore = (
        frequencyScore * 0.4 +
        recencyScore * 0.3 +
        consistencyScore * 0.2 +
        sizeScore * 0.1
      );

      if (totalScore < 40) continue; // Score threshold

      // Build member list
      const members = Array.from(group.emails).map(email => {
        const contact = contactMap.get(email);
        return {
          email,
          name: contact?.full_name,
          contactId: contact?.id,
          organization: contact?.organization,
        };
      });

      // Generate name
      const sharedOrg = group.organizations.size === 1 ? Array.from(group.organizations)[0] : undefined;
      const suggestedName = sharedOrg 
        ? `${sharedOrg} Team`
        : `Group - ${Array.from(group.emails)[0].split('@')[0]}`;

      const confidence = totalScore > 80 ? 'high' : totalScore > 60 ? 'medium' : 'low';

      suggestions.push({
        id: crypto.randomUUID(),
        suggestedName,
        members,
        interactionCount: group.count,
        lastInteraction: group.lastSeen,
        firstInteraction: group.firstSeen,
        score: Math.round(totalScore),
        confidence,
        sharedOrganization: sharedOrg,
        sampleSubjects: group.subjects,
      });
    }

    // Sort by score and return top 20
    suggestions.sort((a, b) => b.score - a.score);
    const topSuggestions = suggestions.slice(0, 20);

    console.log(`Returning ${topSuggestions.length} top suggestions`);

    return new Response(
      JSON.stringify({ suggestions: topSuggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest_contact_groups:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
