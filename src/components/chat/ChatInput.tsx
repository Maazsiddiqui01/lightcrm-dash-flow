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
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isRecording, isTranscribing, stream, startRecording, stopRecording } = useVoiceRecording();

  // Track cursor position
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  const handleTextareaClick = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  };

  const handleTextareaKeyUp = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  };

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
      // Insert transcription at cursor position
      const before = message.slice(0, cursorPosition);
      const after = message.slice(cursorPosition);
      const newMessage = before + (before && !before.endsWith(' ') ? ' ' : '') + transcription + (after && !after.startsWith(' ') ? ' ' : '') + after;
      setMessage(newMessage);
      
      // Update cursor position to end of inserted text
      const newCursorPos = before.length + transcription.length + (before && !before.endsWith(' ') ? 1 : 0) + (after && !after.startsWith(' ') ? 1 : 0);
      setCursorPosition(newCursorPos);
      
      // Focus and set cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  return (
    <div className="chat-input border-t bg-background p-4">
      <div className="max-w-3xl mx-auto flex items-end gap-2">
        {!isRecording && (
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onClick={handleTextareaClick}
            onKeyUp={handleTextareaKeyUp}
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
          disabled={disabled || isSending}
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
