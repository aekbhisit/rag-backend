"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useActionContext } from '@/botActionFramework';
import { handleThaiResortFunctionCall } from '../services/actionHandlers';
import { 
  thaiResortFunctions, 
  getThaiResortViewContext, 
  getAvailableArticles,
  THAI_RESORT_FUNCTION_NAMES,
  getThaiResortHandlers
} from '../functions';
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { getCategoryName } from '../data/resortData';

interface UseThaiResortFunctionHandlerParams {
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void;
}

// ===== HANDLER CONFIGURATION =====
// Get all handlers (core + thai resort specific)
const allHandlers = getThaiResortHandlers();

// Track active responses to prevent conflicts with main response handler
const isResponseActiveRef = { current: false };
const pendingResponsesQueue: (() => void)[] = [];



// Handler for response.done events to process queue
function handleResponseDone() {
  console.log("[ThaiResort] Response completed");
  isResponseActiveRef.current = false;
  
  // Process next item in queue if available
  if (pendingResponsesQueue.length > 0) {
    console.log("[ThaiResort] Processing next queued response");
    const nextResponse = pendingResponsesQueue.shift();
    if (nextResponse) {
      setTimeout(nextResponse, 500); // Add delay for stability
    }
  }
}

/**
 * Hook for handling Thai resort function calls with new Core Handler structure
 * 
 * Features:
 * - Uses new schema/handler separation for better organization
 * - Core handlers: intentionChange, transferAgents, transferBack
 * - Skill handlers: knowledgeSearch, webSearch
 * - UI handlers: navigateToMain, navigateToPrevious
 * - Agent-specific handlers: viewResortCategory, viewResortDetail, etc.
 * 
 * Supported functions:
 * - Core: intentionChange, transferAgents, transferBack
 * - Skill: knowledgeSearch, webSearch
 * - UI: navigateToMain, navigateToPrevious
 * - Thai Resort: viewResortCategory, viewResortDetail, searchResorts, compareResorts
 */
export function useThaiResortFunctionHandler({
  sendClientEvent,
}: UseThaiResortFunctionHandlerParams) {
  const actionContext = useActionContext();
  const { addTranscriptBreadcrumb } = useTranscript();
  
  // Track response state
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Register function handlers
  useEffect(() => {
    // Get the current agent context
    const currentAgent = window.__REALTIME_CONFIG__?.currentAgent;
    
    if (currentAgent && currentAgent.functions) {
      // Add Thai resort functions to the agent
      const updatedFunctions = [
        ...currentAgent.functions,
        ...thaiResortFunctions
      ];
      
      // Update the agent config
      window.__REALTIME_CONFIG__.currentAgent.functions = updatedFunctions;
      
      console.log('[ThaiResort] Registered Thai resort functions with agent');
    }
    
    return () => {
      // Cleanup when unmounting
      if (window.__REALTIME_CONFIG__?.currentAgent) {
        // Remove Thai resort functions
        const currentFunctions = window.__REALTIME_CONFIG__.currentAgent.functions || [];
        const filteredFunctions = currentFunctions.filter(
          (f: any) => !thaiResortFunctions.some(rf => rf.name === f.name)
        );
        
        window.__REALTIME_CONFIG__.currentAgent.functions = filteredFunctions;
      }
      
      // Clear any pending timeouts
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
    };
  }, []);

  // ===== AGENT-SPECIFIC HANDLERS =====
  // Thai Resort specific function handlers
  const thaiResortSpecificHandlers = {
    viewResortCategory: async (args: any) => {
      console.log('[ThaiResort] viewResortCategory called:', args);
      
      // Execute the action through existing handler
      return await handleThaiResortFunctionCall(
        { name: 'viewResortCategory', arguments: JSON.stringify(args) },
        async (actionType, payload) => {
          return await actionContext.executeAction(actionType as any, payload);
        }
      );
    },
    
    viewResortDetail: async (args: any) => {
      console.log('[ThaiResort] viewResortDetail called:', args);
      
      return await handleThaiResortFunctionCall(
        { name: 'viewResortDetail', arguments: JSON.stringify(args) },
        async (actionType, payload) => {
          return await actionContext.executeAction(actionType as any, payload);
        }
      );
    },
    
    searchResorts: async (args: any) => {
      console.log('[ThaiResort] searchResorts called:', args);
      
      return await handleThaiResortFunctionCall(
        { name: 'searchResorts', arguments: JSON.stringify(args) },
        async (actionType, payload) => {
          return await actionContext.executeAction(actionType as any, payload);
        }
      );
    },
    
    compareResorts: async (args: any) => {
      console.log('[ThaiResort] compareResorts called:', args);
      
      return await handleThaiResortFunctionCall(
        { name: 'compareResorts', arguments: JSON.stringify(args) },
        async (actionType, payload) => {
          return await actionContext.executeAction(actionType as any, payload);
        }
      );
    }
  };

  // ===== COMBINED HANDLERS =====
  // Combine all handlers (core + thai resort specific + legacy specific handlers)
  const combinedHandlers: Record<string, (args: any) => Promise<any>> = {
    ...allHandlers,
    ...thaiResortSpecificHandlers
  };
  
  // Function handler
  const handleThaiResortFunction = useCallback(async (functionCall: {
    name: string;
    call_id?: string;
    arguments: string;
  }) => {
    // Check if this is a function we can handle
    const canHandle = Object.keys(combinedHandlers).includes(functionCall.name);
    
    // transferBack should be handled by the main function call handler via toolLogic
    if (functionCall.name === 'transferBack') {
      console.log('[ThaiResort] transferBack detected - letting main handler process it via toolLogic');
      return false; // Don't handle it here, let main handler take over
    }
    
    if (!canHandle) {
      return false; // Not handled by this handler
    }
    
    console.log(`[ThaiResort] Handling function call: ${functionCall.name}`, functionCall);
    
    let parsedArgs;
    try {
      parsedArgs = JSON.parse(functionCall.arguments || '{}');
      console.log(`[ThaiResort] Parsed arguments:`, parsedArgs);
    } catch (e) {
      console.error(`[ThaiResort] Error parsing arguments for ${functionCall.name}:`, e);
      console.error(`[ThaiResort] Raw arguments string:`, functionCall.arguments);
      
      // Add transcript breadcrumb for parse error
      addTranscriptBreadcrumb(`❌ ThaiResort function parse error: ${functionCall.name}`, {
        error: e?.toString(),
        rawArguments: functionCall.arguments
      });
      
      return false;
    }
    
    // Enhanced logging for troubleshooting
    addTranscriptBreadcrumb(`📞 ThaiResort function call: ${functionCall.name}`, {
      functionName: functionCall.name,
      arguments: parsedArgs,
      callId: functionCall.call_id,
      rawArgs: functionCall.arguments
    });
    
    // Get current context before action
    const contextBefore = actionContext.getContext();
    console.log(`[ThaiResort] Context before action:`, contextBefore);
    
    try {
      // Execute the appropriate handler
      const handler = combinedHandlers[functionCall.name];
      if (!handler) {
        throw new Error(`No handler found for function: ${functionCall.name}`);
      }
      
      console.log(`[ThaiResort] ===== EXECUTING HANDLER: ${functionCall.name} =====`);
      const result = await handler(parsedArgs);
      console.log(`[ThaiResort] ===== HANDLER RESULT =====`);
      console.log(`[ThaiResort] Function ${functionCall.name} result:`, JSON.stringify(result, null, 2));
      
      console.log(`[ThaiResort] ===== SENDING TO OPENAI =====`);
      console.log(`[ThaiResort] Function call ID: ${functionCall.call_id}`);
      console.log(`[ThaiResort] Function name: ${functionCall.name}`);
      console.log(`[ThaiResort] Result being sent to OpenAI:`, JSON.stringify(result, null, 2));
      console.log(`[ThaiResort] ===== END OPENAI PAYLOAD =====`);
      
      // Add success breadcrumb
      addTranscriptBreadcrumb(`✅ ThaiResort function completed: ${functionCall.name}`, {
        functionName: functionCall.name,
        result: result,
        callId: functionCall.call_id
      });
      
      return true; // Successfully handled
      
    } catch (error) {
      console.error(`[ThaiResort] Error executing function ${functionCall.name}:`, error);
      
      // Add error breadcrumb
      addTranscriptBreadcrumb(`❌ ThaiResort function error: ${functionCall.name}`, {
        functionName: functionCall.name,
        error: error?.toString(),
        arguments: parsedArgs
      });
      
      return false;
    }
  }, [actionContext, sendClientEvent, addTranscriptBreadcrumb, combinedHandlers]);

  // ===== RESPONSE MANAGEMENT =====
  // Handle response events
  useEffect(() => {
    // Store handler globally for cleanup
    window.__THAI_RESORT_RESPONSE_HANDLER__ = handleResponseDone;
    
    return () => {
      delete window.__THAI_RESORT_RESPONSE_HANDLER__;
    };
  }, []);

  return {
    handleThaiResortFunction,
    isResponseActive: () => isResponseActiveRef.current,
    clearResponseQueue: () => {
      pendingResponsesQueue.length = 0;
      isResponseActiveRef.current = false;
    }
  };
}

// ===== HELPER FUNCTIONS =====
// Keep existing helper functions for compatibility

export const createAIGuidanceMessage = (context: any, lastFunctionName: string) => {
  const viewContext = getThaiResortViewContext(context);
  
  let guidance = `${viewContext}\n\n`;
  
  // Add specific guidance based on the last function called
  switch (lastFunctionName) {
    case THAI_RESORT_FUNCTION_NAMES.VIEW_RESORT_CATEGORY:
      if (context?.currentCategory) {
        const categoryName = getCategoryName(context.currentCategory);
        const articles = getAvailableArticles(context.currentCategory);
        guidance += `Available ${categoryName} resorts:\n`;
        articles.forEach((article, index) => {
          guidance += `${index + 1}. ${article.name}\n`;
        });
        guidance += `\nYou can select a specific resort to view details, or navigate back to see all categories.`;
      }
      break;
      
    case THAI_RESORT_FUNCTION_NAMES.VIEW_RESORT_DETAIL:
      guidance += `You are viewing detailed information about a resort. You can navigate back to the category list or return to the main categories page.`;
      break;
      
    case THAI_RESORT_FUNCTION_NAMES.NAVIGATE_TO_MAIN:
      guidance += `You are now at the main Thai Resort Guide page. You can explore different resort categories.`;
      break;
      
    default:
      guidance += `You can explore resort categories, view specific resorts, or navigate using the available options.`;
  }
  
  return guidance;
};

// ===== TYPE DECLARATIONS =====
declare global {
  interface Window {
    __REALTIME_CONFIG__: {
      currentAgent: {
        functions: any[];
        [key: string]: any;
      };
      [key: string]: any;
    };
    __THAI_RESORT_RESPONSE_HANDLER__?: () => void;
  }
} 