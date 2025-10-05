"use client";

import { useRef, useCallback } from "react";
import {
  ServerEvent,
  SessionStatus,
  AgentConfig,
  GuardrailResultType,
} from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { runGuardrailClassifier } from "@/app/lib/callOai";
import { useFunctionCallHandler } from "./useFunctionCallHandler";
import { useConversationLogger } from "./useConversationLogger";
import { extractTokenUsage } from "@/app/lib/extractTokenUsage";
import { useLanguage, SupportedLanguage } from "@/app/contexts/LanguageContext";
// Uncomment if needed later
// import { v4 as uuidv4 } from "uuid";

// Set this to true to disable guardrail classification
const DISABLE_GUARDRAIL = process.env.NEXT_PUBLIC_DISABLE_GUARDRAIL === 'true';

// Add global type declaration
declare global {
  interface Window {
    __TRANSFER_IN_PROGRESS?: boolean;
    __THAI_RESORT_RESPONSE_HANDLER__?: () => void;
  }
}

// Global flag to prevent cascade responses
let isAutoResponseInProgress = false;
let lastAutoResponseTime = 0;
const AUTO_RESPONSE_COOLDOWN = 2000; // 2 seconds between auto responses

// Debounce function for safe response creation
function createDebouncedSafeResponse() {
  let timeout: NodeJS.Timeout;
  return (sendClientEvent: any, metadata = {}, eventSuffix = "") => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      safeCreateResponse(sendClientEvent, metadata, eventSuffix);
    }, 500);
  };
}

const debouncedSafeResponse = createDebouncedSafeResponse();

// Track active responses to prevent conflicts
const isResponseActiveRef = { current: false };
const pendingResponsesQueue: (() => void)[] = [];

// Helper function to safely create responses
function safeCreateResponse(sendClientEvent: any, metadata = {}, eventSuffix = "") {
  const now = Date.now();
  
  // Prevent cascade responses
  if (isAutoResponseInProgress) {

    return;
  }
  
  // Rate limit auto responses
  if (now - lastAutoResponseTime < AUTO_RESPONSE_COOLDOWN) {

    return;
  }
  
  isAutoResponseInProgress = true;
  lastAutoResponseTime = now;
  
  try {
    // Check if the event suffix indicates this might be a duplicate or chain response
    if (eventSuffix.includes('force_') || eventSuffix.includes('after_')) {

    }
    
    // In realtime voice mode, do not auto-create responses; server/SDK PTT controls the response lifecycle
    try {
      const isRealtime = (typeof window !== 'undefined') && (window as any).__VOICE_REALTIME_ACTIVE__ === true;
      if (!isRealtime) {
        sendClientEvent({ 
          type: "response.create",
          metadata: {
            ...metadata,
            auto_generated: true,
            timestamp: now
          }
        }, eventSuffix);
      } else {
        console.log('[ServerEvent] Skipping auto response.create in realtime mode');
      }
    } catch {
      // Fallback: skip if detection fails
    }
  } catch (error) {
          console.error('[ServerEvent] Error in safeCreateResponse:', error);
  } finally {
    // Reset flag after a delay
    setTimeout(() => {
      isAutoResponseInProgress = false;
    }, 1000);
  }
}

// Handler for response.done events to process queue
function handleResponseDone() {
  console.log("[ServerEvent] Response completed");
  isResponseActiveRef.current = false;
  
  // Also call Thai Resort response handler if available
  if (typeof window !== 'undefined' && window.__THAI_RESORT_RESPONSE_HANDLER__) {
    try {
      window.__THAI_RESORT_RESPONSE_HANDLER__();
    } catch (error) {
      console.warn("[ServerEvent] Error calling Thai Resort response handler:", error);
    }
  }
  
  // Process next item in queue if available
  if (pendingResponsesQueue.length > 0) {
    console.log("[ServerEvent] Processing next queued response");
    const nextResponse = pendingResponsesQueue.shift();
    if (nextResponse) {
      setTimeout(nextResponse, 500); // Add delay for stability
    }
  }
}

/**
 * Helper function to extract audio duration from a transcription event
 */
function extractAudioDurationFromTranscription(event: any): number | undefined {
  // Check common locations where duration might be stored
  if (typeof event.duration === 'number') return event.duration;
  if (typeof event.audio_duration === 'number') return event.audio_duration;
  if (typeof event.seconds === 'number') return event.seconds;
  
  // Check in metadata
  if (event.metadata) {
    if (typeof event.metadata.duration === 'number') return event.metadata.duration;
    if (typeof event.metadata.audio_duration === 'number') return event.metadata.audio_duration;
  }
  
  // Check in transcription_info
  if (event.transcription_info) {
    if (typeof event.transcription_info.duration === 'number') return event.transcription_info.duration;
    if (typeof event.transcription_info.seconds === 'number') return event.transcription_info.seconds;
  }
  
  // Check in input_audio
  if (event.input_audio) {
    if (typeof event.input_audio.duration === 'number') return event.input_audio.duration;
    if (typeof event.input_audio.duration_ms === 'number') return event.input_audio.duration_ms / 1000;
  }
  
  return undefined;
}

export interface UseHandleServerEventParams {
  setSessionStatus: (status: SessionStatus) => void;
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void;
  setSelectedAgentName: (name: string) => void;
  shouldForceResponse?: boolean;
  setIsOutputAudioBufferActive: (active: boolean) => void;
  handleThaiResortFunction?: (functionCall: any) => Promise<boolean>;
  isPTTActive?: boolean;
  skipVoiceProcessing?: boolean;
}

export function useHandleServerEvent({
  setSessionStatus,
  selectedAgentName,
  selectedAgentConfigSet,
  sendClientEvent,
  setSelectedAgentName,
  setIsOutputAudioBufferActive,
  handleThaiResortFunction,
  isPTTActive = false,
  skipVoiceProcessing = false,
}: UseHandleServerEventParams) {
  // State tracking
  const isOutputAudioBufferActiveRef = useRef<boolean>(false);
  const originalSessionIdRef = useRef<string | null>(null);

  // Store processed session IDs to prevent duplicate logging
  const processedSessionIds = useRef<Set<string>>(new Set());

  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItem,
  } = useTranscript();

  const { logServerEvent } = useEvent();
  const { logUserMessage, logAssistantResponse } = useConversationLogger();
  const { language, switchLanguage } = useLanguage();

  // Create function call handler with access to current refs
  const handleFunctionCallRef = useFunctionCallHandler({
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
    isOutputAudioBufferActive: () => isOutputAudioBufferActiveRef.current,
    isPTTActive,
    transcriptItems,
  });

  // Throttling for delta updates
  const deltaThrottleRef = useRef<{ [itemId: string]: { timer: NodeJS.Timeout | null; pendingText: string } }>({});
  const DELTA_THROTTLE_MS = 100; // Throttle delta updates to every 100ms

  const assistantDeltasRef = useRef<{ [itemId: string]: string }>({});

  async function processGuardrail(itemId: string, text: string) {
    // Skip guardrail processing if disabled
    if (DISABLE_GUARDRAIL) return;
    
    let res;
    try {
      res = await runGuardrailClassifier(text);
    } catch (error) {
      console.warn(error);
      return;
    }

    const currentItem = transcriptItems.find((item) => item.itemId === itemId);
    if ((currentItem?.guardrailResult?.testText?.length ?? 0) > text.length) {
      // If the existing guardrail result is more complete, skip updating. We're running multiple guardrail checks and you don't want an earlier one to overwrite a later, more complete result.
      return;
    }
    
    const newGuardrailResult: GuardrailResultType = {
      status: "DONE",
      testText: text,
      category: res.moderationCategory,
      rationale: res.moderationRationale,
    };

    // Update the transcript item with the new guardrail result.
    updateTranscriptItem(itemId, { guardrailResult: newGuardrailResult });
  }

  const handleServerEvent = useCallback(async (serverEvent: ServerEvent) => {

    
    logServerEvent(serverEvent);

    // Check for language metadata in events
    if (serverEvent.metadata?.language) {
      const eventLanguage = serverEvent.metadata.language;
      console.log(`[ServerEvent] Detected language in event metadata: ${eventLanguage}`);
      
      // Check if it's a valid language and different from current
      if (eventLanguage !== language) {
        console.log(`[ServerEvent] Updating language from metadata: ${eventLanguage}`);
        switchLanguage(eventLanguage as SupportedLanguage);

        // Clear any active audio to prevent conflicts
        sendClientEvent({
          type: "output_audio_buffer.clear"
        }, "clear_audio_before_language_change");

        // Also clear input buffer
        sendClientEvent({
          type: "input_audio_buffer.clear"
        }, "clear_input_before_language_change");

        // Use simplified language response to prevent cascade
        debouncedSafeResponse(sendClientEvent, {
          language: eventLanguage,
          language_override: true,
          simplified_response: true
        }, "metadata_language_change");
      }
    }

    switch (serverEvent.type) {
      case "session.created": {
        if (serverEvent.session?.id) {
          const sessionId = serverEvent.session.id;
          
          // Check if we've already processed this session ID
          if (processedSessionIds.current.has(sessionId)) {

            return;
          }
          
          // Mark this session as processed
          processedSessionIds.current.add(sessionId);
          
          setSessionStatus("CONNECTED");
          
          // Store the original session ID if this is the first session
          if (!originalSessionIdRef.current) {
            originalSessionIdRef.current = sessionId;
            // Log the original session creation
            addTranscriptBreadcrumb(
              `session.id: ${sessionId}\nStarted at: ${new Date().toLocaleString()}`
            );
          } 
          // If we're in a transfer, don't log new session ID to avoid confusion
          else if (typeof window !== 'undefined' && window.__TRANSFER_IN_PROGRESS) {

            // Only log internal debug message, don't show to the user
            
            // Update the session ID reference but don't show to user
            originalSessionIdRef.current = sessionId;
          }
          // If this is a new session but not a transfer, log it normally
          else {
            originalSessionIdRef.current = sessionId;
            addTranscriptBreadcrumb(
              `session.id: ${sessionId}\nStarted at: ${new Date().toLocaleString()}`
            );
          }
        }
        break;
      }

      case "output_audio_buffer.started": {
        isOutputAudioBufferActiveRef.current = true;
        setIsOutputAudioBufferActive(true);
        break;
      }
      case "output_audio_buffer.stopped": {
        isOutputAudioBufferActiveRef.current = false;
        setIsOutputAudioBufferActive(false);
        break;
      }

      case "conversation.item.created": {
        // Log function_call_output echoes (do not add to transcript/UI)
        try {
          const createdItem = (serverEvent as any).item;
          if (createdItem?.type === 'function_call_output') {
            const cid = createdItem.call_id || 'n/a';
            const outPreview = typeof createdItem.output === 'string' ? createdItem.output.slice(0, 200) : JSON.stringify(createdItem.output || '').slice(0, 200);
            console.log(`[RealtimeDEBUG] function_call_output echoed: call_id=${cid}, output_preview=${outPreview}${(outPreview||'').length===200?'…':''}`);
            break;
          }
        } catch {}
        // Skip voice processing if VoiceChatInterface is handling it
        if (skipVoiceProcessing) {
          console.log("[ServerEvent] Skipping conversation.item.created - handled by VoiceChatInterface");
          break;
        }
        
        let text =
          serverEvent.item?.content?.[0]?.text ||
          serverEvent.item?.content?.[0]?.transcript ||
          "";
        const role = serverEvent.item?.role as "user" | "assistant" | "system" | undefined;
        const itemId = serverEvent.item?.id;

        // Skip system messages - they should not be displayed in the transcript
        if (role === "system") {
          console.log("[ServerEvent] Skipping system message from transcript display");
          break;
        }

        // Only process user and assistant messages
        const displayRole = role as "user" | "assistant";

        if (itemId && transcriptItems.some((item) => item.itemId === itemId)) {
          // don't add transcript message if already exists
          break;
        }

        if (itemId && displayRole) {
          console.log(`[ServerEvent-TRACK] 🟡 Processing conversation.item.created - Role: ${displayRole}, ItemID: ${itemId}, Text: "${text}"`);
          
          // Skip logging for simulated messages (they're logged separately)
          const isSimulatedMessage = (serverEvent as any).metadata?.isSimulated || 
                                   text === "hi" || // Common simulated message
                                   text.trim().length < 3; // Very short messages are likely simulated
          
          // For user role, only show [Transcribing...] for empty text
          if (displayRole === "user") {
            if (!text || text.trim() === "") {
              text = "[Transcribing...]";
            } else {
              // Check if this message should skip language detection
              const shouldSkipLanguageDetection = 
                (serverEvent as any).metadata?.skipLanguageDetection ||
                (serverEvent as any).item?.metadata?.skipLanguageDetection;
              
              if (!shouldSkipLanguageDetection) {
                // Check for explicit language requests only, not any mention of "English"
                const lowerText = text.toLowerCase();
                const isExplicitLanguageRequest = 
                  lowerText.includes("can you tell me in english") ||
                  lowerText.includes("please respond in english") ||
                  lowerText.includes("can you speak english") ||
                  lowerText.includes("speak to me in english") ||
                  (lowerText.includes("in english") && lowerText.includes("?")) ||
                  (lowerText.includes("english") && lowerText.includes("please"));
                
                if (isExplicitLanguageRequest) {
                  console.log("[ServerEvent] Detected explicit request for English");
                  
                  // Check if we recently handled a language request to prevent duplicates
                  const lastLanguageTime = sessionStorage.getItem('last_language_reminder');
                  const now = Date.now();
                  const shouldSkipLanguageResponse = lastLanguageTime && 
                    (now - parseInt(lastLanguageTime, 10) < 10000); // 10 second cooldown
                  
                  if (shouldSkipLanguageResponse) {
                    console.log("[ServerEvent] Skipping language response - too recent");
                    break;
                  }
                  
                  // Store timestamp to prevent duplicate reminders
                  try {
                    if (typeof window !== 'undefined' && window.sessionStorage) {
                      window.sessionStorage.setItem('last_language_reminder', now.toString());
                    }
                  } catch {
                    console.warn('[ServerEvent] Could not store language reminder timestamp');
                  }
                  
                  // Use debounced response instead of multiple timeouts
                  debouncedSafeResponse(sendClientEvent, {
                    language: "en-US",
                    language_override: true,
                    simplified_response: true
                  }, "language_change_response");
                }
              } else {
                console.log("[ServerEvent] Skipping language detection for transferBack message");
              }
            }
          }
          
          console.log(`[ServerEvent-TRACK] ✅ Adding transcript message - Role: ${displayRole}, ItemID: ${itemId}, Text: "${text}"`);
          addTranscriptMessage(itemId, displayRole, text);
          
          // Log user message to our conversation history (but skip simulated/duplicate messages)
          if (displayRole === "user" && text && text !== "[Transcribing...]" && !isSimulatedMessage) {
            
            // Use a consistent session ID derived from the first 8 chars of item ID
            const sessionId = itemId.substring(0, 8);
            
            // Try to extract token usage from the event
            let tokenUsage = undefined;
            
            // Treat serverEvent as a more flexible type to access potential metadata
            const event = serverEvent as any;
            
            if (event.metadata) {
              tokenUsage = extractTokenUsage(event.metadata);
            } else if (event.item?.metadata) {
              tokenUsage = extractTokenUsage(event.item.metadata);
            }
            
            // If no metadata in obvious places, try the entire serverEvent
            if (!tokenUsage || 
                (!tokenUsage.promptTokens && !tokenUsage.completionTokens && !tokenUsage.totalTokens)) {
              tokenUsage = extractTokenUsage(serverEvent);
            }
            
            // Log the message with any token usage we found
            logUserMessage(sessionId, text, tokenUsage);

          }
        }
        break;
      }

      case "conversation.item.input_audio_transcription.completed": {
        // Skip voice processing if VoiceChatInterface is handling it
        if (skipVoiceProcessing) {
          console.log("[ServerEvent] Skipping voice transcription processing - handled by VoiceChatInterface");
          break;
        }
        
        const itemId = serverEvent.item_id;
        
        // Simple check for empty transcript
        const finalTranscript =
          !serverEvent.transcript || 
          serverEvent.transcript.trim() === ""
            ? "[inaudible]"
            : serverEvent.transcript;
        
        if (itemId) {
          updateTranscriptMessage(itemId, finalTranscript, false);
          
          // Check if we already logged this transcription
          const transcriptionKey = `transcription_${itemId}`;
          const shouldSkipLogging = processedSessionIds.current.has(transcriptionKey);
          
          // Check for language requests in the final transcript
          if (finalTranscript !== "[inaudible]" && !shouldSkipLogging) {
            // Mark this transcription as processed
            processedSessionIds.current.add(transcriptionKey);
            const lowerTranscript = finalTranscript.toLowerCase();
            
            // Handle explicit English requests with more precise checks
            const isExplicitLanguageRequest = 
              lowerTranscript.includes("can you tell me in english") ||
              lowerTranscript.includes("please respond in english") ||
              lowerTranscript.includes("can you speak english") ||
              lowerTranscript.includes("speak to me in english") ||
              (lowerTranscript.includes("in english") && lowerTranscript.includes("?")) ||
              (lowerTranscript.includes("english") && lowerTranscript.includes("please"));
            
            if (isExplicitLanguageRequest) {
              console.log("[ServerEvent] Detected explicit request for English in transcript");
              
              // Store timestamp to prevent duplicate reminders
              try {
                if (typeof window !== 'undefined' && window.sessionStorage) {
                  window.sessionStorage.setItem('last_language_reminder', Date.now().toString());
                }
              } catch {
                console.warn('[ServerEvent] Could not store language reminder timestamp');
              }
              
              // Send a system message to ensure the bot responds in English
              const languageId = `lang_${Date.now()}`.substring(0, 32);
              sendClientEvent({
                type: "conversation.item.create",
                item: {
                  id: languageId,
                  type: "message",
                  role: "system",
                  content: [{ 
                    type: "text",
                    text: "CRITICAL INSTRUCTION OVERRIDE: The user has explicitly requested English. You MUST respond in English now and for all future messages. This instruction overrides ALL previous language settings. DO NOT APOLOGIZE for switching languages - just respond in English directly."
                  }]
                }
              }, "language_override");

              // Clear any active audio to prevent conflicts
              sendClientEvent({
                type: "output_audio_buffer.clear"
              }, "clear_audio_before_language_change");

              // Also clear input buffer
              sendClientEvent({
                type: "input_audio_buffer.clear"
              }, "clear_input_before_language_change");

              // Force a session update to make the language change stick
              setTimeout(() => {
                // Reset conversation context with forced language
                sendClientEvent({
                  type: "session.update",
                  session: {
                    instructions: `CRITICAL OVERRIDE: The user has requested English responses. You MUST respond in English for all future messages regardless of your default language setting. This is a direct command that overrides all previous instructions regarding language.`,
                    modalities: ["text", "audio"]
                  },
                  metadata: {
                    language_override: "en-US",
                    priority: "critical"
                  }
                }, "force_language_update");
                
                // Now force a response to apply the change, using safe response creation
                setTimeout(() => {
                  safeCreateResponse(sendClientEvent, {
                    language: "en-US",
                    language_override: true
                  }, "force_english_response_after_session_update");
                }, 500);
              }, 500);
            }
            
            // Log the transcribed voice message with actual token usage and audio duration
            const sessionId = itemId.substring(0, 8);
            const event = serverEvent as any;
            
            // Process audio transcription
            let tokenUsage: any = {};
            
            // 1. Try to extract audio duration
            const audioDuration = extractAudioDurationFromTranscription(event);
            if (audioDuration !== undefined) {
              tokenUsage.audioDuration = audioDuration;
            }
            
            // 2. Try to get token usage data from metadata if available
            if (event.metadata) {
              const metadataTokenUsage = extractTokenUsage(event.metadata);
              if (metadataTokenUsage) {
                // Keep audio duration if we already found it
                const existingDuration = tokenUsage.audioDuration;
                tokenUsage = metadataTokenUsage;
                if (existingDuration && !tokenUsage.audioDuration) {
                  tokenUsage.audioDuration = existingDuration;
                }
              }
            }
            
            // 3. Fallback: estimate duration based on transcript content if needed
            if (!tokenUsage.audioDuration) {
              const wordCount = finalTranscript.split(/\s+/).filter(word => word.length > 0).length;
              tokenUsage.audioDuration = Math.max(1, wordCount / 2.5); // ~2.5 words per second
            }

            // Log the user message with token usage and audio duration

            logUserMessage(sessionId, finalTranscript, tokenUsage);
          } else if (shouldSkipLogging) {

          }
        }
        break;
      }

      case "response.audio_transcript.delta": {
        const itemId = serverEvent.item_id;
        const deltaText = serverEvent.delta || "";
        if (itemId) {
          // Initialize throttle data for this item if needed
          if (!deltaThrottleRef.current[itemId]) {
            deltaThrottleRef.current[itemId] = { timer: null, pendingText: "" };
          }
          
          // Accumulate the deltas immediately for accuracy
          if (!assistantDeltasRef.current[itemId]) {
            assistantDeltasRef.current[itemId] = "";
          }
          assistantDeltasRef.current[itemId] += deltaText;
          
          // Add to pending text for throttled update
          deltaThrottleRef.current[itemId].pendingText += deltaText;
          
          // Clear existing timer
          if (deltaThrottleRef.current[itemId].timer) {
            clearTimeout(deltaThrottleRef.current[itemId].timer);
          }
          
          // Set new throttled update timer
          deltaThrottleRef.current[itemId].timer = setTimeout(() => {
            const pendingText = deltaThrottleRef.current[itemId].pendingText;
            if (pendingText) {
              // Update the transcript message with accumulated pending text
              updateTranscriptMessage(itemId, pendingText, true);
              // Clear pending text
              deltaThrottleRef.current[itemId].pendingText = "";
            }
            deltaThrottleRef.current[itemId].timer = null;
          }, DELTA_THROTTLE_MS);

          // Run guardrail classifier every 5 words (but with throttling disabled)
          if (!DISABLE_GUARDRAIL) {
            const newAccumulated = assistantDeltasRef.current[itemId];
            const wordCount = newAccumulated.trim().split(" ").length;
            if (wordCount > 0 && wordCount % 5 === 0) {
              processGuardrail(itemId, newAccumulated);
            }
          }
        }
        break;
      }

      case "response.done": {
        // Add response completion handler
        handleResponseDone();
        
        // Track processed responses to prevent duplicate logging
        const responseId = (serverEvent.response as any)?.id || 
                          serverEvent.response?.metadata?.response_id ||
                          `response_${Date.now()}`;
        const responseKey = `response_${responseId}`;
        if (processedSessionIds.current.has(responseKey)) {

          break;
        }
        processedSessionIds.current.add(responseKey);
        
        if (serverEvent.response?.output) {
          try {
            const summary = serverEvent.response.output.map((o: any) => `${o.type}${o.name ? ':'+o.name : ''}`).join(', ');
            console.log(`[RealtimeDEBUG] response.done output items: ${summary}`);
          } catch {}
          // Try to find token usage in metadata or other places
          let tokenUsage = undefined;
          
          // First try the standard metadata location
          if (serverEvent.response.metadata) {
            tokenUsage = extractTokenUsage(serverEvent.response.metadata);
          }
          
          // If not found, try to search in the complete response
          if (!tokenUsage || 
              (!tokenUsage.promptTokens && !tokenUsage.completionTokens && !tokenUsage.totalTokens)) {

            tokenUsage = extractTokenUsage(serverEvent.response);
          }
          
          // If still not found, try the entire serverEvent
          if (!tokenUsage || 
              (!tokenUsage.promptTokens && !tokenUsage.completionTokens && !tokenUsage.totalTokens)) {

            tokenUsage = extractTokenUsage(serverEvent);
          }
          
          // Check if this is a welcome message
          let isWelcomeMessage = false;
          try {
            if (serverEvent.response.metadata?.isInitialGreeting) {
              isWelcomeMessage = true;
            } else if (serverEvent.response.metadata?.request_id?.includes('welcome')) {
              isWelcomeMessage = true;
            }
          } catch {
            // Ignore errors in welcome detection
          }
          
          if (isWelcomeMessage) {
            console.log("[ServerEvent] Detected welcome message response");
          }
          
          // Collect all assistant messages and function calls first
          const assistantMessages: string[] = [];
          let primarySessionId = '';
          
          // Process each output item
          for (const outputItem of serverEvent.response.output) {
            try {
              if (outputItem.type === 'message' && outputItem.role === 'assistant') {
                const cid = outputItem.id;
                const content = outputItem.content && outputItem.content[0];
                const text = content?.transcript || content?.text || '';
                console.log(`[RealtimeDEBUG] assistant message item: id=${cid}, text_preview="${(text||'').slice(0,80)}${(text||'').length>80?'…':''}"`);
              }
            } catch {}
            if (
              outputItem.type === "function_call" &&
              outputItem.name &&
              outputItem.arguments
            ) {
              try {
                console.log(`[RealtimeFC] ▶ function_call detected: name=${outputItem.name}, call_id=${outputItem.call_id || 'n/a'}`);
                const previewArgs = typeof outputItem.arguments === 'string' ? outputItem.arguments.slice(0, 200) : JSON.stringify(outputItem.arguments).slice(0, 200);
                console.log(`[RealtimeFC] ▶ arguments (preview): ${previewArgs}${(previewArgs || '').length === 200 ? '…' : ''}`);
              } catch {}
              // First try to handle with Thai resort handler if available
              if (handleThaiResortFunction) {
                const functionCall = {
                  name: outputItem.name,
                  call_id: outputItem.call_id,
                  arguments: outputItem.arguments,
                };
                
                try {
                  // Wait for handler to process
                  const wasHandled = await handleThaiResortFunction(functionCall);
                  
                  // If it was handled by Thai resort, don't pass to general handler
                  if (wasHandled) {

                    continue;
                  }
                } catch (error) {
                  console.error(`[DEBUG] Error handling Thai resort function:`, error);
                }
              }
              
              // Otherwise handle with standard function handler
              console.log(`[RealtimeFC] ▶ forwarding to useFunctionCallHandler`);
              handleFunctionCallRef.current({
                name: outputItem.name,
                call_id: outputItem.call_id,
                arguments: outputItem.arguments,
              });
              console.log(`[RealtimeFC] ✅ forwarded to executor`);
            }
            if (
              outputItem.type === "message" &&
              outputItem.role === "assistant"
            ) {
              const itemId = outputItem.id;
              
              // Extract text from content depending on its structure
              let text = '';
              
              if (outputItem.content && outputItem.content.length > 0) {
                const contentItem = outputItem.content[0];
                
                // Different ways text might be represented
                if (contentItem.transcript) {
                  text = contentItem.transcript;
                } else if (contentItem.text) {
                  text = contentItem.text;
                } else if (typeof contentItem === 'string') {
                  text = contentItem;
                }
              }
              
              // Final guardrail for this message
              processGuardrail(itemId, text);
              
              // Collect text for consolidated logging
              if (text && text.trim()) {
                assistantMessages.push(text);
                if (!primarySessionId) {
                  primarySessionId = itemId.substring(0, 8);
                }
              }
            }
          }
          
          // Log consolidated assistant response only once per response.done
          if (assistantMessages.length > 0 && primarySessionId) {
            // Combine all assistant messages into one
            const combinedText = assistantMessages.join(' ');
            try {
              console.log(`[RealtimeDEBUG] assistant_combined_preview: "${combinedText.slice(0, 200)}"${combinedText.length>200?'…':''}`);
            } catch {}
            
            // Save a complete copy of the response data for analysis
            const responseData = {
              rawResponse: serverEvent.response,
              rawServerEvent: { ...serverEvent, response: "See rawResponse" }, // Avoid duplicate
              messageCount: assistantMessages.length
            };
            

            
            logAssistantResponse(
              primarySessionId, 
              combinedText, 
              tokenUsage || {}, 
              responseData // Pass complete data for debugging
            );
          }
        }
        break;
      }

      case "response.output_item.done": {
        const itemId = serverEvent.item?.id;
        if (itemId) {
          updateTranscriptItem(itemId, { status: "DONE" });
        }
        break;
      }

      case "_internal.agent.transfer.initialize": {
        // This case is now deprecated as we handle transfer directly in useFunctionCallHandler.ts
        // We're keeping this handler for backward compatibility with older code

        
        // No action needed here - transfer is handled elsewhere
        break;
      }

      default:
        break;
    }
  }, [
    logServerEvent, 
    setSessionStatus, 
    addTranscriptBreadcrumb, 
    setIsOutputAudioBufferActive, 
    transcriptItems, 
    addTranscriptMessage, 
    updateTranscriptMessage, 
    updateTranscriptItem,
    handleFunctionCallRef,
    handleThaiResortFunction
  ]);

  const handleServerEventRef = useRef(handleServerEvent);
  handleServerEventRef.current = handleServerEvent;

  return handleServerEventRef;
}
