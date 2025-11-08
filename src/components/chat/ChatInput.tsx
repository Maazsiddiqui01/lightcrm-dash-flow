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
    <div className="p-3 md:p-4 chat-container">
      <div className="max-w-[48rem] mx-auto">
        <div className="relative flex items-end gap-2">
          {!isRecording && (
            <div className="relative flex-1 chat-input border rounded-2xl md:rounded-3xl shadow-sm focus-within:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-[rgb(var(--chat-accent))] focus-within:ring-offset-2">
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
                className="min-h-[48px] md:min-h-[52px] max-h-[180px] md:max-h-[200px] resize-none border-0 bg-transparent px-4 md:px-5 py-3 md:py-4 pr-20 md:pr-24 focus-visible:ring-0 focus-visible:ring-offset-0 chat-text text-[16px]"
                rows={1}
              />
              
              <div className="absolute right-1.5 md:right-2 bottom-1.5 md:bottom-2 flex items-center gap-0.5 md:gap-1">
                <VoiceRecorder
                  isRecording={isRecording}
                  isTranscribing={isTranscribing}
                  stream={stream}
                  onStart={startRecording}
                  onStop={handleVoiceStop}
                  disabled={disabled || isSending}
                />
                
            <Button
              onClick={handleSend}
              disabled={disabled || !message.trim() || isSending}
              size="icon"
              className="h-8 w-8 md:h-9 md:w-9 rounded-full"
              variant={message.trim() ? "default" : "ghost"}
            >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {isRecording && (
            <div className="flex-1 flex justify-center">
              <VoiceRecorder
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                stream={stream}
                onStart={startRecording}
                onStop={handleVoiceStop}
                disabled={disabled || isSending}
              />
            </div>
          )}
        </div>
        
        {isTranscribing && (
          <p className="text-sm chat-text-muted mt-2 animate-in fade-in px-2 text-center">
            Transcribing your message...
          </p>
        )}
      </div>
    </div>
  );
}
