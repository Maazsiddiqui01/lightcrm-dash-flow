-- Create lookup table for process status
CREATE TABLE public.lookup_horizon_process_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with extracted values from the data
INSERT INTO public.lookup_horizon_process_status (value, label, sort_order) VALUES
  ('Expected / Monitoring', 'Expected / Monitoring', 1),
  ('Failed Process', 'Failed Process', 2),
  ('Active Process', 'Active Process', 3),
  ('Completed', 'Completed', 4);

-- Enable RLS on lookup table (public read)
ALTER TABLE public.lookup_horizon_process_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read process status lookup"
ON public.lookup_horizon_process_status FOR SELECT
USING (true);

-- Create GPs table first (referenced by companies)
CREATE TABLE public.lg_horizons_gps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Fields
  priority INTEGER,
  index_number INTEGER,
  gp_name TEXT NOT NULL,
  gp_url TEXT,
  
  -- Relationships (text field linking to lg_leads_directory names)
  lg_relationship TEXT,
  gp_contact TEXT,
  
  -- Fund Details
  aum TEXT,
  aum_numeric NUMERIC,
  fund_hq_city TEXT,
  fund_hq_state TEXT,
  
  -- Holdings
  active_funds INTEGER,
  total_funds INTEGER,
  active_holdings INTEGER,
  
  -- Focus
  industry_sector_focus TEXT,
  
  -- System Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on GPs table
ALTER TABLE public.lg_horizons_gps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read GPs"
ON public.lg_horizons_gps FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert GPs"
ON public.lg_horizons_gps FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update GPs"
ON public.lg_horizons_gps FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete GPs"
ON public.lg_horizons_gps FOR DELETE
TO authenticated
USING (true);

-- Create Companies table
CREATE TABLE public.lg_horizons_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Fields
  priority INTEGER,
  company_name TEXT NOT NULL,
  company_url TEXT,
  description TEXT,
  
  -- Financials
  ebitda TEXT,
  ebitda_numeric NUMERIC,
  revenue TEXT,
  revenue_numeric NUMERIC,
  
  -- Classification
  sector TEXT,
  subsector TEXT,
  ownership TEXT,
  
  -- Parent/GP Relationship (text + optional link)
  parent_gp_name TEXT,
  parent_gp_id UUID REFERENCES public.lg_horizons_gps(id) ON DELETE SET NULL,
  gp_aum TEXT,
  gp_aum_numeric NUMERIC,
  
  -- Relationships
  lg_relationship TEXT,
  gp_contact TEXT,
  
  -- Process Tracking
  original_date DATE,
  latest_process_date DATE,
  process_status TEXT,
  
  -- Location
  company_hq_city TEXT,
  company_hq_state TEXT,
  date_of_acquisition DATE,
  
  -- Additional Info
  additional_size_info TEXT,
  additional_information TEXT,
  source TEXT,
  
  -- System Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on Companies table
ALTER TABLE public.lg_horizons_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read companies"
ON public.lg_horizons_companies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert companies"
ON public.lg_horizons_companies FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update companies"
ON public.lg_horizons_companies FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete companies"
ON public.lg_horizons_companies FOR DELETE
TO authenticated
USING (true);

-- Create indexes for performance
CREATE INDEX idx_horizons_companies_sector ON public.lg_horizons_companies(sector);
CREATE INDEX idx_horizons_companies_subsector ON public.lg_horizons_companies(subsector);
CREATE INDEX idx_horizons_companies_process_status ON public.lg_horizons_companies(process_status);
CREATE INDEX idx_horizons_companies_priority ON public.lg_horizons_companies(priority);
CREATE INDEX idx_horizons_companies_ebitda_numeric ON public.lg_horizons_companies(ebitda_numeric);
CREATE INDEX idx_horizons_companies_parent_gp ON public.lg_horizons_companies(parent_gp_id);
CREATE INDEX idx_horizons_companies_name ON public.lg_horizons_companies(company_name);

CREATE INDEX idx_horizons_gps_name ON public.lg_horizons_gps(gp_name);
CREATE INDEX idx_horizons_gps_priority ON public.lg_horizons_gps(priority);
CREATE INDEX idx_horizons_gps_aum_numeric ON public.lg_horizons_gps(aum_numeric);
CREATE INDEX idx_horizons_gps_lg_relationship ON public.lg_horizons_gps(lg_relationship);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_lg_horizons_companies_updated_at
  BEFORE UPDATE ON public.lg_horizons_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lg_horizons_gps_updated_at
  BEFORE UPDATE ON public.lg_horizons_gps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add full-text search indexes
CREATE INDEX idx_horizons_companies_search ON public.lg_horizons_companies 
  USING GIN (to_tsvector('english', COALESCE(company_name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(sector, '')));

CREATE INDEX idx_horizons_gps_search ON public.lg_horizons_gps 
  USING GIN (to_tsvector('english', COALESCE(gp_name, '') || ' ' || COALESCE(industry_sector_focus, '')));