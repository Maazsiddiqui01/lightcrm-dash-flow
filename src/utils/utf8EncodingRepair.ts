/**
 * Repair common UTF-8 encoding issues that occur when Excel saves CSV
 * files with incorrect encoding (usually Windows-1252 interpreted as UTF-8)
 */

// Mapping of common garbled sequences to correct UTF-8 characters
const UTF8_REPAIR_MAP: Record<string, string> = {
  // Smart quotes
  'â€™': '\'',  // Right single quotation mark (U+2019)
  'â€˜': '\'',  // Left single quotation mark (U+2018)
  'â€œ': '\"',  // Left double quotation mark (U+201C)
  'â€': '\"',  // Right double quotation mark (U+201D)
  
  // Dashes
  'â€”': '—',  // Em dash (U+2014)
  'â€“': '–',  // En dash (U+2013)
  
  // Other common symbols
  'â€¢': '•',  // Bullet (U+2022)
  'â€¦': '…',  // Horizontal ellipsis (U+2026)
  'Â°': '°',   // Degree sign (U+00B0)
  'Â®': '®',   // Registered trademark (U+00AE)
  'Â©': '©',   // Copyright sign (U+00A9)
  'â„¢': '™',   // Trademark sign (U+2122)
  'Ã©': 'é',   // e with acute accent
  'Ã¨': 'è',   // e with grave accent
  'Ã¡': 'á',   // a with acute accent
  'Ã³': 'ó',   // o with acute accent
  'Ã­': 'í',   // i with acute accent
  'Ã±': 'ñ',   // n with tilde
  'Ã¼': 'ü',   // u with diaeresis
};

/**
 * Repair broken UTF-8 encoding in text
 * Silently fixes common encoding issues without alerting the user
 */
export function repairUtf8Encoding(text: string): string {
  let repairedText = text;
  
  // Apply all repair mappings
  Object.entries(UTF8_REPAIR_MAP).forEach(([broken, correct]) => {
    // Use global replace to fix all occurrences
    repairedText = repairedText.split(broken).join(correct);
  });
  
  return repairedText;
}

/**
 * Check if text contains broken UTF-8 encoding patterns
 * Useful for logging/debugging
 */
export function hasEncodingIssues(text: string): boolean {
  return Object.keys(UTF8_REPAIR_MAP).some(pattern => text.includes(pattern));
}

/**
 * Count encoding issues in text for logging
 */
export function countEncodingIssues(text: string): number {
  let count = 0;
  Object.keys(UTF8_REPAIR_MAP).forEach(pattern => {
    const occurrences = text.split(pattern).length - 1;
    count += occurrences;
  });
  return count;
}
