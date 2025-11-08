import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  audio_url: string | null;
  created_at: string;
  metadata: any | null;
}

export function useChatMessages(conversationId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!conversationId,
  });

  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      audioUrl,
    }: {
      content: string;
      audioUrl?: string;
    }) => {
      if (!conversationId) throw new Error("No conversation selected");

      // Add user message
      const { data: userMessage, error: userError } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversationId,
          role: "user",
          content,
          audio_url: audioUrl || null,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Update conversation metadata
      await supabase
        .from("chat_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          message_count: messages.length + 1,
        })
        .eq("id", conversationId);

      // Get conversation history for context
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Call agent webhook
      const response = await fetch(
        "https://inverisllc.app.n8n.cloud/webhook/Agent-Tasks",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            conversationId,
            userId: (await supabase.auth.getUser()).data.user?.id,
            conversationHistory: history,
          }),
        }
      );

      if (!response.ok) throw new Error("Agent request failed");

      const agentData = await response.json();

      // Parse n8n webhook response format: [{ "output": "message" }]
      let assistantContent = "Sorry, I couldn't process that.";
      let assistantMetadata = null;

      if (Array.isArray(agentData) && agentData.length > 0 && agentData[0].output) {
        assistantContent = agentData[0].output;
        // Store raw data in metadata for potential table rendering
        if (agentData[0].data) {
          assistantMetadata = { data: agentData[0].data };
        }
      } else if (agentData.response) {
        // Fallback to old format
        assistantContent = agentData.response;
        assistantMetadata = agentData.metadata || null;
      }

      // Add assistant message
      const { error: assistantError } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversationId,
          role: "assistant",
          content: assistantContent,
          metadata: assistantMetadata,
        });

      if (assistantError) throw assistantError;

      // Update conversation again
      await supabase
        .from("chat_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          message_count: messages.length + 2,
        })
        .eq("id", conversationId);

      return userMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  return {
    messages,
    isLoading,
    sendMessage: sendMessage.mutateAsync,
    isSending: sendMessage.isPending,
  };
}
