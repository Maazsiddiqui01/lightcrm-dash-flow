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
      options: ['Technology', 'Healthcare', 'Financial Services', 'Consumer', 'Energy', 'Industrial', 'Real Estate']
    },
    lg_focus_area_1: { 
      type: 'select',
      options: ['Software', 'Hardware', 'Services', 'Biotech', 'Medtech', 'Pharma']
    },
    lg_focus_area_2: { 
      type: 'select',
      options: ['Software', 'Hardware', 'Services', 'Biotech', 'Medtech', 'Pharma']
    },
    lg_focus_area_3: { 
      type: 'select',
      options: ['Software', 'Hardware', 'Services', 'Biotech', 'Medtech', 'Pharma']
    },
    lg_focus_area_4: { 
      type: 'select',
      options: ['Software', 'Hardware', 'Services', 'Biotech', 'Medtech', 'Pharma']
    },
    lg_focus_area_5: { 
      type: 'select',
      options: ['Software', 'Hardware', 'Services', 'Biotech', 'Medtech', 'Pharma']
    },
    lg_focus_area_6: { 
      type: 'select',
      options: ['Software', 'Hardware', 'Services', 'Biotech', 'Medtech', 'Pharma']
    },
    lg_focus_area_7: { 
      type: 'select',
      options: ['Software', 'Hardware', 'Services', 'Biotech', 'Medtech', 'Pharma']
    },
    lg_focus_area_8: { 
      type: 'select',
      options: ['Software', 'Hardware', 'Services', 'Biotech', 'Medtech', 'Pharma']
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
    outreach_date: { type: 'date' },
    lg_lead: { type: 'text' },
    lg_assistant: { type: 'text' },
    city: { type: 'text' },
    state: { type: 'text' },
  },
  opportunities_raw: {
    deal_name: { type: 'text', required: true },
    lg_focus_area: { 
      type: 'select',
      options: ['Software', 'Hardware', 'Services', 'Biotech', 'Medtech', 'Pharma']
    },
    sector: { 
      type: 'select',
      options: ['Technology', 'Healthcare', 'Financial Services', 'Consumer', 'Energy', 'Industrial', 'Real Estate']
    },
    platform_add_on: { 
      type: 'select',
      options: ['Platform', 'Add-on', 'Add-on: Aspire Bakeries', 'Add-on: Creation Technologies', 'Add-on: GSF', 'Add-on: Kleinfelder', 'Add-on: Lightwave', 'Add-on: MMS', 'Both']
    },
    tier: { 
      type: 'select',
      options: ['1', '2', '3', '4', '5']
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
  return ['id', 'created_at', 'updated_at'];
};