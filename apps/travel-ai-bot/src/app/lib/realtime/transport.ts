import { OpenAIRealtimeWebRTC } from '@openai/agents/realtime';

type Ref<T> = { current: T };

export interface TransportTargetRefs {
  audioElementRef: Ref<HTMLAudioElement | null>;
  peerConnectionRef: Ref<RTCPeerConnection | null>;
  audioSenderRef: Ref<RTCRtpSender | null>;
}

export interface CreatedTransport {
  transport: OpenAIRealtimeWebRTC;
}

/**
 * Create WebRTC transport and wire refs for audio element, peer connection and audio sender.
 * This mirrors logic from the hook without changing behavior.
 */
export function createRealtimeTransport(targetRefs: TransportTargetRefs): CreatedTransport {
  // Create hidden audio element for WebRTC playback
  const audioElement = document.createElement('audio');
  audioElement.autoplay = true;
  audioElement.muted = true; // default to muted until user enables
  audioElement.style.display = 'none';
  document.body.appendChild(audioElement);
  targetRefs.audioElementRef.current = audioElement;

  // Helper to toggle mic track
  const setMicEnabled = (enabled: boolean) => {
    try {
      const sender = targetRefs.audioSenderRef.current;
      const track = (sender?.track as MediaStreamTrack | undefined);
      if (track && typeof track.enabled !== 'undefined') {
        track.enabled = enabled;
        console.log('[SDK-Realtime] 🎚️ Mic track toggled:', enabled);
      } else {
        console.log('[SDK-Realtime] ⚠️ No local audio track found to toggle');
      }
    } catch (e) {
      console.warn('[SDK-Realtime] ⚠️ setMicEnabled failed:', e);
    }
  };

  // Create transport and capture peer connection and audio sender
  const transport = new OpenAIRealtimeWebRTC({
    audioElement,
    changePeerConnection: async (pc: RTCPeerConnection) => {
      targetRefs.peerConnectionRef.current = pc;
      setTimeout(() => {
        try {
          const senders = pc.getSenders?.() || [];
          const audioSender = (senders.find((s: any) => s?.track?.kind === 'audio') || null) as RTCRtpSender | null;
          targetRefs.audioSenderRef.current = audioSender;
          // Disable mic track by default (PTT-only)
          setMicEnabled(false);
          console.log('[SDK-Realtime] 🎤 Local audio sender captured and disabled by default');
        } catch (e) {
          console.warn('[SDK-Realtime] ⚠️ Discover audio sender failed:', e);
        }
      }, 300);
      return pc;
    },
  });

  return { transport };
}


