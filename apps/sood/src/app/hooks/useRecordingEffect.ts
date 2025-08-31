import { useEffect, MutableRefObject } from "react";
import { SessionStatus } from "@/app/types";

interface UseRecordingEffectProps {
  sessionStatus: SessionStatus;
  audioElementRef: MutableRefObject<HTMLAudioElement | null>;
  startRecording: (stream: MediaStream) => void;
  stopRecording: () => void;
}

export function useRecordingEffect({
  sessionStatus,
  audioElementRef,
  startRecording,
  stopRecording,
}: UseRecordingEffectProps) {
  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    return () => {
      stopRecording();
    };
  }, [sessionStatus, audioElementRef, startRecording, stopRecording]);
} 