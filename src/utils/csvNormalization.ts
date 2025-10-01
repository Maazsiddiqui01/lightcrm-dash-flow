// Common normalization mappings
const FOCUS_AREA_MAPPINGS: Record<string, string> = {
  'f&b': 'Food & Beverage Services',
  'food & beverage': 'Food & Beverage Services',
  'a&d': 'Aerospace & Defense',
  'aerospace': 'Aerospace & Defense',
  'hc': 'Healthcare',
  'healthcare it': 'HC: Healthcare IT',
  'health it': 'HC: Healthcare IT',
  'behavioral': 'HC: Behavioral Health',
  'payor': 'HC: Payor & Employer Services',
  'employer services': 'HC: Payor & Employer Services',
  'life sciences': 'HC: Life Sciences',
  'medical devices': 'HC: Medical Devices',
  'clinical solutions': 'HC: Clinical Solutions',
  'digital health': 'HC: Digital Health',
  'revenue cycle': 'HC: Revenue Cycle Management',
  'population health': 'HC: Population Health',
  'non-clinical': 'HC: Services (Non-Clinical)',
};

const NAME_MAPPINGS: Record<string, string> = {
  'jeff': 'Jeffrey',
  'jeffery': 'Jeffrey',
  'mike': 'Michael',
  'bob': 'Robert',
  'rob': 'Robert',
  'dan': 'Daniel',
  'danny': 'Daniel',
  'bill': 'William',
  'tom': 'Thomas',
  'tommy': 'Thomas',
  'jim': 'James',
  'jimmy': 'James',
  'dave': 'David',
  'chris': 'Christopher',
  'matt': 'Matthew',
  'joe': 'Joseph',
  'tony': 'Anthony',
  'andy': 'Andrew',
};

const COMPANY_SUFFIX_MAPPINGS: Record<string, string> = {
  'corp': 'Corporation',
  'inc': 'Incorporated',
  'llc': 'Limited Liability Company',
  'ltd': 'Limited',
  'co': 'Company',
  'plc': 'Public Limited Company',
};

export interface NormalizationChange {
  row: number;
  field: string;
  original: string;
  corrected: string;
}

export function normalizeCsvData(
  data: any[], 
  entityType: 'contacts' | 'opportunities'
): any[] {
  const normalized = data.map(row => {
    const normalizedRow = { ...row };

    // Normalize focus areas
    const focusAreaFields = entityType === 'contacts' 
      ? ['lg_focus_area_1', 'lg_focus_area_2', 'lg_focus_area_3', 'lg_focus_area_4', 
         'lg_focus_area_5', 'lg_focus_area_6', 'lg_focus_area_7', 'lg_focus_area_8']
      : ['lg_focus_area'];

    focusAreaFields.forEach(field => {
      if (normalizedRow[field]) {
        const value = String(normalizedRow[field]).toLowerCase().trim();
        if (FOCUS_AREA_MAPPINGS[value]) {
          normalizedRow[field] = FOCUS_AREA_MAPPINGS[value];
        }
      }
    });

    // Normalize names (first_name, last_name, full_name for contacts)
    if (entityType === 'contacts') {
      ['first_name', 'last_name'].forEach(field => {
        if (normalizedRow[field]) {
          const value = String(normalizedRow[field]).toLowerCase().trim();
          if (NAME_MAPPINGS[value]) {
            normalizedRow[field] = NAME_MAPPINGS[value];
          }
        }
      });
    }

    // Normalize company names (organization for contacts, deal_source_company for opportunities)
    const orgField = entityType === 'contacts' ? 'organization' : 'deal_source_company';
    if (normalizedRow[orgField]) {
      let org = String(normalizedRow[orgField]);
      
      // Normalize company suffixes
      Object.entries(COMPANY_SUFFIX_MAPPINGS).forEach(([short, full]) => {
        const regex = new RegExp(`\\b${short}\\b\\.?$`, 'i');
        if (regex.test(org)) {
          org = org.replace(regex, full);
        }
      });
      
      normalizedRow[orgField] = org.trim();
    }

    // Normalize email addresses (lowercase)
    if (normalizedRow.email_address) {
      normalizedRow.email_address = String(normalizedRow.email_address).toLowerCase().trim();
    }

    // Normalize boolean values
    ['intentional_no_outreach', 'dealcloud'].forEach(field => {
      if (normalizedRow[field] !== undefined && normalizedRow[field] !== null) {
        const value = String(normalizedRow[field]).toLowerCase().trim();
        if (['true', 'yes', '1', 't', 'y'].includes(value)) {
          normalizedRow[field] = true;
        } else if (['false', 'no', '0', 'f', 'n'].includes(value)) {
          normalizedRow[field] = false;
        }
      }
    });

    return normalizedRow;
  });

  return normalized;
}

export function trackNormalizationChanges(
  original: any[],
  normalized: any[]
): NormalizationChange[] {
  const changes: NormalizationChange[] = [];

  original.forEach((origRow, idx) => {
    const normRow = normalized[idx];
    
    Object.keys(origRow).forEach(field => {
      if (field === '_rowNumber') return;
      
      const origValue = origRow[field];
      const normValue = normRow[field];
      
      if (origValue !== normValue && origValue && normValue) {
        changes.push({
          row: origRow._rowNumber,
          field,
          original: String(origValue),
          corrected: String(normValue)
        });
      }
    });
  });

  return changes;
}
