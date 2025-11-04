import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  isRecording: boolean;
  isTranscribing: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function VoiceRecorder({
  isRecording,
  isTranscribing,
  onStart,
  onStop,
  disabled,
}: VoiceRecorderProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant={isRecording ? "destructive" : "ghost"}
      className={cn(
        "touch-target relative",
        isRecording && "animate-pulse"
      )}
      onClick={isRecording ? onStop : onStart}
      disabled={disabled || isTranscribing}
    >
      {isRecording ? (
        <Square className="w-5 h-5 fill-current" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
      {isRecording && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-ping" />
      )}
    </Button>
  );
}
