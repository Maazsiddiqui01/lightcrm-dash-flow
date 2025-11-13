-- Create storage bucket for entity attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'entity-attachments',
  'entity-attachments',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv'
  ]
);

-- Create entity_attachments table
CREATE TABLE public.entity_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'opportunity')),
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_entity_attachments_entity ON public.entity_attachments(entity_type, entity_id);
CREATE INDEX idx_entity_attachments_uploaded_by ON public.entity_attachments(uploaded_by);
CREATE INDEX idx_entity_attachments_uploaded_at ON public.entity_attachments(uploaded_at DESC);

-- Enable RLS
ALTER TABLE public.entity_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for entity_attachments table
CREATE POLICY "Users can view attachments for their contacts"
ON public.entity_attachments FOR SELECT
USING (
  entity_type = 'contact' AND
  EXISTS (
    SELECT 1 FROM contacts_raw c
    WHERE c.id = entity_attachments.entity_id
    AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Users can view attachments for their opportunities"
ON public.entity_attachments FOR SELECT
USING (
  entity_type = 'opportunity' AND
  EXISTS (
    SELECT 1 FROM opportunities_raw o
    WHERE o.id = entity_attachments.entity_id
    AND (o.assigned_to = auth.uid() OR o.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Users can upload attachments for their contacts"
ON public.entity_attachments FOR INSERT
WITH CHECK (
  entity_type = 'contact' AND
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM contacts_raw c
    WHERE c.id = entity_attachments.entity_id
    AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Users can upload attachments for their opportunities"
ON public.entity_attachments FOR INSERT
WITH CHECK (
  entity_type = 'opportunity' AND
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM opportunities_raw o
    WHERE o.id = entity_attachments.entity_id
    AND (o.assigned_to = auth.uid() OR o.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Users can delete their own attachments"
ON public.entity_attachments FOR DELETE
USING (uploaded_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage all attachments"
ON public.entity_attachments FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Storage bucket RLS policies
CREATE POLICY "Users can view files for their entities"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'entity-attachments' AND
  (
    -- Check if user has access to the entity
    EXISTS (
      SELECT 1 FROM public.entity_attachments ea
      WHERE ea.storage_path = storage.objects.name
      AND (
        (ea.entity_type = 'contact' AND EXISTS (
          SELECT 1 FROM contacts_raw c
          WHERE c.id = ea.entity_id
          AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR is_admin(auth.uid()))
        ))
        OR
        (ea.entity_type = 'opportunity' AND EXISTS (
          SELECT 1 FROM opportunities_raw o
          WHERE o.id = ea.entity_id
          AND (o.assigned_to = auth.uid() OR o.created_by = auth.uid() OR is_admin(auth.uid()))
        ))
      )
    )
  )
);

CREATE POLICY "Users can upload files for their entities"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'entity-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'entity-attachments' AND
  (
    EXISTS (
      SELECT 1 FROM public.entity_attachments ea
      WHERE ea.storage_path = storage.objects.name
      AND (ea.uploaded_by = auth.uid() OR is_admin(auth.uid()))
    )
  )
);

CREATE POLICY "Admins can manage all storage files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'entity-attachments' AND
  is_admin(auth.uid())
);