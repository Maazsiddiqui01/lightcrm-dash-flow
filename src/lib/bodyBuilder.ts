/**
 * Local Email Body Builder
 * Constructs email body from phrases, modules, and flow
 * Handles token replacement and proper formatting
 */

import type { EnhancedDraftPayload } from './enhancedPayload';
import { interpolateContent } from './contentInterpolation';

/**
 * Token replacement using unified interpolation system
 */
function replaceTokens(
  text: string,
  payload: EnhancedDraftPayload
): string {
  // Convert payload to ContactEmailComposer format for interpolation
  const contactData = {
    contact_id: payload.contact.id,
    full_name: payload.contact.fullName,
    first_name: payload.contact.firstName,
    email: payload.contact.email,
    organization: payload.contact.organization,
    email_cc: null,
    meeting_cc: null,
    delta_type: null,
    focus_areas: payload.focusAreas.list,
    fa_count: payload.focusAreas.list.length,
    fa_sectors: payload.focusAreas.descriptions.map(d => d.sector),
    fa_descriptions: payload.focusAreas.descriptions.map(d => ({
      focus_area: d.focusArea,
      description: d.description,
      platform_type: d.platformAddon,
      sector: d.sector,
    })),
    gb_present: false,
    hs_present: false,
    ls_present: false,
    has_opps: payload.opportunities.hasOpps,
    opps: payload.opportunities.active_tier1.map(o => ({
      deal_name: o.dealName,
      ebitda_in_ms: o.ebitda,
    })),
    articles: payload.articles.available.map(a => ({
      focus_area: a.focusArea || '',
      article_link: a.link,
      last_date_to_use: a.lastDate,
    })),
    lead_emails: payload.cc.leads,
    assistant_names: [],
    assistant_emails: payload.cc.assistants,
    most_recent_contact: null,
    outreach_date: null,
  };

  return interpolateContent(
    text,
    contactData,
    payload.opportunities.active_tier1.map(o => ({
      deal_name: o.dealName,
      ebitda_in_ms: o.ebitda,
    })),
    payload.focusAreas.descriptions.map(d => ({
      focus_area: d.focusArea,
      description: d.description,
      platform_type: d.platformAddon,
      sector: d.sector,
    }))
  );
}

/**
 * Build complete email body from payload
 */
export function buildEmailBody(payload: EnhancedDraftPayload): string {
  const paragraphs: string[] = [];
  
  // Process each item in the flow
  for (const flowItem of payload.flow) {
    let paragraph = '';
    
    switch (flowItem) {
      case 'personal_hook':
      case 'self_personalization':
        // Personal hook from self_personalization phrases
        if (payload.content.phrases.self_personalization) {
          paragraph = replaceTokens(payload.content.phrases.self_personalization, payload);
        }
        break;
      
      case 'article':
      case 'article_recommendations':
        // Article recommendation
        if (payload.modules.article_recommendations && payload.content.phrases.article_recommendations) {
          paragraph = replaceTokens(payload.content.phrases.article_recommendations, payload);
        }
        break;
      
      case 'top_opportunities':
        // Top opportunities follow-up
        if (payload.modules.top_opportunities && payload.content.phrases.top_opportunities) {
          paragraph = replaceTokens(payload.content.phrases.top_opportunities, payload);
        }
        break;
      
      case 'inquiry':
        // Inquiry (required)
        if (payload.content.inquiry) {
          paragraph = replaceTokens(payload.content.inquiry.text, payload);
        }
        break;
      
      case 'platforms':
        // Platform opportunities
        if (payload.modules.platforms && payload.content.phrases.platforms) {
          paragraph = replaceTokens(payload.content.phrases.platforms, payload);
        }
        break;
      
      case 'addons':
        // Add-on opportunities
        if (payload.modules.addons && payload.content.phrases.addons) {
          paragraph = replaceTokens(payload.content.phrases.addons, payload);
        }
        break;
      
      case 'talking_points':
      case 'suggested_talking_points':
        // Sector talking points
        if (payload.modules.suggested_talking_points && payload.content.phrases.suggested_talking_points) {
          paragraph = replaceTokens(payload.content.phrases.suggested_talking_points, payload);
        }
        break;
      
      case 'org_update':
      case 'general_org_update':
        // General org update
        if (payload.modules.general_org_update && payload.content.phrases.general_org_update) {
          paragraph = replaceTokens(payload.content.phrases.general_org_update, payload);
        }
        break;
      
      case 'attachments':
        // Attachment mention
        if (payload.modules.attachments && payload.content.phrases.attachments) {
          paragraph = replaceTokens(payload.content.phrases.attachments, payload);
        }
        break;
      
      case 'team_mention':
        // Team CC/mention
        if (payload.modules.team_mention && payload.content.phrases.team_mention) {
          paragraph = replaceTokens(payload.content.phrases.team_mention, payload);
        }
        break;
      
      case 'focus_area_defaults':
        // Focus area default phrases
        if (payload.modules.focus_area_defaults && payload.content.phrases.focus_area_defaults) {
          paragraph = replaceTokens(payload.content.phrases.focus_area_defaults, payload);
        }
        break;
      
      case 'meeting_request':
        // Meeting request with assistant clause
        if (payload.modules.meeting_request && payload.content.phrases.meeting_request) {
          let mrText = replaceTokens(payload.content.phrases.meeting_request, payload);
          if (payload.content.assistantClause) {
            mrText += ' ' + payload.content.assistantClause;
          }
          paragraph = mrText;
        }
        break;
    }
    
    if (paragraph) {
      paragraphs.push(paragraph);
    }
  }
  
  // Add P.S. if enabled
  if (payload.modules.ps && payload.content.phrases.ps) {
    const psText = replaceTokens(payload.content.phrases.ps, payload);
    paragraphs.push(psText);
  }
  
  // Join with double line breaks for readability
  return paragraphs.join('\n\n');
}

/**
 * Format complete email with greeting, body, and signature
 */
export function formatCompleteEmail(payload: EnhancedDraftPayload): {
  subject: string;
  greeting: string;
  body: string;
  signature: string;
  to: string;
  ccList: string[];
} {
  const body = buildEmailBody(payload);
  
  // Apply token replacement to subject
  let subject = payload.content.subject;
  subject = replaceTokens(subject, payload);
  
  return {
    subject,
    greeting: payload.content.greeting || `Hi ${payload.contact.firstName}`,
    body,
    signature: payload.content.signature,
    to: `${payload.contact.fullName} <${payload.contact.email}>`,
    ccList: payload.cc.final,
  };
}

