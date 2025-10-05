-- ============================================
-- PHASE 2: HIGH PRIORITY IMPROVEMENTS
-- ============================================

-- 1. ADD PERFORMANCE INDEXES
-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_contacts_email_address ON public.contacts_raw(email_address);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON public.contacts_raw(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_most_recent_contact ON public.contacts_raw(most_recent_contact DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_lg_sector ON public.contacts_raw(lg_sector);

CREATE INDEX IF NOT EXISTS idx_opportunities_deal_name ON public.opportunities_raw(deal_name);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned_to ON public.opportunities_raw(assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities_raw(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_tier ON public.opportunities_raw(tier);

CREATE INDEX IF NOT EXISTS idx_interactions_occurred_at ON public.emails_meetings_raw(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_emails_arr ON public.emails_meetings_raw USING GIN(emails_arr);

-- 2. ADD DATA TYPE VALIDATION FOR COLUMN MANAGER
-- Create function to validate data type compatibility
CREATE OR REPLACE FUNCTION public.validate_column_type_change(
  p_table text,
  p_column text,
  p_new_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_type text;
  v_row_count int;
  v_sample_error text;
BEGIN
  -- Check admin access
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Admin access required');
  END IF;

  -- Get current column type
  SELECT data_type INTO v_current_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = p_table
    AND column_name = p_column;

  IF v_current_type IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Column not found');
  END IF;

  -- If types are the same, no validation needed
  IF v_current_type = p_new_type THEN
    RETURN jsonb_build_object('valid', true, 'message', 'No type change');
  END IF;

  -- Test conversion by attempting to cast sample data
  BEGIN
    EXECUTE format(
      'SELECT COUNT(*) FROM %I WHERE %I::text::%s IS NOT NULL',
      p_table, p_column, p_new_type
    ) INTO v_row_count;
    
    RETURN jsonb_build_object(
      'valid', true,
      'message', format('Type change validated for %s rows', v_row_count),
      'old_type', v_current_type,
      'new_type', p_new_type
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('Cannot safely convert %s to %s: %s', v_current_type, p_new_type, SQLERRM),
      'old_type', v_current_type,
      'new_type', p_new_type
    );
  END;
END;
$$;

-- 3. ADD RETRY LOGIC SUPPORT TABLE
-- Track failed operations for retry
CREATE TABLE IF NOT EXISTS public.operation_retry_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  payload jsonb NOT NULL,
  error_message text,
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  next_retry_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retry_queue_next_retry ON public.operation_retry_queue(next_retry_at) WHERE retry_count < max_retries;

-- Enable RLS
ALTER TABLE public.operation_retry_queue ENABLE ROW LEVEL SECURITY;

-- Only system can manage retry queue
CREATE POLICY "retry_queue_system_only"
  ON public.operation_retry_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);