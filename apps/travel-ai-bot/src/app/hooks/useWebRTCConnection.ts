import { useRef, useState, useEffect, useCallback } from "react";
import { useEvent } from "@/app/contexts/EventContext";
import { createRealtimeConnection, connectionConfig } from "@/app/lib/realtimeConnection";
import { SessionStatus } from "@/app/types";
import { useConversationLogger } from "@/app/hooks/useConversationLogger";
import { useSessionRegistry } from "./useSessionRegistry";

// Constants for reconnection
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

// Constants for volume settings
const VOLUME_STORAGE_KEY = 'openai_audio_volume';
const DEFAULT_VOLUME = 1.0; // 100% volume by default

// Preload cache for faster initialization
const preloadCache = {
  ephemeralKey: null as string | null,
  keyExpiry: 0,
  mediaStream: null as MediaStream | null,
  isPreloading: false
};

interface UseWebRTCConnectionProps {
  isAudioPlaybackEnabled: boolean;
  handleServerEvent: (event: any) => void;
  urlCodec: string;
  urlModel: string;
  language?: string;
}

interface UseWebRTCConnectionReturn {
  sessionStatus: SessionStatus;
  setSessionStatus: React.Dispatch<React.SetStateAction<SessionStatus>>;
  connectToRealtime: () => Promise<void>;
  disconnectFromRealtime: () => void;
  dataChannel: RTCDataChannel | null;
  pcRef: React.RefObject<RTCPeerConnection | null>;
  dcRef: React.RefObject<RTCDataChannel | null>;
  audioElementRef: React.RefObject<HTMLAudioElement | null>;
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void;
  preloadConnection: () => Promise<void>;
  enableMic: () => void;
  disableMic: () => void;
}

export function useWebRTCConnection({
  isAudioPlaybackEnabled,
  handleServerEvent,
  urlCodec,
  urlModel,
  language = "en-US",
}: UseWebRTCConnectionProps): UseWebRTCConnectionReturn {
  const { logClientEvent, logServerEvent } = useEvent();
  const { logSessionStart, logSessionEnd } = useConversationLogger();
  
  // Get the sessionRegistry directly
  const sessionRegistry = useSessionRegistry();
  const { registerUserSession } = sessionRegistry;
  
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("DISCONNECTED");
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  // Expose helpers to enable/disable mic for push-to-talk
  const enableMic = useCallback(() => {
    try {
      if (preloadCache.mediaStream) {
        preloadCache.mediaStream.getAudioTracks().forEach(t => (t.enabled = true));
        // console.debug('[WebRTC] Mic enabled');
      }
    } catch {}
  }, []);

  const disableMic = useCallback(() => {
    try {
      if (preloadCache.mediaStream) {
        preloadCache.mediaStream.getAudioTracks().forEach(t => (t.enabled = false));
        // console.debug('[WebRTC] Mic disabled');
      }
    } catch {}
  }, []);
  const mediaDevicesUnavailableRef = useRef<boolean>(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // New refs for reconnection
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeBotIdRef = useRef<string | null>(null);
  const isReconnectingRef = useRef<boolean>(false);
  const wasConnectedRef = useRef<boolean>(false);

  // Track language changes for stable reconnection
  const previousLanguageRef = useRef<string>(language);

  // Track connection state for reconnection logic
  useEffect(() => {
    wasConnectedRef.current = sessionStatus === "CONNECTED";
  }, [sessionStatus]);

  // Preload function for faster connection
  const preloadConnection = useCallback(async () => {
    if (preloadCache.isPreloading) {
      console.log("[WebRTC] Preload already in progress");
      return;
    }

    // console.debug("[WebRTC] Starting connection preload...");
    preloadCache.isPreloading = true;

    try {
      // Parallel preloading of ephemeral key and media stream
      const [ephemeralKey, mediaStream] = await Promise.all([
        fetchEphemeralKey(),
        getMediaStreamWithCache()
      ]);

      if (ephemeralKey) {
        preloadCache.ephemeralKey = ephemeralKey;
        preloadCache.keyExpiry = Date.now() + 4 * 60 * 1000; // 4 minutes from now
        // console.debug("[WebRTC] Ephemeral key preloaded");
      }

      if (mediaStream) {
        preloadCache.mediaStream = mediaStream;
        // console.debug("[WebRTC] Media stream preloaded");
      }

      // console.debug("[WebRTC] Preload completed successfully");
    } catch (error) {
      console.warn("[WebRTC] Preload failed:", error);
    } finally {
      preloadCache.isPreloading = false;
    }
  }, []);

  // Optimized media stream getter with caching
  const getMediaStreamWithCache = useCallback(async (): Promise<MediaStream | null> => {
    // Check if we have a cached stream that's still active
    if (preloadCache.mediaStream && preloadCache.mediaStream.active) {
      // console.debug("[WebRTC] Using cached media stream");
      return preloadCache.mediaStream;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("[WebRTC] MediaDevices API not available");
        mediaDevicesUnavailableRef.current = true;
        return null;
      }

      // console.debug("[WebRTC] Requesting new media stream");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: { ideal: true }, 
          // Removes echo caused by your microphone picking up sound from your speakers/headset.
          // ✅ Keep enabled for AI chatbot — avoids “feedback loops” when AI speaks back.
      
          noiseSuppression: { ideal: true }, 
          // Filters out constant background noise (e.g., fans, AC, keyboard typing).
          // ✅ Essential when you have background noise.
      
          autoGainControl: { ideal: true }, 
          // Automatically adjusts microphone input volume so it’s neither too quiet nor too loud.
          // ⚠️ In noisy environments, AGC can sometimes amplify background sounds — test if you prefer fixed gain.
      
          channelCount: { ideal: 1 }, 
          // Mono audio. Chatbots don’t need stereo — reduces data size and processing load.
          // ✅ Best to keep 1 for speech-to-text tasks.
      
          sampleRate: 20000 
          // Audio sampling rate in Hz. Common STT models work best with 16,000–24,000 Hz.
          // ✅ For OpenAI Realtime API, 16,000 or 24,000 is most common.
          //    20,000 Hz is acceptable, but 16,000 Hz is the standard for speech recognition and can improve performance in noise.
        } 
      });
      
      preloadCache.mediaStream = stream;
      // Start with mic muted (PTT off by default)
      try {
        stream.getAudioTracks().forEach(t => (t.enabled = false));
        // console.debug('[WebRTC] Mic track(s) initialized as disabled for PTT');
      } catch {}
      return stream;
    } catch (error) {
      console.error("[WebRTC] Failed to get media stream:", error);
      mediaDevicesUnavailableRef.current = true;
      return null;
    }
  }, []);

  // Effect to handle language changes
  useEffect(() => {
    // Skip first render
    if (previousLanguageRef.current === language) {
      return;
    }
    
    // console.debug(`[WebRTC] Language changed from ${previousLanguageRef.current} to ${language}`);
    previousLanguageRef.current = language;
    
    // If already connected, we'll let the App component handle reconnection
    // This is just to update the internal reference
  }, [language]);

  // Load previously active bot ID from localStorage on init
  useEffect(() => {
    try {
      const storedBotId = localStorage.getItem('active_bot_id');
      if (storedBotId) {
        activeBotIdRef.current = storedBotId;
        // console.debug(`[WebRTC] Loaded previously active bot ID: ${storedBotId}`);
      }
    } catch (e) {
      console.warn('[WebRTC] Could not read active bot ID from localStorage:', e);
    }
  }, []);

  // Auto-preload on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      preloadConnection();
    }, 100); // Small delay to avoid blocking initial render

    return () => clearTimeout(timer);
  }, [preloadConnection]);

  // Function to track active bot ID
  const setActiveBotId = (botId: string | null) => {
    if (botId) {
      activeBotIdRef.current = botId;
      try {
        localStorage.setItem('active_bot_id', botId);
        // console.debug(`[WebRTC] Set active bot ID: ${botId}`);
      } catch (e) {
        console.warn('[WebRTC] Could not save active bot ID to localStorage:', e);
      }
    }
  };

  // Function to get active bot ID
  const getActiveBotId = (): string | null => {
    return activeBotIdRef.current;
  };

  const fetchEphemeralKey = async (): Promise<string | null> => {
    // Check cache first
    if (preloadCache.ephemeralKey && preloadCache.keyExpiry > Date.now()) {
    // console.debug("[WebRTC] Using cached ephemeral key");
      return preloadCache.ephemeralKey;
    }

    // console.debug("[WebRTC] Fetching ephemeral key...");
    const startTime = Date.now();
    
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    try {
      // console.debug("[WebRTC] Making request to /api/session endpoint");
      const tokenResponse = await fetch("/api/session", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        }
      });
      
      const endTime = Date.now();
      // console.debug(`[WebRTC] Session token response received in ${endTime - startTime}ms`);
      // console.debug(`[WebRTC] Response status: ${tokenResponse.status} ${tokenResponse.statusText}`);
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error(`[WebRTC] Session API error (${tokenResponse.status}):`, errorText);
        setSessionStatus("DISCONNECTED");
        return null;
      }
      
      const data = await tokenResponse.json();
      logServerEvent(data, "fetch_session_token_response");
      // console.debug("[WebRTC] Session token response data:", {
      //   hasClientSecret: !!data.client_secret,
      //   hasValue: data.client_secret && !!data.client_secret.value,
      //   expires_at: data.client_secret?.expires_at,
      //   cached: data.cached
      // });

      if (!data.client_secret?.value) {
        logClientEvent(data, "error.no_ephemeral_key");
        console.error("[WebRTC] No ephemeral key provided by the server");
        setSessionStatus("DISCONNECTED");
        return null;
      }

      const keyFirstChars = data.client_secret.value.substring(0, 5);
      // console.debug(`[WebRTC] Ephemeral key successfully obtained. Key starts with: ${keyFirstChars}...`);
      return data.client_secret.value;
    } catch (error) {
      console.error("[WebRTC] Error fetching ephemeral key:", error);
      
      // Type-safe error logging
      if (error instanceof Error) {
        console.error("[WebRTC] Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 200)
        });
      }
      
      setSessionStatus("DISCONNECTED");
      return null;
    }
  };

  // Function to sanitize event payloads before sending to API
  const sanitizeEventPayload = (event: any): any => {
    // Clone the event to avoid modifying the original
    const sanitized = {...event};
    
    // Remove any metadata fields
    if (sanitized.metadata) {
        // console.debug('[WebRTC] Removing unsupported metadata field from event');
      delete sanitized.metadata;
    }
    
    // Handle session updates
    if (sanitized.type === 'session.update' && sanitized.session) {
      if (sanitized.session.metadata) {
        // console.debug('[WebRTC] Removing unsupported session.metadata field');
        delete sanitized.session.metadata;
      }
    }
    
    // Handle conversation items
    if (sanitized.type === 'conversation.item.create' && sanitized.item) {
      // Ensure content uses input_text instead of text
      if (sanitized.item.content && Array.isArray(sanitized.item.content)) {
        sanitized.item.content = sanitized.item.content.map((contentItem: any) => {
          if (contentItem.type === 'text') {
            // console.debug('[WebRTC] Converting content type from "text" to "input_text"');
            return {
              ...contentItem,
              type: 'input_text'
            };
          }
          return contentItem;
        });
      }
    }
    
    return sanitized;
  };

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      try {
        const preview = (() => {
          try { return JSON.stringify(eventObj).slice(0, 200); } catch { return String(eventObj?.type || ''); }
        })();
        console.log(`[VoiceRealtime] ▶ low-level send: ${eventObj?.type || ''} ${eventNameSuffix ? '('+eventNameSuffix+')' : ''} | dc=open | payload_preview=${preview}${preview.length===200?'…':''}`);
      } catch {}
      logClientEvent(eventObj, eventNameSuffix);
      
      // Track active bot ID for reconnection and add language info for agent transfers
      if (eventObj.type === 'agent.transfer.initialize' && eventObj.agent_id) {
        setActiveBotId(eventObj.agent_id);
        
        // Add language information to the transfer payload if not already present
        if (!eventObj.metadata) {
          eventObj.metadata = {};
        }
        
        // Add the current language to metadata - this will be available to the next bot
        if (!eventObj.metadata.language) {
          eventObj.metadata.language = language;
          // console.debug(`[WebRTC] Adding language metadata to transfer: ${language}`);
        }
      }
      
      // Improved logging for debugging API errors
      // console.debug(`[WebRTC] Sending event: ${eventObj.type}`, JSON.stringify(eventObj, null, 2));
      
      // Handle special cases based on event type
      if (eventObj.type && eventObj.type.startsWith('_internal')) {
        // IMPORTANT: Do NOT send internal events to the API directly
        // They should only be processed locally by our handler
        // console.debug(`[WebRTC] Not sending internal event to API: ${eventObj.type}`);
        
        // Instead of sending to API, trigger the local handler directly
        // This ensures the internal event is processed without sending to OpenAI
        if (eventObj.type === '_internal.agent.transfer.initialize') {
          // console.debug(`[WebRTC] Processing internal transfer event locally`);
          // The event will be handled by the normal event flow
          // We don't need to send it to the API
          
          // Track this bot ID for reconnection
          if (eventObj.agent_id) {
            setActiveBotId(eventObj.agent_id);
          }
        }
      } 
      // Special case for response.create events with transfer_response flag
      else if (eventObj.type === 'response.create' && eventObj.transfer_response === true) {
        console.log(`[WebRTC] Sending transfer response event: ${eventObj.type}`);
        
        // Send a modified version without the transfer_response flag to avoid confusion
        const modifiedEvent = {...eventObj};
        delete modifiedEvent.transfer_response;
        
        // Sanitize the event before sending
        const sanitizedEvent = sanitizeEventPayload(modifiedEvent);
        
        // Use the reliable send method if available, fall back to regular send
        if ('reliablySend' in dcRef.current) {
          (dcRef.current as any).reliablySend(JSON.stringify(sanitizedEvent));
        } else {
          dcRef.current.send(JSON.stringify(sanitizedEvent));
        }
      }
      // All other events
      else {
        // Sanitize the event before sending
        const sanitizedEvent = sanitizeEventPayload(eventObj);
        
        // Use the reliable send method if available, fall back to regular send
        if ('reliablySend' in dcRef.current) {
          (dcRef.current as any).reliablySend(JSON.stringify(sanitizedEvent));
        } else {
          dcRef.current.send(JSON.stringify(sanitizedEvent));
        }
      }
    } else {
      try {
        console.warn(`[VoiceRealtime] ⚠ send blocked: ${eventObj?.type || ''} ${eventNameSuffix ? '('+eventNameSuffix+')' : ''} | dc=${dcRef.current?.readyState || 'none'}`);
      } catch {}
      logClientEvent(
        { attemptedEvent: eventObj.type },
        "error.data_channel_not_open"
      );
      console.error(
        "[WebRTC] Failed to send message - no data channel available",
        eventObj
      );
      
      // Attempt to reconnect if the data channel is not open
      if (sessionStatus !== "CONNECTING") {
        attemptReconnection();
      }
    }
  };

  // New function to attempt reconnection
  const attemptReconnection = () => {
    if (isReconnectingRef.current) {
      // console.debug("[WebRTC] Already attempting to reconnect");
      return;
    }
    
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      // console.debug(`[WebRTC] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
      reconnectAttemptsRef.current = 0;
      isReconnectingRef.current = false;
      return;
    }
    
    isReconnectingRef.current = true;
    reconnectAttemptsRef.current++;
    
    const delay = RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttemptsRef.current - 1);
    // console.debug(`[WebRTC] Attempting reconnection ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(async () => {
      if (sessionStatus !== "CONNECTED") {
      // console.debug("[WebRTC] Executing reconnection attempt");
        await reconnectToLatestBot();
      } else {
      // console.debug("[WebRTC] Already connected, canceling reconnection attempt");
        isReconnectingRef.current = false;
      }
    }, delay);
  };

  // New function to reconnect to the latest bot
  const reconnectToLatestBot = async () => {
    // console.debug("[WebRTC] Reconnecting to latest bot");
    
    // Store the active bot ID before disconnecting
    const latestBotId = getActiveBotId();
    // console.debug(`[WebRTC] Latest active bot ID: ${latestBotId || 'none'}`);
    
    // First disconnect existing connection
    if (sessionStatus !== "DISCONNECTED") {
      disconnectFromRealtime();
    }
    
    // Reconnect
    try {
      await connectToRealtime();
      
      // Add a delay to ensure the connection is fully established
      setTimeout(() => {
        // Once connected, transfer to the latest bot if needed
        if (latestBotId && dcRef.current?.readyState === "open") {
          console.log(`[WebRTC] Transferring to previous bot: ${latestBotId}`);
          sendClientEvent({
            type: "agent.transfer.initialize",
            agent_id: latestBotId
          });
        }
        isReconnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
      }, 1000);
    } catch (error) {
      console.error("[WebRTC] Reconnection failed:", error);
      isReconnectingRef.current = false;
      
      // Try again if we haven't exceeded max attempts
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        attemptReconnection();
      } else {
        reconnectAttemptsRef.current = 0;
      }
    }
  };

  // Audio creation and volume management
  const initializeAudioElement = () => {
    if (!audioElementRef.current) {
      audioElementRef.current = document.createElement("audio");
      console.log("[WebRTC] Created audio element");
      
      // Restore saved volume from localStorage
      try {
        const savedVolume = localStorage.getItem(VOLUME_STORAGE_KEY);
        if (savedVolume !== null) {
          const volumeLevel = parseFloat(savedVolume);
          if (!isNaN(volumeLevel) && volumeLevel >= 0 && volumeLevel <= 1) {
            audioElementRef.current.volume = volumeLevel;
            console.log(`[WebRTC] Restored volume level: ${volumeLevel * 100}%`);
          } else {
            audioElementRef.current.volume = DEFAULT_VOLUME;
          }
        } else {
          audioElementRef.current.volume = DEFAULT_VOLUME;
        }
      } catch (e) {
        console.warn('[WebRTC] Could not restore volume from localStorage:', e);
        audioElementRef.current.volume = DEFAULT_VOLUME;
      }
      
      // Add volume change listener to save changes
      audioElementRef.current.addEventListener('volumechange', () => {
        try {
          const currentVolume = audioElementRef.current?.volume || DEFAULT_VOLUME;
          localStorage.setItem(VOLUME_STORAGE_KEY, currentVolume.toString());
          console.log(`[WebRTC] Saved volume level: ${currentVolume * 100}%`);
        } catch (e) {
          console.warn('[WebRTC] Could not save volume to localStorage:', e);
        }
      });
    }
    
    // Set autoplay based on current preference
    if (audioElementRef.current) {
      audioElementRef.current.autoplay = isAudioPlaybackEnabled;
    }
  };

  const connectToRealtime = async () => {
    if (mediaDevicesUnavailableRef.current) {
      console.warn("[WebRTC] MediaDevices API is unavailable in this environment. Not attempting to connect.");
      return;
    }

    if (sessionStatus !== "DISCONNECTED") {
      console.log(`[WebRTC] Cannot connect - current status is ${sessionStatus}`);
      return;
    }

    // Add guard to prevent multiple simultaneous connection attempts
    if (isReconnectingRef.current) {
      console.log("[WebRTC] Connection attempt already in progress, skipping duplicate request");
      return;
    }
    
    isReconnectingRef.current = true;
    setSessionStatus("CONNECTING");
    console.log("[WebRTC] Fast connection process started");
    
    // Reduced timeout for faster feedback - match API timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    
    const connectionStartTime = Date.now();
    console.log(`[WebRTC] ⏰ Connection process start time: ${connectionStartTime}`);
    
    connectionTimeoutRef.current = setTimeout(() => {
      const timeoutTime = Date.now();
      const totalTime = timeoutTime - connectionStartTime;
      console.error(`[WebRTC] ❌ Connection attempt timed out after ${totalTime}ms (8 second limit)`);
      setSessionStatus("DISCONNECTED");
      isReconnectingRef.current = false; // Reset guard
      // Clean up any partial connection
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      dcRef.current = null;
    }, 8000); // Reduced from 10s to 8s to match API timeout

    try {
      // Use preloaded resources for faster connection
      // console.debug("[WebRTC] Using optimized connection with preloaded resources");
      
      // Get ephemeral key (may use cache)
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        console.error("[WebRTC] Failed to get ephemeral key");
        setSessionStatus("DISCONNECTED");
        isReconnectingRef.current = false;
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        return;
      }

      // Initialize audio element with volume restoration
      initializeAudioElement();

      // Get media stream (may use cache)
      const mediaStream = await getMediaStreamWithCache();
      if (!mediaStream) {
        console.error("[WebRTC] Failed to get media stream");
        setSessionStatus("DISCONNECTED");
        isReconnectingRef.current = false;
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        return;
      }

      // console.debug("[WebRTC] Creating optimized realtime connection");
      // console.debug(`[WebRTC] Connection params: language=${language}, codec=${urlCodec}, model=${urlModel}`);
      
      // Use existing connection creation but with preloaded media stream
      const { pc, dc } = await createRealtimeConnection(
        EPHEMERAL_KEY,
        audioElementRef,
        urlCodec,
        language,
        urlModel,
        mediaStream
      );
      
      // console.debug("[WebRTC] Optimized realtime connection created successfully");
      pcRef.current = pc;
      dcRef.current = dc;

      try {
        dc.addEventListener("open", () => {
          // console.debug("[WebRTC] Data channel opened");
          logClientEvent({}, "data_channel.open");
          setSessionStatus("CONNECTED");
          isReconnectingRef.current = false; // Reset guard on successful connection
          
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          
          // Log session start with a session ID derived from the ephemeral key
          const sessionId = EPHEMERAL_KEY.substring(0, 8);
          
          // Store the sessionId for future reference - safely
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem('openai_session_id', sessionId);
            }
          } catch (e) {
            console.warn('[WebRTC] Could not store session ID in localStorage:', e);
          }
          
          // Also add it to the peer connection for reference during disconnect
          (pc as any).sessionId = sessionId;
          
          logSessionStart(sessionId);
          
          registerUserSession(sessionId);
          
          // Check if we need to reconnect to a previous bot
          const latestBotId = getActiveBotId();
          if (latestBotId) {
            // console.debug(`[WebRTC] Auto-reconnecting to previous bot: ${latestBotId}`);
            // Wait a bit to ensure the connection is fully established
            setTimeout(() => {
              if (dcRef.current?.readyState === "open") {
                sendClientEvent({
                  type: "agent.transfer.initialize",
                  agent_id: latestBotId
                });
              }
            }, 1000);
          }
        });
        
        dc.addEventListener("close", () => {
          // console.debug("[WebRTC] Data channel closed");
          logClientEvent({}, "data_channel.close");
          setSessionStatus("DISCONNECTED");
          
          // Only attempt reconnection if we were previously connected and not already reconnecting
          if (wasConnectedRef.current && !isReconnectingRef.current) {
            // console.debug("[WebRTC] Data channel closed unexpectedly, attempting reconnection");
            attemptReconnection();
          } else {
            // console.debug("[WebRTC] Data channel closed during connection setup, not reconnecting");
            isReconnectingRef.current = false; // Reset guard for clean state
          }
        });
        
        dc.addEventListener("error", (err: any) => {
          console.error("[WebRTC] Data channel error:", err);
          logClientEvent({ error: err }, "data_channel.error");
          isReconnectingRef.current = false; // Reset guard
          
          // Attempt reconnection if there's an error
          attemptReconnection();
        });
        
        // Add additional monitoring for peer connection state changes
        pc.addEventListener("connectionstatechange", () => {
          // console.debug(`[WebRTC] Connection state changed: ${pc.connectionState}`);
          
          // If the connection failed or disconnected, attempt to reconnect only if we were connected
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            console.error(`[WebRTC] Connection state problem: ${pc.connectionState}`);
            if (wasConnectedRef.current && !isReconnectingRef.current) {
              // console.debug("[WebRTC] Attempting reconnection due to connection state issue");
              attemptReconnection();
            } else {
              // console.debug("[WebRTC] Connection failed during setup, not reconnecting");
              isReconnectingRef.current = false; // Reset guard for clean state
            }
          }
        });
        
        // Monitor ICE connection state
        pc.addEventListener("iceconnectionstatechange", () => {
          // console.debug(`[WebRTC] ICE connection state: ${pc.iceConnectionState}`);
          
          // If the ICE connection failed, attempt to reconnect only if we were connected
          if (pc.iceConnectionState === "failed") {
            console.error(`[WebRTC] ICE connection state problem: ${pc.iceConnectionState}`);
            if (wasConnectedRef.current && !isReconnectingRef.current) {
              // console.debug("[WebRTC] Attempting reconnection due to ICE connection state issue");
              attemptReconnection();
            } else {
              // console.debug("[WebRTC] ICE connection failed during setup, not reconnecting");
              isReconnectingRef.current = false; // Reset guard for clean state
            }
          }
        });
        
        dc.addEventListener("message", (e: MessageEvent) => {
          const DEBUG_VOICE = typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_DEBUG_VOICE === 'true';
          // Log the raw message from OpenAI Realtime BEFORE any parsing or processing
          if (DEBUG_VOICE) {
            try {
              const rawText = typeof e.data === 'string' ? e.data : String(e.data);
              const preview = rawText.length > 8000 ? (rawText.slice(0, 8000) + '…') : rawText;
              console.log('[VoiceRealtime][RAW_IN] len=', rawText.length, preview);
            } catch (rawErr) {
              console.warn('[VoiceRealtime][RAW_IN] unable to stringify raw message:', rawErr);
            }
          }

          // Parse and forward to app-level handler
          try {
            const parsedData = JSON.parse(e.data as any);
            if (DEBUG_VOICE) {
              try {
                const keys = Object.keys(parsedData || {});
                console.log('[VoiceRealtime][RAW_JSON_KEYS]', keys);
              } catch {}
            }
            handleServerEvent(parsedData);
          } catch (error) {
            console.error("[WebRTC] Error parsing message data:", error);
          }
        });

        setDataChannel(dc);
      } catch (rtcError) {
        console.error("[WebRTC] Error establishing WebRTC connection:", rtcError);
        
        if (
          rtcError instanceof Error && 
          rtcError.message.includes("Media devices API not available")
        ) {
          mediaDevicesUnavailableRef.current = true;
        }
        
        setSessionStatus("DISCONNECTED");
        isReconnectingRef.current = false; // Reset guard
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      }
    } catch (err) {
      console.error("[WebRTC] Error connecting to realtime:", err);
      setSessionStatus("DISCONNECTED");
      isReconnectingRef.current = false; // Reset guard
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    }
  };

  const disconnectFromRealtime = () => {
    // Clear any pending timeouts
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Get session ID before we disconnect
    const sessionId = pcRef.current ? 
      (pcRef.current as any).sessionId || 'unknown-session' : 
      'unknown-session';
      
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      pcRef.current.close();
      pcRef.current = null;
    }
    setDataChannel(null);
    setSessionStatus("DISCONNECTED");

    logClientEvent({}, "disconnected");
    console.log("[WebRTC] Disconnected from realtime");
    
    // Release cached/preloaded media stream to avoid retaining audio buffers
    try {
      if (preloadCache.mediaStream) {
        preloadCache.mediaStream.getTracks().forEach((t) => t.stop());
      }
    } catch {}
    preloadCache.mediaStream = null;

    // Log session end
    logSessionEnd(sessionId);
  };

  // Monitor connection health with a heartbeat
  useEffect(() => {
    // Only setup heartbeat monitoring if enabled in configuration
    if (!connectionConfig.useHeartbeat) {
      console.log("[WebRTC] Heartbeat monitoring disabled by configuration");
      return;
    }

    let heartbeatInterval: NodeJS.Timeout | null = null;
    
    if (sessionStatus === "CONNECTED" && dcRef.current) {
      console.log("[WebRTC] Starting heartbeat monitoring");
      heartbeatInterval = setInterval(() => {
        if (dcRef.current?.readyState !== "open") {
          console.warn("[WebRTC] Data channel no longer open during heartbeat check");
          attemptReconnection();
        }
      }, 10000); // Check every 10 seconds
    }
    
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        console.log("[WebRTC] Heartbeat monitoring stopped");
      }
    };
  }, [sessionStatus]);
  
  // Audio playback control effect (do not pause on mic activity)
  useEffect(() => {
    if (!audioElementRef.current) return;
    const el = audioElementRef.current;
    if (isAudioPlaybackEnabled && el.paused) {
      el.play().catch((err) => {
        console.warn("[WebRTC] Autoplay may be blocked by browser:", err);
      });
    }
    if (!isAudioPlaybackEnabled && !el.paused) {
      el.pause();
    }
  }, [isAudioPlaybackEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Make sure to clear any timeouts on unmount
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // And close any open connections
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  return {
    sessionStatus,
    setSessionStatus,
    connectToRealtime,
    disconnectFromRealtime,
    dataChannel,
    pcRef,
    dcRef,
    audioElementRef,
    sendClientEvent,
    preloadConnection,
    enableMic,
    disableMic,
  };
} 