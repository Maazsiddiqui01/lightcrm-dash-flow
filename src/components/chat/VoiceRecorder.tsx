import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioVisualizer } from "./AudioVisualizer";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  isRecording: boolean;
  isTranscribing: boolean;
  stream: MediaStream | null;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function VoiceRecorder({
  isRecording,
  isTranscribing,
  stream,
  onStart,
  onStop,
  disabled,
}: VoiceRecorderProps) {
  return (
    <div className="relative flex items-center gap-2">
      {isRecording && (
        <div className="relative w-64 h-20 bg-muted/50 rounded-lg border border-border overflow-hidden">
          <AudioVisualizer stream={stream} isRecording={isRecording} />
          <div className="absolute bottom-2 left-2 text-xs text-muted-foreground animate-pulse">
            Recording...
          </div>
        </div>
      )}
      
      <Button
        type="button"
        size="icon"
        variant={isRecording ? "destructive" : "ghost"}
        className={cn(
          "touch-target relative flex-shrink-0",
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
    </div>
  );
}
