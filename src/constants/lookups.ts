// Fallback constants for sectors and focus areas
// Used when the lookup tables are unavailable

export const SECTORS = [
  { id: 'general', label: 'General' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'industrials', label: 'Industrials' },
  { id: 'services', label: 'Services' }
];

export const FOCUS_AREAS = [
  // Healthcare
  { id: 'hc-payor-employer', label: 'HC: Payor & Employer Services', sector_id: 'healthcare' },
  { id: 'hc-rcm', label: 'HC: Revenue Cycle Management', sector_id: 'healthcare' },
  { id: 'hc-nonclinical', label: 'HC: Non-Clinical Services', sector_id: 'healthcare' },
  { id: 'hc-clinical', label: 'HC: Clinical Services', sector_id: 'healthcare' },
  { id: 'hc-tech-enablement', label: 'HC: Tech Enablement', sector_id: 'healthcare' },
  { id: 'hc-pharma-biotech', label: 'HC: Pharma & Biotech Services', sector_id: 'healthcare' },
  
  // Industrials  
  { id: 'capital-goods-equipment', label: 'Capital Goods / Equipment', sector_id: 'industrials' },
  { id: 'aerospace-defense', label: 'Aerospace & Defense', sector_id: 'industrials' },
  { id: 'automotive-transport', label: 'Automotive & Transportation', sector_id: 'industrials' },
  { id: 'chemicals-materials', label: 'Chemicals & Materials', sector_id: 'industrials' },
  { id: 'energy-utilities', label: 'Energy & Utilities', sector_id: 'industrials' },
  { id: 'construction-infrastructure', label: 'Construction & Infrastructure', sector_id: 'industrials' },
  
  // Services
  { id: 'waste-environmental', label: 'Waste & Environmental Services', sector_id: 'services' },
  { id: 'business-services', label: 'Business Services', sector_id: 'services' },
  { id: 'financial-services', label: 'Financial Services', sector_id: 'services' },
  { id: 'technology-services', label: 'Technology Services', sector_id: 'services' },
  { id: 'education-training', label: 'Education & Training', sector_id: 'services' },
  { id: 'media-marketing', label: 'Media & Marketing', sector_id: 'services' },
  { id: 'logistics-supply-chain', label: 'Logistics & Supply Chain', sector_id: 'services' },
  { id: 'real-estate-facilities', label: 'Real Estate & Facilities', sector_id: 'services' },
  
  // General
  { id: 'consumer-retail', label: 'Consumer & Retail', sector_id: 'general' },
  { id: 'food-beverage', label: 'Food & Beverage', sector_id: 'general' },
  { id: 'telecommunications', label: 'Telecommunications', sector_id: 'general' },
  { id: 'government-public', label: 'Government & Public Sector', sector_id: 'general' },
  { id: 'non-profit', label: 'Non-Profit', sector_id: 'general' },
  { id: 'other', label: 'Other', sector_id: 'general' }
];