"use client";

/**
 * This file re-exports the useSessionOperations hook from SessionOperations.ts
 * to maintain the React hook naming convention while preserving the
 * separation of concerns in the new architecture.
 */

import { useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { AgentConfig } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useConversationLogger } from "./useConversationLogger";
import { useSessionRegistry } from "./useSessionRegistry";
import { useLanguage } from "@/app/contexts/LanguageContext";

// Define a default model to use when none is specified
const DEFAULT_MODEL = "gpt-4o";

interface UseSessionOperationsProps {
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  isPTTActive: boolean;
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void;
  updateSession?: (shouldTriggerResponse?: boolean) => void; // Optional external updateSession for backward compatibility
}

// Return types for backward compatibility with useSessionManager
interface UseSessionManagerReturn {
  updateSession: (shouldTriggerResponse?: boolean) => void;
  sendSimulatedUserMessage: (text: string) => void;
  cancelAssistantSpeech: (isOutputAudioBufferActive: boolean) => void;
}

// Full operations return type with advanced functions
interface UseSessionOperationsReturn extends UseSessionManagerReturn {
  updateSessionWithContext: (
    agentName: string, 
    systemPrompt: string, 
    tools: any[],
    conversationContext?: string,
    shouldTriggerResponse?: boolean,
    turnDetection?: any
  ) => void;
  transferToBotWithContext: (
    sourceBotName: string,
    destinationBotName: string,
    transferRationale: string,
    conversationContext: string,
    destinationConfig: AgentConfig,
    isPTTActive?: boolean
  ) => {
    success: boolean;
    destinationBotName: string;
    timestamp: string;
  };
  sendLanguageFlexibilityReminder: () => void;
}

/**
 * Core session operations hook that provides functionality for updating sessions,
 * transferring between bots, and managing WebRTC connections.
 * 
 * This replaces both useSessionManager and the former useEnhancedSessionManager.
 */
export function useSessionOperations({
  selectedAgentName,
  selectedAgentConfigSet,
  isPTTActive,
  sendClientEvent,
  updateSession: externalUpdateSession,
}: UseSessionOperationsProps): UseSessionOperationsReturn {
  const { addTranscriptMessage } = useTranscript();
  const { logUserMessage } = useConversationLogger();
  
  // Get the session registry functions
  const { activateBot, getActiveBotInfo } = useSessionRegistry();
  
  // Get the current language setting
  const { language } = useLanguage();
  
  // Track if a response is currently active to prevent multiple response.create events
  const isResponseActiveRef = useRef<boolean>(false);
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep track of last update to prevent multiple identical updates
  const lastUpdateRef = useRef<{
    agent: string | null;
    isPTTActive: boolean | null;
    timestamp: number;
  }>({
    agent: null,
    isPTTActive: null,
    timestamp: 0
  });

  // Use ref to break circular dependency
  const sendMessageRef = useRef<((text: string) => void) | undefined>(undefined);

  // Rate limiting for session responses
  const lastSessionResponseTime = useRef<number>(0);
  const SESSION_RESPONSE_COOLDOWN = 1500; // 1.5 seconds between session responses

  // Safe wrapper for sending response.create events
  const safeCreateResponse = useCallback((eventNameSuffix = "") => {
    const now = Date.now();
    
    // Rate limit session responses
    if (now - lastSessionResponseTime.current < SESSION_RESPONSE_COOLDOWN) {
      console.log(`[SessionOperations] Skipping response - cooldown active (${now - lastSessionResponseTime.current}ms ago)`);
      return false;
    }
    
    // If a response is already active, log warning and don't send another
    if (isResponseActiveRef.current) {
      console.warn("[SessionOperations] Prevented duplicate response.create - one is already active");
      return false;
    }
    
    // Set the response as active
    isResponseActiveRef.current = true;
    lastSessionResponseTime.current = now;
    
    // Clear any existing timeout
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
    }
    
    // Set a safety timeout to reset the active flag after 30 seconds
    // This prevents getting permanently stuck in a "response active" state
    responseTimeoutRef.current = setTimeout(() => {
      console.log("[SessionOperations] Response timeout reached, resetting active flag");
      isResponseActiveRef.current = false;
      responseTimeoutRef.current = null;
    }, 30000);
    
    // Send the response.create event
    sendClientEvent({ 
      type: "response.create",
      metadata: {
        session_generated: true,
        timestamp: now
      }
    }, eventNameSuffix);
    
    return true;
  }, [sendClientEvent]);
  
  // Setup listener for response completion
  useEffect(() => {
    // This would ideally be hooked up to the actual response.done event
    // For now we'll rely on the timeout as a safety mechanism
    // Function is defined here for future implementation but not used yet
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleResponseDone = () => {
      isResponseActiveRef.current = false;
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
        responseTimeoutRef.current = null;
      }
    };
    
    // In a real implementation, we would set up an event listener here
    // For example:
    // const handleResponseDoneEvent = (event) => handleResponseDone();
    // window.addEventListener("response.done", handleResponseDoneEvent);
    // return () => window.removeEventListener("response.done", handleResponseDoneEvent);
    
    // For now, return empty cleanup function
    return () => {};
  }, []);

  // Update session with context preservation
  const updateSessionWithContext = useCallback((
    agentName: string, 
    systemPrompt: string, 
    tools: any[],
    conversationContext: string = '',
    shouldTriggerResponse: boolean = false,
    turnDetection: any = null
  ) => {
    // Activate this bot in our registry
    activateBot(agentName, conversationContext);
    
    // Create enhanced system prompt with conversation context and language instructions
    let enhancedSystemPrompt = systemPrompt;
    
    // Add language instructions based on selected language
    if (language) {
      const languageInstructions = `
CRITICAL LANGUAGE INSTRUCTIONS - FOLLOW EXACTLY:

You must respond primarily in the language set by \`${language}\` for general conversation.

However, these specific rules OVERRIDE your default language when applicable:

1. When a user EXPLICITLY asks for a specific language (e.g., "Please speak English", "Can you answer in English?"), you MUST IMMEDIATELY switch to that language for ALL future responses until instructed otherwise.

2. Phrases like "in English", "speak English", "tell me in English" are DIRECT COMMANDS to switch to English.

3. If you see ANY request containing the word "English" that appears to ask for language switching, RESPOND IN ENGLISH.

4. If the user messages in a different language from your default setting, respond in THEIR language.

5. If the user returns to the original language setting, continue in that language again.

EXAMPLES OF LANGUAGE REQUESTS YOU MUST HONOR:
- "Please answer in English"
- "Can you speak English?"
- "In English please"
- "I want you to speak English"
- "Tell me in English"

Language reference:
- "th-TH": respond in Thai (ตอบเป็นภาษาไทยหลัก)
- "en-US": respond in English
- "ja-JP": respond in Japanese (日本語で回答)
- "zh-CN": respond in Chinese (使用中文回答)

CURRENT LANGUAGE SETTING: \`${language}\`
`;

      // Try to get the agent system prompt from the config
      let botSystemPrompt = "";
      try {
        if (selectedAgentConfigSet) {
          const agentConfig = selectedAgentConfigSet.find(config => config.name === agentName);
          if (agentConfig) {
            // Access properties safely with optional chaining
            const systemPromptProp = (agentConfig as any).systemPrompt;
            if (typeof systemPromptProp === 'string') {
              botSystemPrompt = systemPromptProp;
            }
          }
        }
      } catch (e) {
        console.warn('[SessionOperations] Could not get system prompt from config', e);
      }

      // Combine all instructions with proper priority
      enhancedSystemPrompt = `${languageInstructions}\n\n${systemPrompt}\n\n${botSystemPrompt}`;
    }
    
    // Add conversation context if available
    if (conversationContext) {
      enhancedSystemPrompt = `${enhancedSystemPrompt}\n\nCONVERSATION CONTEXT: ${conversationContext}`;
    }
    
    console.log(`[EnhancedSession] Updating session for bot: ${agentName}`);
    console.log(`[EnhancedSession] System prompt has context: ${!!conversationContext}`);
    console.log(`[EnhancedSession] Using language: ${language}`);
    
    // Send session update to server - without the unsupported metadata field
    sendClientEvent({
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: enhancedSystemPrompt,
        // input_audio_transcription: { model: "whisper-1" },
        input_audio_transcription: { model: "gpt-4o-transcribe" },
        // input_audio_transcription: { model: "gpt-4o-mini-transcribe" },
        turn_detection: turnDetection,
        tools
      },
    }, "(enhanced_session_update)");
    
    // Optionally trigger an immediate response
    if (shouldTriggerResponse) {
      // Send a hidden system message to prime the bot with context
      const contextSummaryId = `ctx_${Date.now()}`.substring(0, 32);
      
      // No automatic greeting instruction - agent will respond when user sends a message
      const greetingInstruction = "";
      
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          id: contextSummaryId,
          type: "message",
          role: "system",
          content: [{ 
            type: "text",
            text: `You are now acting as ${agentName}. IMPORTANT: You must respond entirely in ${language}.${greetingInstruction} ${conversationContext}`
          }],
        },
        metadata: {
          isInitialGreeting: shouldTriggerResponse
        }
      }, "(context_transition_message)");
      
      // Use the safe response create method with metadata for welcome
      sendClientEvent({
        type: "response.create",
        metadata: {
          isInitialGreeting: shouldTriggerResponse,
          request_id: shouldTriggerResponse ? `welcome_${Date.now()}` : undefined
        }
      }, "(trigger_response_after_context_update)");
    }
  }, [activateBot, sendClientEvent, safeCreateResponse, language]);
  
  // Bot transfer with context preservation
  const transferToBotWithContext = useCallback((
    sourceBotName: string,
    destinationBotName: string,
    transferRationale: string,
    conversationContext: string,
    destinationConfig: AgentConfig,
    isPTTActive: boolean = false
  ) => {
    // Format the transfer context
    const formattedContext = `
      TRANSFER CONTEXT: You are taking over a conversation from ${sourceBotName}.
      Transfer reason: ${transferRationale}
      Previous conversation summary: ${conversationContext}
      
      CRITICAL LANGUAGE INSTRUCTION: You must continue the conversation entirely in ${language}. 
      Do not switch languages under any circumstances.
    `;
    
    console.log(`[EnhancedSession] Transferring from ${sourceBotName} to ${destinationBotName}`);
    console.log(`[EnhancedSession] Using language: ${language}`);
    
    // Configure turn detection based on PTT mode
    const turnDetection = isPTTActive 
      ? null 
      : {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
          create_response: true,
        };
    
    console.log(`[EnhancedSession] Setting turn detection with PTT mode: ${isPTTActive ? 'on (null)' : 'off (server_vad)'}`);
    
    // Update the session with the new bot and context
    updateSessionWithContext(
      destinationBotName,
      destinationConfig.instructions || '',
      destinationConfig.tools || [],
      formattedContext,
      true, // Trigger response
      turnDetection // Pass the turn detection config
    );
    
    return {
      success: true,
      destinationBotName,
      timestamp: new Date().toISOString()
    };
  }, [updateSessionWithContext, language]);

  // Rate limiting for simulated messages
  const lastSimulatedMessageRef = useRef<{ text: string; timestamp: number } | null>(null);
  
  // Define sendSimulatedUserMessage with useCallback
  const sendSimulatedUserMessage = useCallback((text: string) => {
    // Rate limit simulated messages to prevent spam
    const now = Date.now();
    if (lastSimulatedMessageRef.current) {
      const { text: lastText, timestamp: lastTime } = lastSimulatedMessageRef.current;
      // Skip if same message within 5 seconds
      if (lastText === text && (now - lastTime) < 5000) {
        console.log(`[SessionOperations] Skipping duplicate simulated message: "${text}"`);
        return;
      }
    }
    
    // Update the last message reference
    lastSimulatedMessageRef.current = { text, timestamp: now };
    
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);
    
    // Skip logging simulated messages since they're internal triggers

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          id,
          type: "message",
          role: "user",
          content: [{ type: "text", text }],
        },
        metadata: {
          isSimulated: true // Mark as simulated to prevent duplicate logging
        }
      },
      "(simulated user text message)"
    );
    
    // Use the safe response create method
    safeCreateResponse("(trigger response after simulated user text message)");
  }, [addTranscriptMessage, sendClientEvent, logUserMessage, safeCreateResponse]);

  // Store the current version in ref
  sendMessageRef.current = sendSimulatedUserMessage;

  // Define updateSession with useCallback
  const updateSession = useCallback(
    (shouldTriggerResponse: boolean = false) => {
      if (!selectedAgentName || !selectedAgentConfigSet) {
        console.error(
          "[SessionOperations] Unable to update session: No agent selected or config available"
        );
        return;
      }

      // Get the selected agent configuration
      const selectedAgent = selectedAgentConfigSet.find(
        (agent) => agent.name === selectedAgentName
      );

      if (!selectedAgent) {
        console.error(`[SessionOperations] Agent "${selectedAgentName}" not found in config`);
        return;
      }

      // Log session update
      console.log(`[SessionOperations] ${shouldTriggerResponse ? "Init" : "Update"} session with agent: ${selectedAgentName}, language: ${language}`);
      
      // Skip if identical update was sent recently (within 1 second)
      const now = Date.now();
      if (
        lastUpdateRef.current.agent === selectedAgentName && 
        lastUpdateRef.current.isPTTActive === isPTTActive &&
        now - lastUpdateRef.current.timestamp < 1000 &&
        !shouldTriggerResponse
      ) {
        console.log("Skipping duplicate session update");
        return;
      }

      // Update the last update reference
      lastUpdateRef.current = {
        agent: selectedAgentName,
        isPTTActive,
        timestamp: now
      };
      
      sendClientEvent(
        { type: "input_audio_buffer.clear" },
        "clear audio buffer on session update"
      );

      // Get the current agent's configuration settings
      const instructions = selectedAgent.instructions || "";
      const tools = selectedAgent.tools || [];
      
      // Get any existing context for this bot
      const activeBot = getActiveBotInfo();
      const contextSummary = activeBot?.conversationSummary || "";
      
      // Use the enhanced session manager to update the session with context preservation
      updateSessionWithContext(
        selectedAgentName,
        instructions,
        tools,
        contextSummary,
        shouldTriggerResponse,
        isPTTActive ? null : {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
          create_response: true,
        }
      );
      
      // If enhanced session manager didn't trigger the response and we need to
      if (shouldTriggerResponse && sendMessageRef.current && !contextSummary) {
        sendMessageRef.current("hi");
      }
    },
    [selectedAgentName, selectedAgentConfigSet, isPTTActive, sendClientEvent, getActiveBotInfo, updateSessionWithContext, language]
  );

  const cancelAssistantSpeech = useCallback((isOutputAudioBufferActive: boolean) => {
    sendClientEvent(
      { type: "response.cancel" },
      "(cancel due to user interruption)"
    );

    if (isOutputAudioBufferActive) {
      sendClientEvent(
        { type: "output_audio_buffer.clear" },
        "(cancel due to user interruption)"
      );
    }
    
    // Reset the active response flag since we're cancelling
    isResponseActiveRef.current = false;
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }
  }, [sendClientEvent]);

  // Helper function to remind the bot to be flexible with language
  const sendLanguageFlexibilityReminder = useCallback(() => {
    if (!selectedAgentName) {
      console.error("[SessionOperations] Cannot send language reminder: No agent selected");
      return;
    }
    
    // Add timestamp check to prevent multiple reminders within a short period
    const now = Date.now();
    const lastReminderSent = sessionStorage.getItem('last_language_reminder');
    const lastSentTime = lastReminderSent ? parseInt(lastReminderSent, 10) : 0;
    
    // Don't send reminders more than once every 10 seconds
    if (now - lastSentTime < 10000) {
      console.log("[SessionOperations] Skipping language reminder (sent recently)");
      return;
    }
    
    console.log("[SessionOperations] Sending language flexibility reminder");
    
    // Store the current time
    try {
      sessionStorage.setItem('last_language_reminder', now.toString());
    } catch (e) {
      console.warn('[SessionOperations] Could not store reminder timestamp', e);
    }
    
    // Send a system message to remind the bot about language flexibility
    const reminderMessage = {
      type: "conversation.item.create",
      item: {
        id: `lang_reminder_${Date.now()}`.substring(0, 32),
        type: "message",
        role: "system",
        content: [{ 
          type: "text",
          text: `IMPORTANT LANGUAGE INSTRUCTION: While your default language is ${language}, you MUST respond in the same language as the user's most recent message. If a user explicitly asks you to speak in a specific language (e.g., "Can you tell me in English?"), ALWAYS honor that request regardless of your default language setting.`
        }]
      },
      metadata: {
        isInternalSystemMessage: true
      }
    };
    
    sendClientEvent(reminderMessage, "language_flexibility_reminder");
  }, [selectedAgentName, language, sendClientEvent]);

  return {
    updateSession,
    updateSessionWithContext,
    transferToBotWithContext,
    sendSimulatedUserMessage,
    cancelAssistantSpeech,
    sendLanguageFlexibilityReminder
  };
} 