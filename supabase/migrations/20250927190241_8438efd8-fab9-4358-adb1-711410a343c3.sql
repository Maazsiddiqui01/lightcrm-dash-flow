-- Add intentional no outreach columns to contacts_raw table
ALTER TABLE public.contacts_raw 
ADD COLUMN intentional_no_outreach BOOLEAN DEFAULT FALSE,
ADD COLUMN intentional_no_outreach_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN intentional_no_outreach_note TEXT;

-- Create audit table for tracking intentional no outreach events
CREATE TABLE public.contact_intentional_no_outreach_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  performed_by UUID REFERENCES auth.users(id),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  action_type TEXT NOT NULL DEFAULT 'skip' -- 'skip' or 'undo'
);

-- Enable RLS on the audit table
ALTER TABLE public.contact_intentional_no_outreach_events ENABLE ROW LEVEL SECURITY;

-- Create policies for the audit table
CREATE POLICY "read intentional no outreach events" 
ON public.contact_intentional_no_outreach_events 
FOR SELECT 
USING (true);

CREATE POLICY "insert intentional no outreach events" 
ON public.contact_intentional_no_outreach_events 
FOR INSERT 
WITH CHECK (true);

-- Create function to handle intentional no outreach action
CREATE OR REPLACE FUNCTION public.set_intentional_no_outreach(
  p_contact_id UUID,
  p_note TEXT DEFAULT NULL,
  p_action_type TEXT DEFAULT 'skip'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_action_type = 'skip' THEN
    -- Set intentional no outreach and reset most_recent_contact to today
    UPDATE public.contacts_raw
    SET 
      intentional_no_outreach = TRUE,
      intentional_no_outreach_date = now(),
      intentional_no_outreach_note = p_note,
      most_recent_contact = now()::date
    WHERE id = p_contact_id;
  ELSIF p_action_type = 'undo' THEN
    -- Undo intentional no outreach but keep the reset date
    UPDATE public.contacts_raw
    SET 
      intentional_no_outreach = FALSE,
      intentional_no_outreach_date = NULL,
      intentional_no_outreach_note = NULL
    WHERE id = p_contact_id;
  END IF;

  -- Log the action
  INSERT INTO public.contact_intentional_no_outreach_events (
    contact_id, 
    performed_by, 
    note, 
    action_type
  )
  VALUES (
    p_contact_id, 
    auth.uid(), 
    p_note, 
    p_action_type
  );
END;
$$;