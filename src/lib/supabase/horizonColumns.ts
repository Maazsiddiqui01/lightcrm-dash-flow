import { TableColumn } from './getTableColumns';

// Hardcoded column metadata for LG Horizon Companies
export const LG_HORIZONS_COMPANIES_COLUMNS: TableColumn[] = [
  { name: 'priority', type: 'integer', nullable: true, displayName: 'Priority' },
  { name: 'company_name', type: 'text', nullable: false, displayName: 'Company' },
  { name: 'company_url', type: 'text', nullable: true, displayName: 'URL' },
  { name: 'sector', type: 'text', nullable: true, displayName: 'Sector' },
  { name: 'subsector', type: 'text', nullable: true, displayName: 'Subsector' },
  { name: 'ebitda', type: 'text', nullable: true, displayName: 'EBITDA' },
  { name: 'ebitda_numeric', type: 'numeric', nullable: true, displayName: 'EBITDA ($M)' },
  { name: 'revenue', type: 'text', nullable: true, displayName: 'Revenue' },
  { name: 'revenue_numeric', type: 'numeric', nullable: true, displayName: 'Revenue ($M)' },
  { name: 'ownership', type: 'text', nullable: true, displayName: 'Ownership' },
  { name: 'parent_gp_name', type: 'text', nullable: true, displayName: 'Parent/GP' },
  { name: 'gp_aum', type: 'text', nullable: true, displayName: 'GP AUM' },
  { name: 'gp_aum_numeric', type: 'numeric', nullable: true, displayName: 'GP AUM ($B)' },
  { name: 'lg_relationship', type: 'text', nullable: true, displayName: 'LG Relationship' },
  { name: 'gp_contact', type: 'text', nullable: true, displayName: 'GP Contact' },
  { name: 'process_status', type: 'text', nullable: true, displayName: 'Process Status' },
  { name: 'original_date', type: 'date', nullable: true, displayName: 'Original Date' },
  { name: 'latest_process_date', type: 'date', nullable: true, displayName: 'Latest Process Date' },
  { name: 'company_hq_city', type: 'text', nullable: true, displayName: 'HQ City' },
  { name: 'company_hq_state', type: 'text', nullable: true, displayName: 'HQ State' },
  { name: 'date_of_acquisition', type: 'date', nullable: true, displayName: 'Acquisition Date' },
  { name: 'description', type: 'text', nullable: true, displayName: 'Description' },
  { name: 'additional_size_info', type: 'text', nullable: true, displayName: 'Additional Size Info' },
  { name: 'additional_information', type: 'text', nullable: true, displayName: 'Additional Information' },
  { name: 'source', type: 'text', nullable: true, displayName: 'Source' },
  { name: 'id', type: 'uuid', nullable: false, displayName: 'ID' },
  { name: 'created_at', type: 'timestamp with time zone', nullable: true, displayName: 'Created At' },
  { name: 'updated_at', type: 'timestamp with time zone', nullable: true, displayName: 'Updated At' },
];

// Hardcoded column metadata for LG Horizon GPs
export const LG_HORIZONS_GPS_COLUMNS: TableColumn[] = [
  { name: 'priority', type: 'integer', nullable: true, displayName: 'Priority' },
  { name: 'gp_name', type: 'text', nullable: false, displayName: 'GP Name' },
  { name: 'gp_url', type: 'text', nullable: true, displayName: 'URL' },
  { name: 'lg_relationship', type: 'text', nullable: true, displayName: 'LG Relationship' },
  { name: 'gp_contact', type: 'text', nullable: true, displayName: 'GP Contact' },
  { name: 'aum', type: 'text', nullable: true, displayName: 'AUM' },
  { name: 'aum_numeric', type: 'numeric', nullable: true, displayName: 'AUM ($B)' },
  { name: 'fund_hq_city', type: 'text', nullable: true, displayName: 'HQ City' },
  { name: 'fund_hq_state', type: 'text', nullable: true, displayName: 'HQ State' },
  { name: 'active_funds', type: 'integer', nullable: true, displayName: 'Active Funds' },
  { name: 'total_funds', type: 'integer', nullable: true, displayName: 'Total Funds' },
  { name: 'active_holdings', type: 'integer', nullable: true, displayName: 'Active Holdings' },
  { name: 'industry_sector_focus', type: 'text', nullable: true, displayName: 'Industry/Sector Focus' },
  { name: 'id', type: 'uuid', nullable: false, displayName: 'ID' },
  { name: 'created_at', type: 'timestamp with time zone', nullable: true, displayName: 'Created At' },
  { name: 'updated_at', type: 'timestamp with time zone', nullable: true, displayName: 'Updated At' },
];

// Get columns by table name
export function getHorizonTableColumns(tableName: 'lg_horizons_companies' | 'lg_horizons_gps'): TableColumn[] {
  if (tableName === 'lg_horizons_companies') {
    return LG_HORIZONS_COMPANIES_COLUMNS;
  }
  if (tableName === 'lg_horizons_gps') {
    return LG_HORIZONS_GPS_COLUMNS;
  }
  return [];
}
