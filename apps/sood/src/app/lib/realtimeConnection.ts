import { RefObject } from "react";

// Add public STUN servers to improve connection reliability
const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

// Check if STUN servers should be used based on environment variable
const shouldUseSTUNServers = (): boolean => {
  // Check environment variable - default to false for better transcription quality
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_USE_STUN_SERVERS) {
    return process.env.NEXT_PUBLIC_USE_STUN_SERVERS.toLowerCase() === 'true';
  }
  return false; // Default to not using STUN servers for better transcription
};

// Check if heartbeat monitoring should be enabled
const shouldUseHeartbeatMonitoring = (): boolean => {
  // Check environment variable - default to false for better performance
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_USE_HEARTBEAT) {
    return process.env.NEXT_PUBLIC_USE_HEARTBEAT.toLowerCase() === 'true';
  }
  return false; // Default to not using heartbeat for better performance
};

// Export the configuration checks for use in other files
export const connectionConfig = {
  useSTUNServers: shouldUseSTUNServers(),
  useHeartbeat: shouldUseHeartbeatMonitoring()
};

// Extend RTCDataChannel type to include our custom method
interface ReliableDataChannel extends RTCDataChannel {
  reliablySend: (message: string) => boolean;
}

export async function createRealtimeConnection(
  EPHEMERAL_KEY: string,
  audioElement: RefObject<HTMLAudioElement | null>,
  codec: string,
  language: string = "en-US",
  model: string = "gpt-4o-realtime-preview-2024-12-17",
  existingMediaStream?: MediaStream | null
): Promise<{ pc: RTCPeerConnection; dc: ReliableDataChannel }> {
  const useSTUNServers = shouldUseSTUNServers();
  console.log(`[RealtimeConnection] Creating connection with language: ${language}, codec: ${codec}, model: ${model}, useSTUNServers: ${useSTUNServers}`);
  
  try {
    // Create RTCPeerConnection with or without STUN servers based on configuration
    const pc = useSTUNServers ? 
      new RTCPeerConnection({
        iceServers: DEFAULT_ICE_SERVERS,
        iceCandidatePoolSize: 10, // Increase candidate pool for better connectivity
      }) : 
      new RTCPeerConnection(); // Simple configuration for better transcription
    
    console.log(`[RealtimeConnection] RTCPeerConnection created ${useSTUNServers ? 'with' : 'without'} ICE servers`);
    
    // Add connection state change logging with enhanced error handling
    pc.onconnectionstatechange = () => {
      console.log(`[RealtimeConnection] Connection state changed: ${pc.connectionState}`);
      
      // Monitor for failed or disconnected states
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.error(`[RealtimeConnection] Connection in problematic state: ${pc.connectionState}`);
        // Connection state events will trigger reconnection logic in the hook
      }
    };
    
    // Add ICE connection state change logging with enhanced monitoring
    pc.oniceconnectionstatechange = () => {
      console.log(`[RealtimeConnection] ICE connection state: ${pc.iceConnectionState}`);
      
      // Monitor for failed or disconnected ICE states
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.error(`[RealtimeConnection] ICE connection in problematic state: ${pc.iceConnectionState}`);
        // We don't force reconnection here as the connection state handler will handle it
      }
    };
    
    // Add signaling state change logging
    pc.onsignalingstatechange = () => {
      console.log(`[RealtimeConnection] Signaling state: ${pc.signalingState}`);
    };
    
    // Add ICE gathering state change logging
    pc.onicegatheringstatechange = () => {
      console.log(`[RealtimeConnection] ICE gathering state: ${pc.iceGatheringState}`);
    };
    
    // Log when ICE candidates are added with timeout monitoring
    let iceCandidateTimeout: NodeJS.Timeout | null = null;
    let iceCandidateCount = 0;
    
    pc.onicecandidate = (event) => {
      if (connectionConfig.useSTUNServers) {
        if (event.candidate) {
          
          iceCandidateCount++;
          console.log(`[RealtimeConnection] New ICE candidate (${iceCandidateCount}): ${event.candidate.candidate.substring(0, 50)}...`);
          
          // Reset timeout each time we get a candidate
          if (iceCandidateTimeout) {
            clearTimeout(iceCandidateTimeout);
          }
          
          // Set a timeout to detect if ICE gathering is stalled
          iceCandidateTimeout = setTimeout(() => {
            console.warn("[RealtimeConnection] ICE candidate gathering may be stalled, but proceeding anyway");
          }, 5000);
        } else {
          console.log("[RealtimeConnection] ICE candidate gathering complete");
          if (iceCandidateTimeout) {
            clearTimeout(iceCandidateTimeout);
            iceCandidateTimeout = null;
          }
        }
      }
    };
    
    pc.ontrack = (e) => {
      console.log("[RealtimeConnection] Received remote track");
      if (audioElement.current) {
        audioElement.current.srcObject = e.streams[0];
        console.log("[RealtimeConnection] Set audio element source");
        
        // Add event listeners to the audio stream for better error detection
        const audioTrack = e.streams[0].getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.onended = () => {
            console.warn("[RealtimeConnection] Audio track ended unexpectedly");
          };
          
          audioTrack.onmute = () => {
            console.warn("[RealtimeConnection] Audio track muted");
          };
          
          audioTrack.onunmute = () => {
            console.log("[RealtimeConnection] Audio track unmuted");
          };
        }
      } else {
        console.warn("[RealtimeConnection] Audio element not available to set track");
      }
    };

    // Use existing media stream if provided, otherwise request new one
    let mediaStream: MediaStream;
    
    if (existingMediaStream && existingMediaStream.active) {
      console.log("[RealtimeConnection] Using existing media stream");
      mediaStream = existingMediaStream;
    } else {
      // Check if navigator.mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("[RealtimeConnection] MediaDevices API or getUserMedia not supported in this browser or context.");
        throw new Error("Media devices API not available. This may be because you're not in a secure context (HTTPS), using an incompatible browser, or microphone access is blocked.");
      }
      
      try {
        console.log("[RealtimeConnection] Requesting microphone access");
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("[RealtimeConnection] Microphone access granted");
      } catch (error) {
        console.error("[RealtimeConnection] Failed to access microphone:", error);
        throw new Error("Could not access microphone. Please ensure microphone permissions are granted and the device has a working microphone.");
      }
    }
    
    pc.addTrack(mediaStream.getTracks()[0]);
    console.log("[RealtimeConnection] Added audio track to peer connection");

    // Set codec preferences based on selected codec from the query parameter.
    const capabilities = RTCRtpSender.getCapabilities("audio");
    if (capabilities) {
      console.log(`[RealtimeConnection] Available codecs: ${capabilities.codecs.map(c => c.mimeType).join(', ')}`);
      const chosenCodec = capabilities.codecs.find(
        (c) => c.mimeType.toLowerCase() === `audio/${codec}`
      );
      if (chosenCodec) {
        console.log(`[RealtimeConnection] Setting preferred codec: ${chosenCodec.mimeType}`);
        pc.getTransceivers()[0].setCodecPreferences([chosenCodec]);
      } else {
        console.warn(
          `[RealtimeConnection] Codec "${codec}" not found in capabilities. Using default settings.`
        );
      }
    } else {
      console.warn("[RealtimeConnection] RTCRtpSender.getCapabilities not available, cannot set codec preferences");
    }

    // Create data channel with reliability options
    console.log("[RealtimeConnection] Creating data channel");
    const dc = pc.createDataChannel("oai-events", {
      ordered: true,       // Ensure messages arrive in order
      maxRetransmits: 3    // Allow retransmission of failed messages
    }) as ReliableDataChannel; // Cast to our extended interface
    
    // Add data channel event listeners with enhanced error handling
    dc.onopen = () => {
      console.log("[RealtimeConnection] Data channel opened");
    };
    
    dc.onclose = () => {
      console.log("[RealtimeConnection] Data channel closed");
    };
    
    dc.onerror = (error) => {
      console.error("[RealtimeConnection] Data channel error:", error);
      
      // Create a more detailed error object
      const detailedError = {
        timestamp: new Date().toISOString(),
        errorType: error.type || 'unknown',
        errorMessage: 'Data channel error occurred'
      };
      
      console.error("[RealtimeConnection] Detailed data channel error:", detailedError);
    };
    
    // Add message buffering mechanism
    const pendingMessages: string[] = [];
    let isResendingMessages = false;
    
    // Custom method to reliably send messages
    dc.reliablySend = (message: string) => {
      if (dc.readyState === 'open') {
        try {
          dc.send(message);
          return true;
        } catch (err) {
          console.warn("[RealtimeConnection] Error sending message, adding to pending queue:", err);
          pendingMessages.push(message);
          return false;
        }
      } else {
        pendingMessages.push(message);
        return false;
      }
    };
    
    // Process for resending pending messages
    const resendPendingMessages = () => {
      if (isResendingMessages || pendingMessages.length === 0 || dc.readyState !== 'open') {
        return;
      }
      
      isResendingMessages = true;
      
      try {
        while (pendingMessages.length > 0 && dc.readyState === 'open') {
          const message = pendingMessages.shift();
          if (message) {
            dc.send(message);
            console.log("[RealtimeConnection] Resent pending message successfully");
          }
        }
      } catch (err) {
        console.error("[RealtimeConnection] Error resending pending messages:", err);
      } finally {
        isResendingMessages = false;
      }
    };
    
    // Attempt to resend messages when the channel opens
    dc.addEventListener('open', () => {
      setTimeout(resendPendingMessages, 500);
    });

    console.log("[RealtimeConnection] Creating offer");
    const offer = await pc.createOffer();
    console.log("[RealtimeConnection] Created offer, setting local description");
    await pc.setLocalDescription(offer);
    console.log("[RealtimeConnection] Set local description");

    const baseUrl = "https://api.openai.com/v1/realtime";
    const requestUrl = `${baseUrl}?model=${model}`;
    
    console.log(`[RealtimeConnection] Sending SDP to ${requestUrl}`);
    
    // Add request timing information - declare outside try block for catch access
    const startTime = Date.now();
    
    try {
      // Log headers for debugging (excluding Authorization which contains sensitive data)
      console.log("[RealtimeConnection] Request headers:", {
        'Content-Type': 'application/sdp',
        'Authorization': 'Bearer [REDACTED]'
      });
      
      console.log(`[RealtimeConnection] 🚀 API request started at: ${new Date(startTime).toISOString()}`);
      console.log(`[RealtimeConnection] ⏰ API Start Time: ${startTime}`);
      
      // Use fetch with reduced timeout for faster failure detection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`[RealtimeConnection] ⚠️ API request timeout after 8 seconds`);
        controller.abort();
      }, 8000); // Reduced from 15 seconds to 8 seconds for faster feedback
      
      console.log(`[RealtimeConnection] 📤 Sending SDP offer to OpenAI API...`);
      const sdpResponse = await fetch(requestUrl, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const endTime = Date.now();
      const apiDuration = endTime - startTime;
      console.log(`[RealtimeConnection] ✅ API request completed in ${apiDuration}ms`);
      console.log(`[RealtimeConnection] ⏰ API End Time: ${endTime}`);
      console.log(`[RealtimeConnection] 🚀 API Speed: ${apiDuration < 2000 ? 'FAST' : apiDuration < 5000 ? 'NORMAL' : 'SLOW'}`);
      
      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error(`[RealtimeConnection] ❌ API error (${sdpResponse.status}) after ${apiDuration}ms:`, errorText);
        // Add more detailed error information
        console.error(`[RealtimeConnection] Response headers:`, 
          Object.fromEntries([...sdpResponse.headers.entries()]));
        throw new Error(`API returned ${sdpResponse.status}: ${errorText}`);
      }
      
      console.log("[RealtimeConnection] 📥 Received SDP answer from OpenAI API");
      const answerSdp = await sdpResponse.text();
      const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: answerSdp,
      };

      console.log("[RealtimeConnection] 🔧 Setting remote description");
      const remoteDescStartTime = Date.now();
      await pc.setRemoteDescription(answer);
      const remoteDescEndTime = Date.now();
      console.log(`[RealtimeConnection] ✅ Set remote description successfully in ${remoteDescEndTime - remoteDescStartTime}ms`);
    } catch (error) {
      const errorTime = Date.now();
      const totalErrorTime = errorTime - startTime;
      console.error(`[RealtimeConnection] ❌ API connection error after ${totalErrorTime}ms:`, error);
      
      // Add detailed error logging
      if (error instanceof Error) {
        console.error('[RealtimeConnection] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        // Handle abort errors specifically
        if (error.name === 'AbortError') {
          throw new Error('API request timed out after 8 seconds. Network may be unstable or OpenAI API is slow.');
        }
      }
      
      throw error;
    }

    console.log("[RealtimeConnection] WebRTC setup completed successfully");
    return { pc, dc };
  } catch (error) {
    console.error('[RealtimeConnection] Failed to create connection:', error);
    throw error;
  }
}