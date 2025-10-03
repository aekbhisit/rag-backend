"use client";

import { useRef, useCallback, useEffect } from "react";
import { AgentConfig } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { allAgentSets } from "@/app/agents";
import { useSessionRegistry } from "@/app/hooks/useSessionRegistry";
import { useSessionOperations } from "./useSessionOperations";
import { isBotAction as isBotUIAction, handleFunctionCall as handleBotUIFunctionCall } from "@/botActionFramework";

// Rate limiting for function call responses
let lastFunctionResponseTime = 0;
const FUNCTION_RESPONSE_COOLDOWN = 1000; // 1 second between function responses
let isFunctionResponseInProgress = false;

// ===== TYPE DEFINITIONS =====
declare global {
  interface Window {
    __TRANSFER_IN_PROGRESS?: boolean;
    __REALTIME_CONFIG__: {
      currentAgent: {
        functions: any[];
        [key: string]: any;
      };
      [key: string]: any;
    };
    __INITIAL_TRANSFER_MESSAGE?: boolean;
  }
}

export interface UseFunctionCallHandlerParams {
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void;
  setSelectedAgentName: (name: string) => void;
  isOutputAudioBufferActive: () => boolean;
  isPTTActive?: boolean;
  transcriptItems: any[];
}

interface FunctionCallParams {
  name: string;
  call_id?: string;
  arguments: string;
}

interface TransferContext {
  rationale: string;
  context: string;
  sourceAgent: string;
  destinationAgent: string;
}

interface TransferFunctionConfig {
  destinationAgent: string | "DYNAMIC"; // "DYNAMIC" means get from args.destination_agent
  defaultRationale: string;
  transferType: "transferBack" | "transfer";
}

// ===== TRANSFER FUNCTION REGISTRY =====
// 🎯 ADD NEW TRANSFER FUNCTIONS HERE - Just add one line!
const TRANSFER_FUNCTIONS: Record<string, TransferFunctionConfig> = {
  transferBack: {
    destinationAgent: "default",
    defaultRationale: "User transferred back to main assistant", 
    transferType: "transferBack"
  },
  transferAgents: {
    destinationAgent: "DYNAMIC", // Get destination from args.destination_agent
    defaultRationale: "Transfer requested",
    transferType: "transfer"
  },
  // 📝 Example: Add new transfer functions like this:
  // transferToSupport: {
  //   destinationAgent: "support",
  //   defaultRationale: "User transferred to support team",
  //   transferType: "transfer"
  // },
  // transferToManager: {
  //   destinationAgent: "manager", 
  //   defaultRationale: "User transferred to manager",
  //   transferType: "transfer"
  // },
  // transferToSales: {
  //   destinationAgent: "sales",
  //   defaultRationale: "User transferred to sales team", 
  //   transferType: "transfer"
  // }
} as const;

// Helper function to check if a function is a transfer function
const isTransferFunction = (functionName: string): boolean => {
  return functionName in TRANSFER_FUNCTIONS;
};

// ===== UTILITY FUNCTIONS =====
function resolveDestinationAgent(
  functionName: string, 
  args: any, 
  selectedAgentConfigSet: AgentConfig[] | null
): { agent: string; config: AgentConfig | null } {
  // Use registry for known transfer functions
  const transferConfig = TRANSFER_FUNCTIONS[functionName];
  const destinationAgent = transferConfig?.destinationAgent === "DYNAMIC" 
    ? args.destination_agent 
    : transferConfig?.destinationAgent || args.destination_agent;
  
  // Try to get config from agent sets first
  const destinationAgentSet = allAgentSets[destinationAgent];
  const newAgentConfig = destinationAgentSet && destinationAgentSet.length > 0 ? 
    destinationAgentSet[0] : null;
  
  // Fallback to current agent config set
  const fallbackConfig = !newAgentConfig ? 
    selectedAgentConfigSet?.find((a) => a.name === destinationAgent) || null : 
    null;
  
  const finalConfig = newAgentConfig || fallbackConfig;
  
  return { agent: destinationAgent, config: finalConfig };
}

function createTransferContext(
  functionName: string,
  args: any,
  fnResult: any,
  sourceAgent: string,
  destinationAgent: string
): TransferContext {
  const transferConfig = TRANSFER_FUNCTIONS[functionName];
  const isKnownTransferFunction = !!transferConfig;
  
  return {
    rationale: isKnownTransferFunction
      ? (fnResult?.rationale_for_transfer || transferConfig.defaultRationale)
      : (args.rationale_for_transfer || "Transfer requested"),
    context: isKnownTransferFunction
      ? (fnResult?.conversation_context || "Previous conversation context") 
      : (args.conversation_context || "Previous conversation context"),
    sourceAgent,
    destinationAgent
  };
}

function getTransferType(functionName: string): "transferBack" | "transfer" {
  return TRANSFER_FUNCTIONS[functionName]?.transferType || "transfer";
}

function getAnnouncementSuffix(functionName: string): string {
  const transferType = getTransferType(functionName);
  return transferType === "transferBack" 
    ? "(pre_transferback_announcement)" 
    : "(pre_transfer_announcement)";
}

// ===== MAIN HOOK IMPLEMENTATION =====
export function useFunctionCallHandler({
  selectedAgentName,
  selectedAgentConfigSet,
  sendClientEvent,
  setSelectedAgentName,
  isOutputAudioBufferActive,
  isPTTActive = false,
  transcriptItems,
}: UseFunctionCallHandlerParams) {
  const { transcriptItems: transcriptItemsContext, addTranscriptBreadcrumb } = useTranscript();
  const { activateBot } = useSessionRegistry();
  const { transferToBotWithContext } = useSessionOperations({
    selectedAgentName,
    selectedAgentConfigSet,
    isPTTActive,
    sendClientEvent
  });

  // Response management state
  const isResponseActiveRef = useRef<boolean>(false);
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track function calls to prevent duplicates
  const processedCallsRef = useRef<Set<string>>(new Set());
  
  // Clear processed calls periodically
  useEffect(() => {
    const interval = setInterval(() => {
      processedCallsRef.current.clear();
    }, 30000); // Clear every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // ===== RESPONSE MANAGEMENT =====
  const safeCreateResponse = useCallback((eventNameSuffix = "") => {
    const now = Date.now();
    
    // Prevent rapid-fire function responses
    if (isFunctionResponseInProgress) {
      console.log("[FunctionHandler] Skipping response - function response in progress");
      return;
    }
    
    if (now - lastFunctionResponseTime < FUNCTION_RESPONSE_COOLDOWN) {
      console.log(`[FunctionHandler] Skipping response - cooldown active (${now - lastFunctionResponseTime}ms ago)`);
      return;
    }
    
    isFunctionResponseInProgress = true;
    lastFunctionResponseTime = now;
    
    if (isResponseActiveRef.current) {
      console.warn("[FunctionHandler] Prevented duplicate response.create - one is already active");
      return false;
    }
    
    isResponseActiveRef.current = true;
    
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
    }
    
    responseTimeoutRef.current = setTimeout(() => {
      console.log("[FunctionHandler] Response timeout reached, resetting active flag");
      isResponseActiveRef.current = false;
      responseTimeoutRef.current = null;
    }, 30000);
    
    try {
      sendClientEvent({ 
        type: "response.create",
        metadata: {
          function_generated: true,
          timestamp: now
        }
      }, eventNameSuffix);
    } finally {
      setTimeout(() => {
        isFunctionResponseInProgress = false;
      }, 500);
    }
    return true;
  }, [sendClientEvent]);

  // ===== TRANSFER LOGIC =====
  const executeTransfer = useCallback((
    functionName: string,
    args: any,
    fnResult: any,
    callId: string
  ) => {
    console.log(`[Transfer] ▶ executeTransfer start: fn=${functionName}, callId=${callId}`);
    const { agent: destinationAgent, config: finalConfig } = resolveDestinationAgent(
      functionName, 
      args, 
      selectedAgentConfigSet
    );
    
    console.log(`[${functionName}] Starting transfer to ${destinationAgent}`);
    
    // Add pending transfer message
    const transferType = getTransferType(functionName);
    addTranscriptBreadcrumb(
      `${transferType === "transferBack" ? "Transfer back to" : "Transfer to"} ${destinationAgent} requested. Waiting for voice announcement to complete...`,
      { status: "pending", destination: destinationAgent, type: transferType }
    );
    
    // Send function output
    const functionCallOutput = {
      destination_agent: destinationAgent,
      did_transfer: !!finalConfig,
    };
    
    console.log(`[Transfer] ▶ sending function_call_output for ${functionName} → ${destinationAgent}`);
    sendClientEvent({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(functionCallOutput),
      },
    });
    
    // Trigger announcement
    const announcementSuffix = getAnnouncementSuffix(functionName);
    console.log(`[Transfer] ▶ triggering announcement response: ${announcementSuffix}`);
    safeCreateResponse(announcementSuffix);
    
    addTranscriptBreadcrumb(`function call: ${functionName} response`, functionCallOutput);
    
    // Setup transfer completion
    const completeTransfer = () => {
      if (!finalConfig) return;
      
      // Reset response state
      isResponseActiveRef.current = false;
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
        responseTimeoutRef.current = null;
      }
      
      // Update agent registration and UI
      console.log(`[Transfer] ▶ activating destination agent: ${finalConfig.name}`);
      activateBot(finalConfig.name, `Agent activated during ${transferType}`);
      
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", destinationAgent);
      window.history.pushState({}, "", url.toString());
      
      setSelectedAgentName(finalConfig.name);
      
      // Prepare and execute transfer
      const transferContext = createTransferContext(
        functionName, 
        args, 
        fnResult, 
        selectedAgentName, 
        finalConfig.name
      );
      
      console.log(`[Transfer] ▶ transferToBotWithContext: ${selectedAgentName} → ${finalConfig.name}`);
      transferToBotWithContext(
        selectedAgentName,
        finalConfig.name,
        transferContext.rationale,
        transferContext.context,
        finalConfig,
        isPTTActive
      );
      
      addTranscriptBreadcrumb(
        `${transferType}: Completed transfer to ${finalConfig.name} using session hierarchy`,
        transferContext
      );
    };
    
    // Audio monitoring and transfer execution
    const responseCreatedTime = Date.now();
    
    const checkAndTransfer = () => {
      if (isOutputAudioBufferActive()) {
        console.log(`[${transferType}] Announcement is still playing, waiting...`);
        setTimeout(checkAndTransfer, 500);
        return;
      }
      
      const timeSinceResponseCreated = Date.now() - responseCreatedTime;
      
      if (timeSinceResponseCreated < 3000) {
        console.log(`[${transferType}] Waiting for announcement to begin (${timeSinceResponseCreated}ms elapsed)`);
        setTimeout(checkAndTransfer, 500);
      } else {
        console.log(`[${transferType}] Announcement completed or no announcement generated`);
        completeTransfer();
      }
    };
    
    console.log(`[${transferType}] Waiting for announcement to be generated and played...`);
    setTimeout(checkAndTransfer, 2000);
  }, [
    selectedAgentConfigSet,
    selectedAgentName,
    addTranscriptBreadcrumb,
    sendClientEvent,
    safeCreateResponse,
    activateBot,
    setSelectedAgentName,
    transferToBotWithContext,
    isOutputAudioBufferActive,
    isPTTActive
  ]);

  // ===== FUNCTION CALL HANDLERS =====
  const handleToolLogicFunction = useCallback(async (
    functionCallParams: FunctionCallParams,
    currentAgent: AgentConfig
  ) => {
    console.log(`[ToolLogic] ▶ executing tool: ${functionCallParams.name}, call_id=${functionCallParams.call_id}`);
    const args = JSON.parse(functionCallParams.arguments);
    const fn = currentAgent.toolLogic![functionCallParams.name];
    const fnResult = await fn(args, transcriptItems);
    try { console.log(`[ToolLogic] ✅ tool result (preview): ${JSON.stringify(fnResult).slice(0, 200)}`); } catch {}
    
    addTranscriptBreadcrumb(`function call result: ${functionCallParams.name}`, fnResult);
    
    // Send function output
    console.log(`[ToolLogic] ▶ sending function_call_output back to model`);
    sendClientEvent({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: functionCallParams.call_id,
        output: JSON.stringify(fnResult),
      },
    });
    
    // Handle transfer functions using the registry
    if (isTransferFunction(functionCallParams.name)) {
      executeTransfer(functionCallParams.name, args, fnResult, functionCallParams.call_id!);
      return; // Exit early for transfers
    }
    
    // Regular function response
    console.log(`[ToolLogic] ▶ triggering response after function output`);
    safeCreateResponse("(after function call output)");
  }, [transcriptItems, addTranscriptBreadcrumb, sendClientEvent, executeTransfer, safeCreateResponse]);

  const handleFallbackFunction = useCallback((functionCallParams: FunctionCallParams) => {
    console.log(`[ToolLogic] ⚠ fallback tool: ${functionCallParams.name}, call_id=${functionCallParams.call_id}`);
    const simulatedResult = { result: true };
    
    addTranscriptBreadcrumb(`function call fallback: ${functionCallParams.name}`, simulatedResult);
    
    console.log(`[ToolLogic] ▶ sending fallback function_call_output`);
    sendClientEvent({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: functionCallParams.call_id,
        output: JSON.stringify(simulatedResult),
      },
    });
    
    safeCreateResponse("(fallback function response)");
  }, [addTranscriptBreadcrumb, sendClientEvent, safeCreateResponse]);

  // ===== MAIN HANDLER =====
  const handleFunctionCall = useCallback(async (functionCallParams: FunctionCallParams) => {
    console.log(`[FC] ▶ handleFunctionCall: name=${functionCallParams.name}, call_id=${functionCallParams.call_id}`);
    const args = JSON.parse(functionCallParams.arguments);
    const currentAgent = selectedAgentConfigSet?.find((a) => a.name === selectedAgentName);

    addTranscriptBreadcrumb(`function call: ${functionCallParams.name}`, args);

    // Check if agent has custom tool logic for this function
    if (currentAgent?.toolLogic?.[functionCallParams.name]) {
      console.log(`[FC] ▶ executing agent tool logic: ${functionCallParams.name}`);
      await handleToolLogicFunction(functionCallParams, currentAgent);
    } else if (isTransferFunction(functionCallParams.name)) {
      console.log(`[FC] ▶ executing transfer function: ${functionCallParams.name}`);
      // Handle all transfer functions through the registry
      executeTransfer(functionCallParams.name, args, null, functionCallParams.call_id!);
    } else if (isBotUIAction(functionCallParams.name)) {
      console.log(`[FC] ▶ executing bot UI action via framework: ${functionCallParams.name}`);
      try {
        const result = await handleBotUIFunctionCall({
          name: functionCallParams.name,
          call_id: functionCallParams.call_id,
          arguments: functionCallParams.arguments,
        });
        // Echo function_call_output back to model
        sendClientEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: functionCallParams.call_id,
            output: JSON.stringify(result),
          },
        });
        // Trigger a response after UI action so the assistant can continue speaking
        safeCreateResponse("(after bot ui action)");
      } catch (err) {
        console.error(`[FC] ❌ bot UI action failed: ${functionCallParams.name}`, err);
      }
    } else {
      console.log(`[FC] ▶ unknown tool, using fallback: ${functionCallParams.name}`);
      // Fallback for unknown functions
      handleFallbackFunction(functionCallParams);
    }
  }, [
    selectedAgentName,
    selectedAgentConfigSet,
    addTranscriptBreadcrumb,
    handleToolLogicFunction,
    executeTransfer,
    handleFallbackFunction,
    sendClientEvent,
    safeCreateResponse
  ]);

  const handleFunctionCallRef = useRef(handleFunctionCall);
  handleFunctionCallRef.current = handleFunctionCall;

  return handleFunctionCallRef;
}