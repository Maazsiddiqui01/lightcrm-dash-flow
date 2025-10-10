/**
 * Local Email Body Builder
 * Constructs email body from phrases, modules, and flow
 * Handles token replacement and proper formatting
 */

import type { EnhancedDraftPayload } from './enhancedPayload';

/**
 * Token replacement for placeholders in phrases
 */
function replaceTokens(
  text: string,
  payload: EnhancedDraftPayload
): string {
  let result = text;
  
  // First Name token
  result = result.replace(/\[First Name\]/g, payload.contact.firstName);
  result = result.replace(/\[first name\]/g, payload.contact.firstName.toLowerCase());
  
  // Focus Area tokens
  if (payload.focusAreas.list.length > 0) {
    result = result.replace(/\[Focus Area\]/g, payload.focusAreas.list[0]);
    result = result.replace(/\[focus area\]/g, payload.focusAreas.list[0].toLowerCase());
    result = result.replace(/\[LG Focus Area\]/g, payload.focusAreas.list[0]);
  }
  
  // Sector tokens
  if (payload.focusAreas.descriptions.length > 0) {
    const sector = payload.focusAreas.descriptions[0].sector;
    result = result.replace(/\[Sector\]/g, sector);
    result = result.replace(/\[sector\]/g, sector.toLowerCase());
  }
  
  // EBITDA tokens
  const ebitdaThreshold = payload.opportunities.hasOpps 
    ? Math.max(...payload.opportunities.active_tier1.map(o => o.ebitda || 30))
    : 30;
  result = result.replace(/\[EBITDA\]/g, String(ebitdaThreshold));
  result = result.replace(/\$\[EBITDA\]m/g, `$${ebitdaThreshold}m`);
  result = result.replace(/>\s*\$\[EBITDA\]m/g, `>$${ebitdaThreshold}m`);
  result = result.replace(/\>\$\[EBITDA\]m/g, `>$${ebitdaThreshold}m`);
  
  // Opportunity tokens
  if (payload.opportunities.hasOpps && payload.opportunities.active_tier1.length > 0) {
    const topOpp = payload.opportunities.active_tier1[0];
    result = result.replace(/\[Opportunity Name\]/g, topOpp.dealName);
    result = result.replace(/\[Opp X\]/g, topOpp.dealName);
    result = result.replace(/\[X\]/g, topOpp.dealName);
    
    // Multiple opportunities list
    const oppNames = payload.opportunities.active_tier1.map(o => o.dealName);
    if (oppNames.length > 1) {
      const oppList = oppNames.length === 2 
        ? `${oppNames[0]} and ${oppNames[1]}`
        : `${oppNames.slice(0, -1).join(', ')}, and ${oppNames[oppNames.length - 1]}`;
      result = result.replace(/\[X\] \(and others\)/g, oppList);
    }
  }
  
  // Organization tokens
  result = result.replace(/\[Their Org\]/g, payload.contact.organization || 'your organization');
  result = result.replace(/\[My Org\]/g, 'Lindsay Goldberg');
  result = result.replace(/\[Contact's Org\]/g, payload.contact.organization || 'your organization');
  result = result.replace(/\[Contact's Organization Name\]/g, payload.contact.organization || 'your organization');
  
  // Article tokens
  if (payload.articles.selected) {
    result = result.replace(/\[Link\]/g, payload.articles.selected);
    result = result.replace(/\[Article Link\]/g, payload.articles.selected);
  }
  
  // Sub-sector emphasis (from focus area description)
  if (payload.focusAreas.descriptions.length > 0) {
    const desc = payload.focusAreas.descriptions[0].description;
    // Extract potential sub-sector from description
    const subSector = desc.split(',')[0] || 'related areas';
    result = result.replace(/\[sub sector\]/g, subSector);
    result = result.replace(/\[sub sector emphasis\]/g, subSector);
  }
  
  // LG Lead tokens
  if (payload.cc.leads.length > 0) {
    const leadEmail = payload.cc.leads[0];
    const leadName = leadEmail.split('@')[0].split('.').map(
      part => part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
    result = result.replace(/\[LG Lead\]/g, leadName);
    result = result.replace(/\[Teammate\]/g, leadName);
  }
  
  // Assistant tokens
  if (payload.cc.assistants.length > 0) {
    const assistantEmail = payload.cc.assistants[0];
    const assistantName = assistantEmail.split('@')[0].split('.').map(
      part => part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
    result = result.replace(/\[Assistant\]/g, assistantName);
  }
  
  // Article Title tokens
  if (payload.articles.selected) {
    // Extract title from article link or use generic
    const articleTitle = payload.articles.selected.split('/').pop()?.replace(/-/g, ' ') || 'Recent Article';
    result = result.replace(/\[Article Title\]/g, articleTitle);
  }
  
  // Title/Attachment tokens
  result = result.replace(/\[Title\]/g, 'Investment Overview');
  result = result.replace(/\[news\]/g, 'recent announcement');
  result = result.replace(/\[Company\]/g, 'Company');
  result = result.replace(/\[Buyer\]/g, 'Buyer');
  result = result.replace(/\[topic\]/g, 'this topic');
  
  return result;
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

