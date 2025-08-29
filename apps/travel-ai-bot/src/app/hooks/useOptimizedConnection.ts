import { useRef, useState, useEffect, useCallback } from "react";
import { SessionStatus } from "@/app/types";

// Global connection pool for reuse
const connectionPool = {
  activeConnection: null as RTCPeerConnection | null,
  dataChannel: null as RTCDataChannel | null,
  lastUsed: 0,
  isHealthy: false,
  sessionId: null as string | null
};

// Enhanced preload cache with media stream caching
const enhancedCache = {
  ephemeralKey: null as string | null,
  keyExpiry: 0,
  mediaStream: null as MediaStream | null,
  streamExpiry: 0,
  isPreloading: false,
  audioElement: null as HTMLAudioElement | null
};

interface OptimizedConnectionOptions {
  enableConnectionReuse?: boolean;
  enableMediaStreamCaching?: boolean;
  enableBackgroundPreload?: boolean;
  connectionTimeout?: number;
}

export function useOptimizedConnection(options: OptimizedConnectionOptions = {}) {
  const {
    enableConnectionReuse = true,
    enableMediaStreamCaching = true,
    enableBackgroundPreload = true,
    connectionTimeout = 8000 // Reduced from 10s to 8s
  } = options;

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("DISCONNECTED");
  const [connectionMetrics, setConnectionMetrics] = useState({
    lastConnectionTime: 0,
    cacheHitRate: 0,
    totalConnections: 0,
    cachedConnections: 0
  });

  const performanceRef = useRef({
    startTime: 0,
    milestones: [] as Array<{ name: string; time: number }>
  });

  // Performance logging
  const logMilestone = useCallback((name: string) => {
    const elapsed = Date.now() - performanceRef.current.startTime;
    performanceRef.current.milestones.push({ name, time: elapsed });
    console.log(`[OptimizedConnection] ${name}: ${elapsed}ms`);
  }, []);

  // Enhanced media stream getter with caching
  const getOptimizedMediaStream = useCallback(async (): Promise<MediaStream | null> => {
    if (enableMediaStreamCaching && 
        enhancedCache.mediaStream && 
        enhancedCache.mediaStream.active &&
        enhancedCache.streamExpiry > Date.now()) {
      console.log("[OptimizedConnection] Using cached media stream");
      return enhancedCache.mediaStream;
    }

    try {
      console.log("[OptimizedConnection] Creating optimized media stream");
      
      // Enhanced audio constraints for better performance
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,      // Optimized for OpenAI
          channelCount: 1         // Mono for faster processing
        }
      });

      if (enableMediaStreamCaching) {
        enhancedCache.mediaStream = stream;
        enhancedCache.streamExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
        console.log("[OptimizedConnection] Media stream cached");
      }

      return stream;
    } catch (error) {
      console.error("[OptimizedConnection] Failed to get optimized media stream:", error);
      return null;
    }
  }, [enableMediaStreamCaching]);

  // Connection reuse logic
  const canReuseConnection = useCallback((): boolean => {
    if (!enableConnectionReuse) return false;
    
    return !!(
      connectionPool.activeConnection &&
      connectionPool.dataChannel &&
      connectionPool.isHealthy &&
      connectionPool.dataChannel.readyState === 'open' &&
      Date.now() - connectionPool.lastUsed < 5 * 60 * 1000 // 5 minutes
    );
  }, [enableConnectionReuse]);

  // Fast connection establishment
  const connectOptimized = useCallback(async (): Promise<boolean> => {
    performanceRef.current.startTime = Date.now();
    performanceRef.current.milestones = [];
    
    logMilestone("Connection start");

    try {
      // Check for connection reuse first
      if (canReuseConnection()) {
        logMilestone("Connection reused");
        setSessionStatus("CONNECTED");
        
        // Update metrics
        setConnectionMetrics(prev => ({
          ...prev,
          cachedConnections: prev.cachedConnections + 1,
          totalConnections: prev.totalConnections + 1,
          cacheHitRate: (prev.cachedConnections + 1) / (prev.totalConnections + 1),
          lastConnectionTime: Date.now() - performanceRef.current.startTime
        }));

        return true;
      }

      setSessionStatus("CONNECTING");
      logMilestone("Starting fresh connection");

      // Parallel resource gathering
      const [ephemeralKey, mediaStream] = await Promise.all([
        fetchCachedEphemeralKey(),
        getOptimizedMediaStream()
      ]);

      logMilestone("Resources gathered");

      if (!ephemeralKey || !mediaStream) {
        throw new Error("Failed to gather required resources");
      }

      // Create optimized WebRTC connection
      const connection = await createOptimizedWebRTCConnection(
        ephemeralKey,
        mediaStream,
        connectionTimeout
      );

      logMilestone("WebRTC connection established");

      // Store in connection pool for reuse
      if (enableConnectionReuse) {
        connectionPool.activeConnection = connection.pc;
        connectionPool.dataChannel = connection.dc;
        connectionPool.isHealthy = true;
        connectionPool.lastUsed = Date.now();
        connectionPool.sessionId = connection.sessionId;
      }

      setSessionStatus("CONNECTED");
      logMilestone("Connection complete");

      // Update metrics
      const totalTime = Date.now() - performanceRef.current.startTime;
      setConnectionMetrics(prev => ({
        ...prev,
        totalConnections: prev.totalConnections + 1,
        cacheHitRate: prev.cachedConnections / (prev.totalConnections + 1),
        lastConnectionTime: totalTime
      }));

      console.log(`[OptimizedConnection] Total connection time: ${totalTime}ms`);
      return true;

    } catch (error) {
      console.error("[OptimizedConnection] Connection failed:", error);
      setSessionStatus("DISCONNECTED");
      return false;
    }
  }, [canReuseConnection, getOptimizedMediaStream, connectionTimeout, enableConnectionReuse]);

  // Background preloading
  const backgroundPreload = useCallback(async () => {
    if (!enableBackgroundPreload || enhancedCache.isPreloading) return;

    console.log("[OptimizedConnection] Starting background preload");
    enhancedCache.isPreloading = true;

    try {
      // Use requestIdleCallback if available for better performance
      const preloadTask = async () => {
        await Promise.all([
          fetchCachedEphemeralKey(),
          getOptimizedMediaStream(),
          preloadAudioElement()
        ]);
        console.log("[OptimizedConnection] Background preload completed");
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => preloadTask());
      } else {
        setTimeout(preloadTask, 100);
      }
    } catch (error) {
      console.warn("[OptimizedConnection] Background preload failed:", error);
    } finally {
      enhancedCache.isPreloading = false;
    }
  }, [enableBackgroundPreload, getOptimizedMediaStream]);

  // Auto-preload on mount
  useEffect(() => {
    if (enableBackgroundPreload) {
      const timer = setTimeout(backgroundPreload, 50);
      return () => clearTimeout(timer);
    }
  }, [backgroundPreload, enableBackgroundPreload]);

  // Connection health monitoring
  useEffect(() => {
    if (!enableConnectionReuse) return;

    const healthCheck = setInterval(() => {
      if (connectionPool.dataChannel && 
          connectionPool.dataChannel.readyState !== 'open') {
        console.warn("[OptimizedConnection] Connection pool unhealthy, clearing");
        connectionPool.isHealthy = false;
        connectionPool.activeConnection = null;
        connectionPool.dataChannel = null;
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(healthCheck);
  }, [enableConnectionReuse]);

  return {
    sessionStatus,
    connectOptimized,
    connectionMetrics,
    backgroundPreload,
    canReuseConnection: canReuseConnection(),
    performanceMetrics: performanceRef.current
  };
}

// Helper functions
async function fetchCachedEphemeralKey(): Promise<string | null> {
  if (enhancedCache.ephemeralKey && enhancedCache.keyExpiry > Date.now()) {
    return enhancedCache.ephemeralKey;
  }

  try {
    const response = await fetch("/api/session");
    const data = await response.json();
    
    if (data.client_secret?.value) {
      enhancedCache.ephemeralKey = data.client_secret.value;
      enhancedCache.keyExpiry = Date.now() + 4 * 60 * 1000; // 4 minutes
      return data.client_secret.value;
    }
  } catch (error) {
    console.error("[OptimizedConnection] Failed to fetch ephemeral key:", error);
  }
  
  return null;
}

async function createOptimizedWebRTCConnection(
  ephemeralKey: string,
  mediaStream: MediaStream,
  timeout: number
): Promise<{ pc: RTCPeerConnection; dc: RTCDataChannel; sessionId: string }> {
  // Simplified WebRTC connection creation with optimizations
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    iceCandidatePoolSize: 5 // Reduced for faster setup
  });

  // Add media track
  mediaStream.getTracks().forEach(track => pc.addTrack(track, mediaStream));

  // Create data channel with optimized settings
  const dc = pc.createDataChannel("oai-events", {
    ordered: true,
    maxRetransmits: 2 // Reduced for faster setup
  });

  // Create and set local description
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Send to OpenAI with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
      {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const answerSdp = await response.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    return {
      pc,
      dc,
      sessionId: ephemeralKey.substring(0, 8)
    };
  } catch (error) {
    clearTimeout(timeoutId);
    pc.close();
    throw error;
  }
}

async function preloadAudioElement(): Promise<void> {
  if (enhancedCache.audioElement) return;

  enhancedCache.audioElement = document.createElement("audio");
  enhancedCache.audioElement.autoplay = true;
  enhancedCache.audioElement.volume = 1.0;
  
  console.log("[OptimizedConnection] Audio element preloaded");
} 