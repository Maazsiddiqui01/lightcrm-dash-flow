-- Phase 2: Deduplication Infrastructure
-- Add duplicate tracking table for better audit trail

CREATE TABLE IF NOT EXISTS public.duplicate_detection_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  total_groups integer NOT NULL DEFAULT 0,
  total_duplicates integer NOT NULL DEFAULT 0,
  avg_confidence numeric,
  run_at timestamptz DEFAULT now(),
  run_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.duplicate_detection_runs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view duplicate detection runs" ON public.duplicate_detection_runs;
DROP POLICY IF EXISTS "Admins can create duplicate detection runs" ON public.duplicate_detection_runs;

-- Admins can view and create detection runs
CREATE POLICY "Admins can view duplicate detection runs"
ON public.duplicate_detection_runs FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create duplicate detection runs"
ON public.duplicate_detection_runs FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));