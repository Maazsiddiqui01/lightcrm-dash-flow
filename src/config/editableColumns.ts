export interface EditableFieldConfig {
  type: 'text' | 'email' | 'textarea' | 'number' | 'date' | 'select' | 'boolean' | 'searchable-select' | 'contact-search';
  options?: string[];
  allowCustom?: boolean;
  required?: boolean;
  readOnly?: boolean;
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

// Import tier display options and other display utilities
import { tierDisplayOptions, defaultOwnershipTypes } from '@/lib/export/opportunityUtils';

const tierDisplayOptionsLocal = [
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
    delta_type: { 
      type: 'select',
      options: ['Email', 'Meeting']
    },
    notes: { type: 'textarea' },
    next_steps: { type: 'textarea' },
    next_steps_due_date: { type: 'date' },
    url_to_online_bio: { type: 'text' },
    linkedin_url: { type: 'text' },
    x_twitter_url: { type: 'text' },
    lg_lead: { type: 'text' },
    lg_assistant: { type: 'text' },
    group_contact: { type: 'text' },
    group_email_role: {
      type: 'select',
      options: ['To (Primary Recipient)', 'CC (Carbon Copy)', 'BCC (Blind Carbon Copy)']
    },
    group_focus_area: { type: 'text' },
    group_sector: { type: 'text' },
    group_notes: { type: 'textarea' },
    city: { type: 'text' },
    state: { type: 'text' },
    delta: { type: 'number', validation: validateNumber },
    group_delta: { 
      type: 'number', 
      validation: validateNumber,
      readOnly: true,
      // Read-only: automatically synced from group via database triggers
    },
    contact_type: { type: 'text' },
    intentional_no_outreach: { type: 'boolean' },
    // Follow-up configuration
    follow_up_days: { 
      type: 'number', 
      validation: (value: any) => {
        if (value === '' || value === null || value === undefined) return null;
        const num = Number(value);
        if (isNaN(num)) return 'Must be a valid number';
        if (num < 0) return 'Must be 0 or greater';
        return null;
      }
    },
    follow_up_recency_threshold: {
      type: 'number',
      validation: (value: any) => {
        if (value === '' || value === null || value === undefined) return null;
        const num = Number(value);
        if (isNaN(num)) return 'Must be a valid number';
        if (num < 1) return 'Must be at least 1 day';
        if (num > 365) return 'Must be less than 365 days';
        return null;
      }
    },
    priority: { type: 'boolean' },
    // follow_up_date is READ-ONLY (computed via trigger)
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
      options: ['Platform', 'Add-On', 'Platform & Add-On']
    },
    tier: { 
      type: 'select',
      options: tierDisplayOptionsLocal
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
    ebitda_notes: { type: 'textarea' },
    ownership: { type: 'text' },
    ownership_type: { 
      type: 'select',
      options: defaultOwnershipTypes
    },
    investment_professional_point_person_1: { type: 'text' },
    investment_professional_point_person_2: { type: 'text' },
    investment_professional_point_person_3: { type: 'text' },
    investment_professional_point_person_4: { type: 'text' },
    deal_source_company: { type: 'searchable-select', allowCustom: true },
    deal_source_individual_1: { type: 'contact-search' },
    deal_source_individual_2: { type: 'contact-search' },
    deal_source_contacts: { type: 'textarea' },
    date_of_origination: { 
      type: 'select',
      options: [
        // 2024
        '2024',
        'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024',
        // 2025
        '2025',
        'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025',
        // 2026
        '2026',
        'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026',
        // 2027
        '2027',
        'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027',
        // 2028
        '2028',
        'Q1 2028', 'Q2 2028', 'Q3 2028', 'Q4 2028',
      ]
    },
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
    priority: { type: 'boolean' },
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
  return ['id', 'created_at', 'updated_at', 'intentional_no_outreach_date', 'intentional_no_outreach_note', 'follow_up_recency_threshold'];
};