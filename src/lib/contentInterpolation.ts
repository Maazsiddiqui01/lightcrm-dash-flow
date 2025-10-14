/**
 * Unified Content Interpolation System
 * Single source of truth for variable interpolation used by Live Preview and n8n payload
 */

import type { ContactEmailComposer, Opportunity, FocusAreaDescription } from '@/types/emailComposer';

/**
 * Format opportunities with proper grammar
 */
function formatOpportunities(opps: Opportunity[]): string {
  if (!opps || opps.length === 0) return 'your recent projects';
  
  const names = opps.map((o) => o.deal_name);
  
  if (names.length === 1) {
    return names[0];
  } else if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  } else {
    const lastOpp = names[names.length - 1];
    const firstOpps = names.slice(0, -1).join(', ');
    return `${firstOpps} and ${lastOpp}`;
  }
}

/**
 * Calculate EBITDA threshold from opportunities
 */
function calculateEbitdaThreshold(opps: Opportunity[]): number {
  if (!opps || opps.length === 0) return 30;
  
  const ebitdaValues = opps
    .map(o => o.ebitda_in_ms)
    .filter((val): val is number => val !== null && val !== undefined);
  
  return ebitdaValues.length > 0 ? Math.max(...ebitdaValues) : 30;
}

/**
 * Extract name from email (e.g., "peter.nurnberg@company.com" -> "Peter Nurnberg")
 */
function extractNameFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  return localPart
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Unified interpolation function
 * Handles ALL tokens from bodyBuilder.ts and ModuleContentPreview.tsx
 * 
 * @param text - Raw text with placeholders
 * @param contactData - Contact information
 * @param opportunities - List of opportunities (optional)
 * @param focusAreaDescriptions - Focus area descriptions (optional)
 * @returns Fully interpolated text
 */
export function interpolateContent(
  text: string,
  contactData: ContactEmailComposer,
  opportunities?: Opportunity[],
  focusAreaDescriptions?: FocusAreaDescription[]
): string {
  // Guard against undefined/null text
  if (!text) return '';
  
  let result = text;

  // ===== 1. Name Tokens =====
  const firstName = contactData.first_name || '';
  const fullName = contactData.full_name || '';
  
  result = result.replace(/\{first_name\}|\[First Name\]|\[first name\]/gi, firstName);
  result = result.replace(/\{full_name\}|\[Full Name\]/gi, fullName);

  // ===== 2. Organization Tokens =====
  const organization = contactData.organization || 'your organization';
  
  result = result.replace(/\{organization\}|\[Organization\]/gi, organization);
  result = result.replace(/\[Their Org\]/gi, organization);
  result = result.replace(/\[Contact's Org\]/gi, organization);
  result = result.replace(/\[Contact's Organization Name\]/gi, organization);
  result = result.replace(/\[My Org\]/gi, 'Lindsay Goldberg');

  // ===== 3. Sector Tokens =====
  const sectors = contactData.fa_sectors || [];
  const primarySector = sectors[0] || 'Technology';
  const allSectors = sectors.length > 0 ? sectors.join(', ') : 'Technology';
  
  result = result.replace(/\[Sector\]|\{sector\}|\[sector\]/gi, primarySector);
  result = result.replace(/\[Sectors\]|\{sectors\}/gi, allSectors);

  // ===== 4. Focus Area Tokens =====
  const focusAreas = contactData.focus_areas || [];
  const primaryFocusArea = focusAreas[0] || '';
  const allFocusAreas = focusAreas.length > 0 ? focusAreas.join(', ') : '';
  
  result = result.replace(/\[Focus Area\]|\{focus_area\}|\[LG Focus Area\]/gi, primaryFocusArea);
  result = result.replace(/\[Focus Areas\]|\{focus_areas\}/gi, allFocusAreas);
  result = result.replace(/\[focus area\]/gi, primaryFocusArea.toLowerCase());

  // ===== 5. Opportunity Tokens =====
  const opps = opportunities || contactData.opps || [];
  const formattedOpps = formatOpportunities(opps);
  const primaryOpp = opps[0]?.deal_name || 'your recent project';
  
  // [X] token - handles both single and multiple opportunities
  result = result.replace(/\[X\]/g, formattedOpps);
  
  // Handle "[X] (and others)" pattern for multiple opportunities
  if (opps.length > 1) {
    result = result.replace(/\[X\] \(and others\)/g, formattedOpps);
  }
  
  result = result.replace(/\[Deal Name\]|\{deal_name\}|\[Opportunity\]|\{opportunity\}/gi, primaryOpp);
  result = result.replace(/\[Opportunity Name\]/gi, primaryOpp);
  result = result.replace(/\[Opp X\]/gi, primaryOpp);

  // ===== 6. EBITDA Tokens =====
  const ebitdaThreshold = calculateEbitdaThreshold(opps);
  
  result = result.replace(/\[EBITDA\]/g, String(ebitdaThreshold));
  result = result.replace(/\$\[EBITDA\]m/g, `$${ebitdaThreshold}m`);
  result = result.replace(/>\s*\$\[EBITDA\]m/g, `>$${ebitdaThreshold}m`);
  result = result.replace(/\>\$\[EBITDA\]m/g, `>$${ebitdaThreshold}m`);

  // ===== 7. Team Tokens (LG Lead, Assistant) =====
  // LG Lead tokens
  const leadEmails = contactData.lead_emails || [];
  if (leadEmails.length > 0) {
    const leadName = extractNameFromEmail(leadEmails[0]);
    result = result.replace(/\[LG Lead\]/g, leadName);
    result = result.replace(/\[Teammate\]/g, leadName);
  }
  
  // Assistant tokens
  const assistantEmails = contactData.assistant_emails || [];
  if (assistantEmails.length > 0) {
    const assistantName = extractNameFromEmail(assistantEmails[0]);
    result = result.replace(/\[Assistant\]/g, assistantName);
  }

  // ===== 8. Article Tokens =====
  const articles = contactData.articles || [];
  if (articles.length > 0) {
    const articleLink = articles[0].article_link;
    result = result.replace(/\[Link\]/g, articleLink);
    result = result.replace(/\[Article Link\]/g, articleLink);
    
    // Extract title from article link or use generic
    const articleTitle = articleLink.split('/').pop()?.replace(/-/g, ' ') || 'Recent Article';
    result = result.replace(/\[Article Title\]/g, articleTitle);
  }

  // ===== 9. Sub-sector Tokens =====
  const descriptions = focusAreaDescriptions || contactData.fa_descriptions || [];
  if (descriptions.length > 0) {
    const desc = descriptions[0].description;
    // Extract potential sub-sector from description
    const subSector = desc.split(',')[0] || 'related areas';
    result = result.replace(/\[sub sector\]/gi, subSector);
    result = result.replace(/\[sub sector emphasis\]/gi, subSector);
  }

  // ===== 10. Generic Placeholder Tokens =====
  result = result.replace(/\[Title\]/g, 'Investment Overview');
  result = result.replace(/\[news\]/g, 'recent announcement');
  result = result.replace(/\[Company\]/g, 'Company');
  result = result.replace(/\[Buyer\]/g, 'Buyer');
  result = result.replace(/\[topic\]/g, 'this topic');

  return result;
}
