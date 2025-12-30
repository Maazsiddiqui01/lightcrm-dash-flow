/**
 * Focus Area Detection Utilities
 * Provides functions to detect specific focus areas from contact data
 */

/**
 * Check if a contact has Insurance Services as one of their focus areas
 * @param focusAreas - Array of focus area strings from contact data
 * @returns true if Insurance Services is present
 */
export function hasInsuranceServicesFocusArea(focusAreas: string[] | null | undefined): boolean {
  if (!focusAreas || focusAreas.length === 0) return false;
  
  return focusAreas.some(area => 
    area.toLowerCase().includes('insurance services') ||
    area.toLowerCase() === 'insurance'
  );
}

/**
 * Insurance Services specific talking points
 * These are shown only when a contact has Insurance Services as a focus area
 */
export const INSURANCE_SERVICES_PHRASES = [
  {
    id: 'insurance_phrase_1',
    text: "We're interested in insurance services opportunities with defensible underwriting, predictable fee/commission revenue, and a clear path for long-term organic growth.",
    label: "Defensible Underwriting & Organic Growth"
  },
  {
    id: 'insurance_phrase_2',
    text: "Founder-owned businesses are our strong preference, though we will also consider opportunities owned by smaller sponsors.",
    label: "Founder-Owned Preference"
  },
  {
    id: 'insurance_phrase_3',
    text: "Our preferred equity check size in this space is $400-800 million, with flexibility to go as low as $150 million or as high as ~$1 billion for the right opportunity.",
    label: "Equity Check Size ($400-800M)"
  },
  {
    id: 'insurance_phrase_4',
    text: "We can consider minority investments, but only in founder- or family-owned businesses.",
    label: "Minority Investments (Founder/Family Only)"
  },
  {
    id: 'insurance_phrase_5',
    text: "We prioritize situations where we can build scale, not just buy it – so platforms with room for operational expansion, strategic add-ons, and long-term compounding.",
    label: "Build Scale Priority"
  },
  {
    id: 'insurance_phrase_6',
    text: "Niche brokerages are of particular interest, and we will also evaluate MGAs/MGUs that meet our criteria for predictability, specialization, and underwriting discipline.",
    label: "Niche Brokerages & MGAs/MGUs"
  },
] as const;

export type InsurancePhrase = typeof INSURANCE_SERVICES_PHRASES[number];
