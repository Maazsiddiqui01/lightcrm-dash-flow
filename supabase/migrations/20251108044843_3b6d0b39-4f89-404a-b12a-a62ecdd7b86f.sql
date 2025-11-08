-- Add archived column to chat_conversations
ALTER TABLE public.chat_conversations
ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;

-- Add archived_at timestamp for tracking
ALTER TABLE public.chat_conversations
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX idx_chat_conversations_archived ON public.chat_conversations(archived);

-- Add archived_by column to track who archived it
ALTER TABLE public.chat_conversations
ADD COLUMN archived_by UUID;