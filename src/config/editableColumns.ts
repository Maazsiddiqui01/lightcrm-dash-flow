export interface EditableFieldConfig {
  type: 'text' | 'email' | 'textarea' | 'number' | 'date' | 'select' | 'boolean';
  options?: string[];
  required?: boolean;
  validation?: (value: any) => string | null;
}

export interface EditableTableConfig {
  [columnName: string]: EditableFieldConfig;
}

export interface EditableConfig {
  contacts_raw: EditableTableConfig;
  opportunities_raw: EditableTableConfig;
}

// Email validation helper
const validateEmail = (value: string): string | null => {
  if (!value) return null;
  if (!value.includes('@')) return 'Must be a valid email address';
  return null;
};

// Number validation helper
const validateNumber = (value: any): string | null => {
  if (value === '' || value === null || value === undefined) return null;
  if (isNaN(Number(value))) return 'Must be a valid number';
  return null;
};

// Import tier display options
const tierDisplayOptions = [
  '1-Active',
  '2-Longer Term',
  '3-For Review', 
  '4-Likely Pass',
  '5-Passed'
];

export const editableColumns: EditableConfig = {
  contacts_raw: {
    full_name: { type: 'text' },
    first_name: { type: 'text' },
    last_name: { type: 'text' },
    email_address: { type: 'email', validation: validateEmail },
    phone: { type: 'text' },
    title: { type: 'text' },
    organization: { type: 'text' },
    areas_of_specialization: { type: 'textarea' },
    lg_sector: { 
      type: 'select',
      options: ['Services', 'Industrials', 'Healthcare', 'General']
    },
    lg_focus_area_1: { 
      type: 'select',
      options: [
        // Healthcare
        'HC: Payor & Employer Services',
        'HC: Revenue Cycle Management', 
        'HC: Services (Non-Clinical)',
        'HC: Clinical Services',
        'HC: Tech Enablement',
        'HC: Pharma & Biotech Services',
        // Industrials
        'Capital Goods / Equipment',
        'Aerospace & Defense',
        'Automotive & Transportation', 
        'Chemicals & Materials',
        'Energy & Utilities',
        'Construction & Infrastructure',
        // Services
        'Waste & Environmental Services',
        'Business Services',
        'Financial Services',
        'Technology Services', 
        'Education & Training',
        'Media & Marketing',
        'Logistics & Supply Chain',
        'Real Estate & Facilities',
        // General
        'Distribution',
        'Consumer & Retail',
        'Food & Beverage',
        'Telecommunications',
        'Government Services',
        'Non-Profit',
        'Other'
      ]
    },
    lg_focus_area_2: { 
      type: 'select',
      options: [
        // Healthcare
        'HC: Payor & Employer Services',
        'HC: Revenue Cycle Management', 
        'HC: Services (Non-Clinical)',
        'HC: Clinical Services',
        'HC: Tech Enablement',
        'HC: Pharma & Biotech Services',
        // Industrials
        'Capital Goods / Equipment',
        'Aerospace & Defense',
        'Automotive & Transportation', 
        'Chemicals & Materials',
        'Energy & Utilities',
        'Construction & Infrastructure',
        // Services
        'Waste & Environmental Services',
        'Business Services',
        'Financial Services',
        'Technology Services', 
        'Education & Training',
        'Media & Marketing',
        'Logistics & Supply Chain',
        'Real Estate & Facilities',
        // General
        'Distribution',
        'Consumer & Retail',
        'Food & Beverage',
        'Telecommunications',
        'Government Services',
        'Non-Profit',
        'Other'
      ]
    },
    lg_focus_area_3: { 
      type: 'select',
      options: [
        // Healthcare
        'HC: Payor & Employer Services',
        'HC: Revenue Cycle Management', 
        'HC: Services (Non-Clinical)',
        'HC: Clinical Services',
        'HC: Tech Enablement',
        'HC: Pharma & Biotech Services',
        // Industrials
        'Capital Goods / Equipment',
        'Aerospace & Defense',
        'Automotive & Transportation', 
        'Chemicals & Materials',
        'Energy & Utilities',
        'Construction & Infrastructure',
        // Services
        'Waste & Environmental Services',
        'Business Services',
        'Financial Services',
        'Technology Services', 
        'Education & Training',
        'Media & Marketing',
        'Logistics & Supply Chain',
        'Real Estate & Facilities',
        // General
        'Distribution',
        'Consumer & Retail',
        'Food & Beverage',
        'Telecommunications',
        'Government Services',
        'Non-Profit',
        'Other'
      ]
    },
    lg_focus_area_4: { 
      type: 'select',
      options: [
        // Healthcare
        'HC: Payor & Employer Services',
        'HC: Revenue Cycle Management', 
        'HC: Services (Non-Clinical)',
        'HC: Clinical Services',
        'HC: Tech Enablement',
        'HC: Pharma & Biotech Services',
        // Industrials
        'Capital Goods / Equipment',
        'Aerospace & Defense',
        'Automotive & Transportation', 
        'Chemicals & Materials',
        'Energy & Utilities',
        'Construction & Infrastructure',
        // Services
        'Waste & Environmental Services',
        'Business Services',
        'Financial Services',
        'Technology Services', 
        'Education & Training',
        'Media & Marketing',
        'Logistics & Supply Chain',
        'Real Estate & Facilities',
        // General
        'Distribution',
        'Consumer & Retail',
        'Food & Beverage',
        'Telecommunications',
        'Government Services',
        'Non-Profit',
        'Other'
      ]
    },
    lg_focus_area_5: { 
      type: 'select',
      options: [
        // Healthcare
        'HC: Payor & Employer Services',
        'HC: Revenue Cycle Management', 
        'HC: Services (Non-Clinical)',
        'HC: Clinical Services',
        'HC: Tech Enablement',
        'HC: Pharma & Biotech Services',
        // Industrials
        'Capital Goods / Equipment',
        'Aerospace & Defense',
        'Automotive & Transportation', 
        'Chemicals & Materials',
        'Energy & Utilities',
        'Construction & Infrastructure',
        // Services
        'Waste & Environmental Services',
        'Business Services',
        'Financial Services',
        'Technology Services', 
        'Education & Training',
        'Media & Marketing',
        'Logistics & Supply Chain',
        'Real Estate & Facilities',
        // General
        'Distribution',
        'Consumer & Retail',
        'Food & Beverage',
        'Telecommunications',
        'Government Services',
        'Non-Profit',
        'Other'
      ]
    },
    lg_focus_area_6: { 
      type: 'select',
      options: [
        // Healthcare
        'HC: Payor & Employer Services',
        'HC: Revenue Cycle Management', 
        'HC: Services (Non-Clinical)',
        'HC: Clinical Services',
        'HC: Tech Enablement',
        'HC: Pharma & Biotech Services',
        // Industrials
        'Capital Goods / Equipment',
        'Aerospace & Defense',
        'Automotive & Transportation', 
        'Chemicals & Materials',
        'Energy & Utilities',
        'Construction & Infrastructure',
        // Services
        'Waste & Environmental Services',
        'Business Services',
        'Financial Services',
        'Technology Services', 
        'Education & Training',
        'Media & Marketing',
        'Logistics & Supply Chain',
        'Real Estate & Facilities',
        // General
        'Distribution',
        'Consumer & Retail',
        'Food & Beverage',
        'Telecommunications',
        'Government Services',
        'Non-Profit',
        'Other'
      ]
    },
    lg_focus_area_7: { 
      type: 'select',
      options: [
        // Healthcare
        'HC: Payor & Employer Services',
        'HC: Revenue Cycle Management', 
        'HC: Services (Non-Clinical)',
        'HC: Clinical Services',
        'HC: Tech Enablement',
        'HC: Pharma & Biotech Services',
        // Industrials
        'Capital Goods / Equipment',
        'Aerospace & Defense',
        'Automotive & Transportation', 
        'Chemicals & Materials',
        'Energy & Utilities',
        'Construction & Infrastructure',
        // Services
        'Waste & Environmental Services',
        'Business Services',
        'Financial Services',
        'Technology Services', 
        'Education & Training',
        'Media & Marketing',
        'Logistics & Supply Chain',
        'Real Estate & Facilities',
        // General
        'Distribution',
        'Consumer & Retail',
        'Food & Beverage',
        'Telecommunications',
        'Government Services',
        'Non-Profit',
        'Other'
      ]
    },
    lg_focus_area_8: { 
      type: 'select',
      options: [
        // Healthcare
        'HC: Payor & Employer Services',
        'HC: Revenue Cycle Management', 
        'HC: Services (Non-Clinical)',
        'HC: Clinical Services',
        'HC: Tech Enablement',
        'HC: Pharma & Biotech Services',
        // Industrials
        'Capital Goods / Equipment',
        'Aerospace & Defense',
        'Automotive & Transportation', 
        'Chemicals & Materials',
        'Energy & Utilities',
        'Construction & Infrastructure',
        // Services
        'Waste & Environmental Services',
        'Business Services',
        'Financial Services',
        'Technology Services', 
        'Education & Training',
        'Media & Marketing',
        'Logistics & Supply Chain',
        'Real Estate & Facilities',
        // General
        'Distribution',
        'Consumer & Retail',
        'Food & Beverage',
        'Telecommunications',
        'Government Services',
        'Non-Profit',
        'Other'
      ]
    },
    category: { type: 'text' },
    contact_type: { 
      type: 'select',
      options: ['Primary', 'Secondary', 'Referral']
    },
    delta_type: { 
      type: 'select',
      options: ['Email', 'Meeting', 'Call', 'Event']
    },
    notes: { type: 'textarea' },
    url_to_online_bio: { type: 'text' },
    linkedin_url: { type: 'text' },
    x_twitter_url: { type: 'text' },
    lg_lead: { type: 'text' },
    lg_assistant: { type: 'text' },
    group_contact: { type: 'text' },
    city: { type: 'text' },
    state: { type: 'text' },
    intentional_no_outreach: { type: 'boolean' },
  },
  opportunities_raw: {
    deal_name: { type: 'text', required: true },
    lg_focus_area: { 
      type: 'select',
      options: [
        // Healthcare
        'HC: Payor & Employer Services',
        'HC: Revenue Cycle Management', 
        'HC: Services (Non-Clinical)',
        'HC: Clinical Services',
        'HC: Tech Enablement',
        'HC: Pharma & Biotech Services',
        // Industrials
        'Capital Goods / Equipment',
        'Aerospace & Defense',
        'Automotive & Transportation', 
        'Chemicals & Materials',
        'Energy & Utilities',
        'Construction & Infrastructure',
        // Services
        'Waste & Environmental Services',
        'Business Services',
        'Financial Services',
        'Technology Services', 
        'Education & Training',
        'Media & Marketing',
        'Logistics & Supply Chain',
        'Real Estate & Facilities',
        // General
        'Distribution',
        'Consumer & Retail',
        'Food & Beverage',
        'Telecommunications',
        'Government Services',
        'Non-Profit',
        'Other'
      ]
    },
    sector: { 
      type: 'select',
      options: ['Services', 'Industrials', 'Healthcare', 'General']
    },
    funds: {
      type: 'select',
      options: ['LG Fund VI']
    },
    platform_add_on: { 
      type: 'select',
      options: ['Platform', 'Add-on', 'Add-on: Aspire Bakeries', 'Add-on: Creation Technologies', 'Add-on: GSF', 'Add-on: Kleinfelder', 'Add-on: Lightwave', 'Add-on: MMS', 'Both']
    },
    tier: { 
      type: 'select',
      options: tierDisplayOptions
    },
    status: { 
      type: 'select',
      options: ['Active', 'On Hold', 'Closed Won', 'Closed Lost', 'Pipeline']
    },
    url: { type: 'text' },
    summary_of_opportunity: { type: 'textarea' },
    next_steps: { type: 'textarea' },
    most_recent_notes: { type: 'textarea' },
    
    ebitda_in_ms: { type: 'number', validation: validateNumber },
    ebitda: { type: 'text' },
    ebitda_notes: { type: 'textarea' },
    ownership: { type: 'text' },
    ownership_type: { 
      type: 'select',
      options: ['Family Owned', 'Founder Owned', 'PE Owned', 'Public', 'Other']
    },
    investment_professional_point_person_1: { type: 'text' },
    investment_professional_point_person_2: { type: 'text' },
    investment_professional_point_person_3: { type: 'text' },
    investment_professional_point_person_4: { type: 'text' },
    deal_source_company: { type: 'text' },
    deal_source_individual_1: { type: 'text' },
    deal_source_individual_2: { type: 'text' },
    deal_source_contacts: { type: 'textarea' },
    date_of_origination: { type: 'text' },
    dealcloud: { type: 'boolean' },
    headquarters: { type: 'text' },
    revenue: { type: 'number', validation: validateNumber },
    est_deal_size: { type: 'number', validation: validateNumber },
    est_lg_equity_invest: { type: 'number', validation: validateNumber },
    lg_team: { type: 'text' },
    last_modified: { type: 'date' },
    process_timeline: {
      type: 'select',
      options: ['1-90 days', '91-180 days', '181-270 days', '271-365 days', '365+ days']
    },
    acquisition_date: {
      type: 'date'
    },
  }
};

// Get editable columns for a table
export const getEditableColumns = (tableName: keyof EditableConfig): EditableTableConfig => {
  return editableColumns[tableName] || {};
};

// Check if a column is editable
export const isColumnEditable = (tableName: keyof EditableConfig, columnName: string): boolean => {
  return columnName in editableColumns[tableName];
};

// Get non-editable columns (system fields that should be hidden by default)
export const getNonEditableColumns = (): string[] => {
  return ['id', 'created_at', 'updated_at'];
};

// Get columns that should be hidden by default
export const getHiddenByDefaultColumns = (): string[] => {
  return ['id', 'created_at', 'updated_at', 'intentional_no_outreach_date', 'intentional_no_outreach_note'];
};