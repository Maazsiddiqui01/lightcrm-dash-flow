-- Create chat folders table
CREATE TABLE public.chat_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6F42C1',
  icon TEXT DEFAULT 'folder',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for folders
CREATE POLICY "Users can view own folders"
  ON public.chat_folders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders"
  ON public.chat_folders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON public.chat_folders
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON public.chat_folders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add folder_id to chat_conversations
ALTER TABLE public.chat_conversations
ADD COLUMN folder_id UUID REFERENCES public.chat_folders(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_chat_conversations_folder_id ON public.chat_conversations(folder_id);
CREATE INDEX idx_chat_folders_user_id ON public.chat_folders(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_chat_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chat_folders_updated_at
  BEFORE UPDATE ON public.chat_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_folders_updated_at();

-- Insert default folders for better UX
-- Note: These will be created per-user when they first use the chat
CREATE OR REPLACE FUNCTION public.create_default_chat_folders()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default folders when user creates their first conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_folders WHERE user_id = NEW.user_id
  ) THEN
    INSERT INTO public.chat_folders (user_id, name, color, icon, display_order)
    VALUES
      (NEW.user_id, 'Contacts', '#0D6EFD', 'users', 1),
      (NEW.user_id, 'Opportunities', '#198754', 'briefcase', 2),
      (NEW.user_id, 'Miscellaneous', '#6C757D', 'folder', 3);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create folders
CREATE TRIGGER create_default_folders_on_first_conversation
  AFTER INSERT ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_chat_folders();