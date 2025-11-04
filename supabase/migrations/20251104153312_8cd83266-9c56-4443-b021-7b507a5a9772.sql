-- Create group_suggestions table for persistent suggestion state management
CREATE TABLE IF NOT EXISTS public.group_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('org_sector', 'interaction')),
  suggested_name text NOT NULL,
  members jsonb NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  approved_at timestamptz,
  
  UNIQUE(user_id, suggestion_id, mode)
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_group_suggestions_user_status ON public.group_suggestions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_suggestions_user_mode ON public.group_suggestions(user_id, mode);
CREATE INDEX IF NOT EXISTS idx_group_suggestions_user_id ON public.group_suggestions(user_id);

-- Enable RLS
ALTER TABLE public.group_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view own suggestions"
  ON public.group_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own suggestions"
  ON public.group_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own suggestions"
  ON public.group_suggestions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own suggestions"
  ON public.group_suggestions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins all suggestions"
  ON public.group_suggestions FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_group_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_suggestions_updated_at
  BEFORE UPDATE ON public.group_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_group_suggestions_updated_at();