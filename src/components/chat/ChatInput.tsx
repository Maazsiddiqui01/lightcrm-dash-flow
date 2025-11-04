import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecorder } from "./VoiceRecorder";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string, audioUrl?: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Type a message or use voice...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isRecording, isTranscribing, stream, startRecording, stopRecording } = useVoiceRecording();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSend(message.trim());
      setMessage("");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceStop = async () => {
    const transcription = await stopRecording();
    if (transcription) {
      setMessage(transcription);
      // Auto-send after transcription
      setTimeout(() => {
        if (transcription.trim()) {
          onSend(transcription.trim());
        }
      }, 100);
    }
  };

  return (
    <div className="chat-input border-t bg-background p-4">
      <div className="max-w-3xl mx-auto flex items-end gap-2">
        {!isRecording && (
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isTranscribing
                ? "Transcribing..."
                : placeholder
            }
            disabled={disabled || isSending || isRecording || isTranscribing}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
        )}

        <VoiceRecorder
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          stream={stream}
          onStart={startRecording}
          onStop={handleVoiceStop}
          disabled={disabled || isSending || !!message.trim()}
        />

        {!isRecording && (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim() || isSending || disabled || isRecording}
            className="touch-target flex-shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        )}
      </div>
      {isTranscribing && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Transcribing your message...
        </p>
      )}
    </div>
  );
}
