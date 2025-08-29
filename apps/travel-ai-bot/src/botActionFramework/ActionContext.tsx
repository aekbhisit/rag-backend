"use client";

/**
 * Bot Action Framework
 * ActionContext - React context provider for the framework
 */

import React, { createContext, useContext, useCallback, useState, PropsWithChildren } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ActionType, ActionPayloadUnion, ActionResult } from './ActionTypes';
import { actionRegistry } from './ActionRegistry';
import { actionDispatcher } from './ActionDispatcher';
import { contextManager, AppContext } from './ContextManager';

/**
 * Context value interface
 */
interface ActionContextValue {
  // Action execution
  executeAction: <T extends ActionPayloadUnion>(
    actionType: ActionType,
    payload: Omit<T, 'actionId'>
  ) => Promise<ActionResult>;
  
  executeSequence: (
    actions: Array<{
      actionType: ActionType;
      payload: Omit<ActionPayloadUnion, 'actionId'>;
    }>
  ) => Promise<ActionResult[]>;
  
  // Handler registration
  registerAction: (
    actionType: ActionType,
    handlerId: string,
    handler: (payload: ActionPayloadUnion) => Promise<ActionResult>
  ) => void;
  
  unregisterAction: (
    actionType: ActionType,
    handlerId: string
  ) => void;
  
  // Context access
  getContext: () => AppContext;
  updateContext: (context: Partial<AppContext>) => void;
  
  // Status indicators
  isActionPending: boolean;
  lastAction: {
    type: ActionType | null;
    result: ActionResult | null;
  };
}

// Create context with undefined initial value
const ActionContext = createContext<ActionContextValue | undefined>(undefined);

/**
 * Action context provider component
 */
export const ActionProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isActionPending, setIsActionPending] = useState<boolean>(false);
  const [lastAction, setLastAction] = useState<{
    type: ActionType | null;
    result: ActionResult | null;
  }>({
    type: null,
    result: null,
  });
  
  // Add state to track context changes 
  const [contextVersion, setContextVersion] = useState<number>(0);
  
  // Create a wrapper for context updates that also updates React state
  const updateContextWrapper = useCallback((context: Partial<AppContext>) => {
    contextManager.updateContext(context);
    // Increment version to trigger re-renders in components using getContext
    setContextVersion(prev => prev + 1);
  }, []);
  
  // Create a wrapper for getting context that's reactive to changes
  const getContextWrapper = useCallback(() => {
    // Using contextVersion in the dependency array of components will make them re-render
    // when context changes, even though we're just returning the same function call
    return contextManager.getCurrentContext();
  }, [contextVersion]);

  const executeAction = useCallback(
    async <T extends ActionPayloadUnion>(
      actionType: ActionType,
      payloadWithoutId: Omit<T, 'actionId'>
    ): Promise<ActionResult> => {
      try {
        setIsActionPending(true);
        
        // Generate unique ID for the action
        const actionId = uuidv4();
        const payload = { ...payloadWithoutId, actionId } as T;
        
        console.log(`[ActionContext] Executing action ${actionType}`, payload);
        
        // Get handlers for this action type
        const handlers = actionRegistry.getHandlersForType(actionType);
        
        if (Object.keys(handlers).length === 0) {
          console.warn(`No handlers registered for action type: ${actionType}`);
          return { success: false, error: `No handlers for ${actionType}` };
        }
        
        // Execute all handlers in sequence
        const results: ActionResult[] = [];
        
        for (const handlerId of Object.keys(handlers)) {
          const handler = handlers[handlerId];
          try {
            console.log(`[ActionContext] Running handler ${handlerId} for ${actionType}`);
            const result = await handler(payload);
            results.push(result);
            
            // If a handler reports success, consider the action successful
            if (result.success) {
              // Update the last action
              setLastAction({
                type: actionType,
                result,
              });
              
              // Update context with action information
              updateContextWrapper({
                lastActionType: actionType,
                lastActionPayload: payload,
                lastActionResult: result,
                lastActionTimestamp: Date.now(),
              });
              
              console.log(`[ActionContext] Handler ${handlerId} succeeded:`, result);
              
              return result;
            }
          } catch (error) {
            console.error(`Error in handler ${handlerId} for ${actionType}:`, error);
            results.push({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        
        // If we get here, no handler reported success
        const errorResult: ActionResult = {
          success: false,
          error: `All handlers failed for ${actionType}`,
          data: { handlerResults: results },
        };
        
        setLastAction({
          type: actionType,
          result: errorResult,
        });
        
        console.warn(`[ActionContext] All handlers failed for ${actionType}:`, results);
        
        return errorResult;
      } finally {
        setIsActionPending(false);
      }
    },
    [updateContextWrapper]
  );
  
  // Wrap dispatcher's executeSequence to handle UI state
  const executeSequence = useCallback(
    async (
      actions: Array<{
        actionType: ActionType;
        payload: Omit<ActionPayloadUnion, 'actionId'>;
      }>
    ): Promise<ActionResult[]> => {
      try {
        setIsActionPending(true);
        const results = await actionDispatcher.executeSequence(actions);
        if (results.length > 0) {
          const lastIdx = results.length - 1;
          setLastAction({
            type: actions[lastIdx].actionType,
            result: results[lastIdx],
          });
        }
        return results;
      } finally {
        setIsActionPending(false);
      }
    },
    []
  );
  
  // Expose registry functions
  const registerAction = useCallback(
    (
      actionType: ActionType,
      handlerId: string,
      handler: (payload: ActionPayloadUnion) => Promise<ActionResult>
    ) => {
      actionRegistry.registerAction(actionType, handlerId, handler);
    },
    []
  );
  
  const unregisterAction = useCallback(
    (actionType: ActionType, handlerId: string) => {
      actionRegistry.unregisterAction(actionType, handlerId);
    },
    []
  );
  
  // Create context value
  const contextValue: ActionContextValue = {
    executeAction,
    executeSequence,
    registerAction,
    unregisterAction,
    getContext: getContextWrapper,
    updateContext: updateContextWrapper,
    isActionPending,
    lastAction,
  };
  
  return (
    <ActionContext.Provider value={contextValue}>
      {children}
    </ActionContext.Provider>
  );
};

/**
 * Hook to use the action context
 */
export const useActionContext = (): ActionContextValue => {
  const context = useContext(ActionContext);
  
  if (context === undefined) {
    throw new Error('useActionContext must be used within an ActionProvider');
  }
  
  return context;
}; 