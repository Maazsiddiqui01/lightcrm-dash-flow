-- Add group_notes column to contacts_raw table
ALTER TABLE public.contacts_raw 
ADD COLUMN group_notes text;

-- Create group_note_events table for timeline tracking
CREATE TABLE public.group_note_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name text NOT NULL,
  field text NOT NULL DEFAULT 'group_notes',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS on group_note_events
ALTER TABLE public.group_note_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see group notes for groups they belong to
CREATE POLICY users_select_own_group_notes ON public.group_note_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contacts_raw c
    WHERE c.group_contact = group_note_events.group_name
    AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
  )
);

-- Policy: Users can insert group notes for their groups
CREATE POLICY users_insert_own_group_notes ON public.group_note_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contacts_raw c
    WHERE c.group_contact = group_note_events.group_name
    AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
  )
);

-- Policy: Admins can do everything
CREATE POLICY admins_all_group_notes ON public.group_note_events
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create group_notes_timeline view
CREATE OR REPLACE VIEW public.group_notes_timeline AS
SELECT 
  group_name,
  field,
  content,
  created_at,
  created_by
FROM public.group_note_events
ORDER BY created_at DESC;

-- Create add_group_note RPC function
CREATE OR REPLACE FUNCTION public.add_group_note(
  p_group_name text,
  p_field text,
  p_content text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update all contacts in the group with the new note
  UPDATE public.contacts_raw
  SET 
    group_notes = p_content,
    updated_at = now()
  WHERE group_contact = p_group_name;
  
  -- Insert into timeline/audit log
  INSERT INTO public.group_note_events (
    group_name,
    field,
    content,
    created_by
  )
  VALUES (
    p_group_name,
    p_field,
    p_content,
    auth.uid()
  );
END;
$$;