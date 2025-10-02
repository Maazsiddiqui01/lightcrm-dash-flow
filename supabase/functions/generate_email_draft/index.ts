import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnhancedPayload {
  contact: {
    id: string;
    email: string;
    fullName: string;
    firstName: string;
    organization: string;
  };
  focusAreas: {
    list: string[];
    descriptions: Array<{
      focusArea: string;
      description: string;
      sector: string;
      platformAddon: string;
    }>;
    platforms: string[];
    addons: string[];
  };
  opportunities: {
    hasOpps: boolean;
    top: Array<{
      dealName: string;
      ebitda: number | null;
      tier: string | null;
    }>;
  };
  articles: {
    selected: string | null;
  };
  routing: {
    masterKey: string;
    tone: string;
    daysSinceContact: number;
  };
  content: {
    subject: string;
    greeting: string | null;
    phrases: Record<string, string>;
    inquiry: {
      text: string;
      category: string;
    } | null;
    signature: string;
    assistantClause: string;
  };
  modules: Record<string, boolean>;
  flow: string[];
}

/**
 * Build sophisticated system prompt based on tone and master template
 */
function buildSystemPrompt(tone: string, masterKey: string): string {
  const toneGuidance = {
    casual: "Write in a warm, conversational tone. Use contractions, personal touches, and friendly language. Keep it approachable.",
    hybrid: "Balance professionalism with warmth. Use a neutral, business-friendly tone that's neither too formal nor too casual.",
    formal: "Maintain a professional, polished tone. Use proper business language, avoid contractions, and keep a respectful distance.",
  };

  const templateGuidance = {
    relationship_maintenance: "Focus on maintaining the relationship. Keep it brief and personal. The goal is to stay top-of-mind without being pushy.",
    hybrid_neutral: "Balance relationship building with value delivery. Include relevant content while maintaining connection.",
    business_development: "Focus on providing value and building opportunities. Include substantive content about focus areas, opportunities, and insights.",
  };

  return `You are an expert email writer for Lindsay Goldberg, a private equity firm. Your task is to write professional, personalized outreach emails to business contacts.

${toneGuidance[tone as keyof typeof toneGuidance] || toneGuidance.hybrid}

${templateGuidance[masterKey as keyof typeof templateGuidance] || templateGuidance.hybrid_neutral}

CRITICAL RULES:
1. Use ONLY the phrases and inquiry provided - do not invent your own
2. Follow the exact content flow specified
3. Keep paragraphs short (2-3 sentences max)
4. Ensure natural transitions between sections
5. Maintain consistent tone throughout
6. Do NOT add greetings or signatures - they are provided separately
7. Focus on clarity and readability
8. Avoid buzzwords and jargon unless necessary

The email should feel authentic, personalized, and valuable to the recipient.`;
}

/**
 * Build comprehensive user prompt with all context
 */
function buildUserPrompt(payload: EnhancedPayload): string {
  const parts: string[] = [];

  // Contact context
  parts.push(`CONTACT: ${payload.contact.firstName} at ${payload.contact.organization}`);
  parts.push(`Days since last contact: ${payload.routing.daysSinceContact}`);

  // Focus areas context
  if (payload.focusAreas.list.length > 0) {
    parts.push(`\nFOCUS AREAS: ${payload.focusAreas.list.join(", ")}`);
    if (payload.focusAreas.descriptions.length > 0) {
      parts.push("\nFOCUS AREA DETAILS:");
      payload.focusAreas.descriptions.forEach(desc => {
        parts.push(`- ${desc.focusArea}: ${desc.description}`);
      });
    }
  }

  // Opportunities context
  if (payload.opportunities.hasOpps && payload.opportunities.top.length > 0) {
    parts.push("\nTOP OPPORTUNITIES:");
    payload.opportunities.top.forEach(opp => {
      const ebitdaStr = opp.ebitda ? ` (${opp.ebitda}M EBITDA)` : "";
      parts.push(`- ${opp.dealName}${ebitdaStr}`);
    });
  }

  // Article context
  if (payload.articles.selected) {
    parts.push(`\nSELECTED ARTICLE: ${payload.articles.selected}`);
  }

  // Content flow
  parts.push(`\nCONTENT FLOW TO FOLLOW: ${payload.flow.join(" → ")}`);

  // Provided phrases
  parts.push("\nPHRASES TO USE:");
  for (const [module, phrase] of Object.entries(payload.content.phrases)) {
    if (phrase) {
      parts.push(`[${module}]: "${phrase}"`);
    }
  }

  // Inquiry
  if (payload.content.inquiry) {
    parts.push(`\nINQUIRY TO INCLUDE: "${payload.content.inquiry.text}"`);
    parts.push(`(Inquiry category: ${payload.content.inquiry.category})`);
  }

  // Assistant clause
  if (payload.content.assistantClause) {
    parts.push(`\nASSISTANT CLAUSE: "${payload.content.assistantClause}"`);
  }

  // Instructions
  parts.push(`\nINSTRUCTIONS:
1. Write the email body ONLY (no greeting, no signature)
2. Follow the content flow exactly: ${payload.flow.join(" → ")}
3. Use the provided phrases naturally within the flow
4. Include the inquiry smoothly
5. If assistant clause is provided, include it with the meeting request
6. Keep paragraphs short and readable
7. Ensure smooth transitions between sections
8. Maintain ${payload.routing.tone} tone throughout

Write the email body now:`);

  return parts.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payload } = await req.json() as { payload: EnhancedPayload };
    
    if (!payload) {
      return new Response(
        JSON.stringify({ error: "Payload is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompts
    const systemPrompt = buildSystemPrompt(payload.routing.tone, payload.routing.masterKey);
    const userPrompt = buildUserPrompt(payload);

    console.log("Generating draft for:", payload.contact.fullName);
    console.log("Master template:", payload.routing.masterKey);
    console.log("Tone:", payload.routing.tone);
    console.log("Flow:", payload.flow.join(" → "));

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate draft" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in generate_email_draft:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
