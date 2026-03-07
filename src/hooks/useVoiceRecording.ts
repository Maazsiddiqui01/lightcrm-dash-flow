import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { callN8nProxyFormData } from '@/lib/n8nProxy';

export function useVoiceRecording() {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      // Request high-quality audio
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000,
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setStream(mediaStream);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorderRef.current?.mimeType || "audio/webm" 
        });

        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          setStream(null);
        }

        try {
          setIsTranscribing(true);

          const user = (await supabase.auth.getUser()).data.user;
          if (!user) throw new Error("Not authenticated");

          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");
          formData.append("userId", user.id);

          // Call transcription via authenticated proxy
          const data = await callN8nProxyFormData<any>('voice-transcription', formData);

          const transcription = Array.isArray(data) && data[0]?.text ? data[0].text : null;
          resolve(transcription);
        } catch (error) {
          console.error("Error processing audio:", error);
          toast({
            title: "Error",
            description: "Failed to transcribe audio",
            variant: "destructive",
          });
          resolve(null);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [toast, stream]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      setIsRecording(false);
      audioChunksRef.current = [];
    }
  }, [isRecording, stream]);

  return {
    isRecording,
    isTranscribing,
    stream,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
