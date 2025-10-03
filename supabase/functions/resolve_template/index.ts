import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user } = await verifyAuth(req);
    console.log(`Authenticated user: ${user.id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { template_id, contact_id, faList, hasOpps, lagDays } = await req.json();

    console.log('Resolving template:', { template_id, contact_id, faList, hasOpps, lagDays });

    // Load template settings
    const { data: templateSettings } = await supabase
      .from('email_template_settings')
      .select('*')
      .eq('template_id', template_id)
      .maybeSingle();

    // Load phrase library (template-scoped + global)
    const { data: phrases } = await supabase
      .from('phrase_library')
      .select('*')
      .or(`template_id.eq.${template_id},template_id.is.null`)
      .eq('active', true)
      .order('scope', { ascending: true })
      .order('weight', { ascending: true });

    // Get rotation history
    const { data: rotationLog } = await supabase
      .from('phrase_rotation_log')
      .select('scope, phrase_id')
      .eq('template_id', template_id)
      .eq('contact_id', contact_id);

    // Default settings
    const defaultSettings = {
      core_overrides: {
        maxLagDays: 30,
        tone: 'auto',
        length: 'auto',
        subjectPools: ['formal'],
        meetingRequest: 'Sometimes'
      },
      modules: {
        order: ['Top Opportunities', 'Article Recommendations', 'Platforms', 'Add-ons', 'Suggested Talking Points', 'General Org Update', 'Attachments'],
        triState: {
          'Top Opportunities': 'Sometimes',
          'Article Recommendations': 'Sometimes',
          'Platforms': 'Sometimes',
          'Add-ons': 'Sometimes',
          'Suggested Talking Points': 'Sometimes',
          'General Org Update': 'Sometimes',
          'Attachments': 'Sometimes'
        }
      },
      sometimes_weights: {}
    };

    const settings = templateSettings ? {
      ...defaultSettings,
      ...templateSettings
    } : defaultSettings;

    // Compute tone/length from lag buckets unless overridden
    let tone = settings.core_overrides.tone;
    let length = settings.core_overrides.length;
    let subjectPools = settings.core_overrides.subjectPools;

    if (tone === 'auto') {
      if (lagDays <= 14) tone = 'casual';
      else if (lagDays <= 45) tone = 'neutral';
      else tone = 'formal';
    }

    if (length === 'auto') {
      if (lagDays <= 14) length = 'brief';
      else if (lagDays <= 45) length = 'mid';
      else length = 'long';
    }

    // Decide module inclusion with lag-based weights
    const includedModules: string[] = [];
    const weights = { ...settings.sometimes_weights };

    // Apply lag-based weight adjustments
    if (lagDays <= 14) {
      weights['Article Recommendations'] = (weights['Article Recommendations'] || 1.0) * 1.5;
      weights['Top Opportunities'] = (weights['Top Opportunities'] || 1.0) * 1.3;
      weights['General Org Update'] = (weights['General Org Update'] || 1.0) * 0.7;
    } else if (lagDays >= 46) {
      weights['General Org Update'] = (weights['General Org Update'] || 1.0) * 1.4;
      weights['Platforms'] = (weights['Platforms'] || 1.0) * 1.2;
      weights['Add-ons'] = (weights['Add-ons'] || 1.0) * 1.2;
      weights['Article Recommendations'] = (weights['Article Recommendations'] || 1.0) * 0.8;
    }

    for (const module of settings.modules.order) {
      const triState = settings.modules.triState[module];
      if (triState === 'Always') {
        includedModules.push(module);
      } else if (triState === 'Sometimes') {
        const weight = weights[module] || 1.0;
        if (Math.random() < weight * 0.7) { // Base 70% chance for Sometimes
          includedModules.push(module);
        }
      }
      // Never = skip
    }

    // Select phrases with rotation
    const usedInRotation = new Set(rotationLog?.map(r => `${r.scope}:${r.phrase_id}`) || []);
    const selectedPhrases: any = {};
    const newRotationEntries: any[] = [];

    const phrasesByScope = phrases?.reduce((acc: any, phrase) => {
      if (!acc[phrase.scope]) acc[phrase.scope] = [];
      acc[phrase.scope].push(phrase);
      return acc;
    }, {}) || {};

    for (const [scope, scopePhrases] of Object.entries(phrasesByScope) as [string, any][]) {
      const availablePhrases = scopePhrases.filter((p: any) => 
        p.tri_state !== 'Never' && !usedInRotation.has(`${scope}:${p.id}`)
      );
      
      if (availablePhrases.length === 0) {
        // Reset rotation for this scope
        const allNonNever = scopePhrases.filter((p: any) => p.tri_state !== 'Never');
        if (allNonNever.length > 0) {
          const selected = allNonNever[Math.floor(Math.random() * allNonNever.length)];
          selectedPhrases[scope] = selected.text_value;
          newRotationEntries.push({
            template_id,
            contact_id,
            scope,
            phrase_id: selected.id
          });
        }
      } else {
        const selected = availablePhrases[Math.floor(Math.random() * availablePhrases.length)];
        selectedPhrases[scope] = selected.text_value;
        newRotationEntries.push({
          template_id,
          contact_id,
          scope,
          phrase_id: selected.id
        });
      }
    }

    // Save rotation entries
    if (newRotationEntries.length > 0) {
      await supabase
        .from('phrase_rotation_log')
        .insert(newRotationEntries);
    }

    // Enforce at least 1 question priority
    let hasQuestion = false;
    if (includedModules.includes('Top Opportunities') && hasOpps) {
      hasQuestion = true;
    } else if (includedModules.includes('Article Recommendations')) {
      hasQuestion = true;
    } else if (faList.length > 0) {
      hasQuestion = true;
    }

    if (!hasQuestion && !includedModules.includes('Suggested Talking Points')) {
      includedModules.push('Suggested Talking Points');
    }

    // Build resolved block
    const resolved = {
      tone,
      length,
      subject_pool: subjectPools[0] || 'formal',
      chosen_subject: selectedPhrases['subject'] || `LG Update: ${faList.join(', ')}`,
      chosen_greeting: selectedPhrases['greeting'] || 'I hope you\'re well.',
      chosen_meeting_req: selectedPhrases['meeting_request'] || 'Happy to find time to touch base if you\'re available.',
      included_modules: includedModules,
      fa_defaults: faList.map((fa: string) => ({
        focus_area_label: fa,
        text_value: selectedPhrases[`fa_default_${fa}`] || `Discussing opportunities in ${fa}.`
      })),
      fa_platforms: faList.map((fa: string) => ({
        focus_area_label: fa,
        text_value: selectedPhrases[`fa_platform_${fa}`] || `Platform opportunities in ${fa}.`
      })),
      fa_addons: faList.map((fa: string) => ({
        focus_area_label: fa,
        text_value: selectedPhrases[`fa_addon_${fa}`] || `Add-on potential in ${fa}.`
      })),
      article_hint: includedModules.includes('Article Recommendations') ? {
        link: 'https://example.com/article',
        source: 'focus_area'
      } : null
    };

    console.log('Resolved template:', resolved);

    return new Response(JSON.stringify(resolved), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in resolve_template:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});