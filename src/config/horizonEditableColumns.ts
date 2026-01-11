import { EditableFieldConfig, EditableTableConfig } from './editableColumns';

export const horizonCompaniesEditable: EditableTableConfig = {
  priority: { 
    type: 'select',
    options: ['', '1', '2', '3', '4', '5']
  },
  company_name: { type: 'text', required: true },
  company_url: { type: 'text' },
  sector: { type: 'text' },
  subsector: { type: 'text' },
  ebitda: { type: 'text' },
  revenue: { type: 'text' },
  ownership: { type: 'text' },
  parent_gp_name: { type: 'text' },
  gp_aum: { type: 'text' },
  lg_relationship: { type: 'text' },
  gp_contact: { type: 'text' },
  process_status: { 
    type: 'select',
    options: [
      'Expected / Monitoring',
      'Failed Process',
      'Active Process',
      'Completed',
      'Prior Auction'
    ]
  },
  original_date: { type: 'date' },
  latest_process_date: { type: 'date' },
  company_hq_city: { type: 'text' },
  company_hq_state: { type: 'text' },
  date_of_acquisition: { type: 'date' },
  description: { type: 'textarea' },
  additional_size_info: { type: 'textarea' },
  additional_information: { type: 'textarea' },
  source: { type: 'text' },
  notes: { type: 'textarea' },
  next_steps: { type: 'textarea' },
};

export const horizonGpsEditable: EditableTableConfig = {
  priority: { 
    type: 'select',
    options: ['', '1', '2', '3', '4', '5']
  },
  gp_name: { type: 'text', required: true },
  gp_url: { type: 'text' },
  lg_relationship: { type: 'text' },
  gp_contact: { type: 'text' },
  aum: { type: 'text' },
  fund_hq_city: { type: 'text' },
  fund_hq_state: { type: 'text' },
  active_funds: { type: 'number' },
  total_funds: { type: 'number' },
  active_holdings: { type: 'number' },
  industry_sector_focus: { type: 'textarea' },
  notes: { type: 'textarea' },
  next_steps: { type: 'textarea' },
};
