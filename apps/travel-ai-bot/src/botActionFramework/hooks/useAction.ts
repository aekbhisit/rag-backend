"use client";

/**
 * Bot Action Framework
 * useAction - Hook for component-level action handling
 */

import { useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ActionType, ActionPayloadUnion, ActionResult } from '../ActionTypes';
import { useActionContext } from '../ActionContext';

/**
 * Options for registering an action handler
 */
interface UseActionOptions {
  /**
   * Component identifier (used to create unique handler IDs)
   * If not provided, a random ID will be generated
   */
  componentId?: string;
  
  /**
   * Whether to automatically register/unregister the handler on mount/unmount
   * Default: true
   */
  autoRegister?: boolean;
}

/**
 * Return type for useAction hook
 */
interface UseActionReturn<T extends ActionPayloadUnion> {
  /**
   * Register this component's handler for an action type
   */
  register: (actionType: ActionType) => void;
  
  /**
   * Unregister this component's handler for an action type
   */
  unregister: (actionType: ActionType) => void;
  
  /**
   * The unique ID used for this component's handlers
   */
  handlerId: string;
  
  /**
   * Execute an action (convenience wrapper around context.executeAction)
   */
  execute: <U extends ActionPayloadUnion>(
    actionType: ActionType, 
    payload: Omit<U, 'actionId'>
  ) => Promise<ActionResult>;
}

/**
 * Hook for registering action handlers in components
 */
export function useAction<T extends ActionPayloadUnion>(
  handler: (payload: T) => Promise<ActionResult>,
  actionTypes: ActionType[],
  options: UseActionOptions = {}
): UseActionReturn<T> {
  // Get the action context
  const context = useActionContext();
  
  // Generate a stable ID for this component instance
  const handlerId = useRef(options.componentId || `component-${uuidv4()}`).current;
  
  // Memoize the handler
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  
  // Type-safe wrapper that calls the handler ref
  const typedHandler = useCallback(
    async (payload: ActionPayloadUnion): Promise<ActionResult> => {
      try {
        return await handlerRef.current(payload as T);
      } catch (error) {
        console.error(`[useAction] Handler error for ${handlerId}:`, error);
        return {
          success: false,
          error: `Handler error: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
    [handlerId]
  );
  
  // Register action handler
  const register = useCallback(
    (actionType: ActionType) => {
      context.registerAction(actionType, handlerId, typedHandler);
      console.log(`[useAction] Registered handler for ${actionType} with ID ${handlerId}`);
    },
    [context, handlerId, typedHandler]
  );
  
  // Unregister action handler
  const unregister = useCallback(
    (actionType: ActionType) => {
      context.unregisterAction(actionType, handlerId);
      console.log(`[useAction] Unregistered handler for ${actionType} with ID ${handlerId}`);
    },
    [context, handlerId]
  );
  
  // Execute action (convenience wrapper)
  const execute = useCallback(
    <U extends ActionPayloadUnion>(
      actionType: ActionType, 
      payload: Omit<U, 'actionId'>
    ): Promise<ActionResult> => {
      return context.executeAction(actionType, payload);
    },
    [context]
  );
  
  // Auto-register/unregister on mount/unmount
  useEffect(() => {
    if (options.autoRegister !== false) {
      // Register for all action types
      actionTypes.forEach((actionType) => {
        register(actionType);
      });
      
      // Cleanup on unmount
      return () => {
        actionTypes.forEach((actionType) => {
          unregister(actionType);
        });
      };
    }
  }, [actionTypes, register, unregister, options.autoRegister]);
  
  return {
    register,
    unregister,
    handlerId,
    execute,
  };
} 