/**
 * Bot Action Framework
 * ActionRegistry - Manages the registration of action handlers
 */

import { ActionType, ActionPayloadUnion, ActionResult } from './ActionTypes';

/**
 * Handler function type for action handlers
 */
export type ActionHandler = (payload: ActionPayloadUnion) => Promise<ActionResult>;

/**
 * Interface for the action registry
 */
export interface IActionRegistry {
  /**
   * Register an action handler
   * @param actionType The type of action this handler can process
   * @param handlerId Unique identifier for this handler
   * @param handler The handler function
   */
  registerAction: (actionType: ActionType, handlerId: string, handler: ActionHandler) => void;
  
  /**
   * Unregister an action handler
   * @param actionType The type of action
   * @param handlerId The handler ID to unregister
   */
  unregisterAction: (actionType: ActionType, handlerId: string) => void;
  
  /**
   * Get all handlers for a specific action type
   * @param actionType The type of action
   */
  getHandlersForType: (actionType: ActionType) => Record<string, ActionHandler>;
  
  /**
   * Check if a specific handler is registered
   * @param actionType The type of action
   * @param handlerId The handler ID to check
   */
  hasHandler: (actionType: ActionType, handlerId: string) => boolean;
  
  /**
   * Clear all handlers for a specific action type
   * @param actionType The type of action
   */
  clearHandlersForType: (actionType: ActionType) => void;
  
  /**
   * Clear all registered handlers
   */
  clearAllHandlers: () => void;
}

/**
 * Implementation of the action registry
 */
export class ActionRegistry implements IActionRegistry {
  // Store handlers in a nested map: actionType -> handlerId -> handler
  private handlers: Record<string, Record<string, ActionHandler>> = {};
  
  /**
   * Register an action handler
   */
  registerAction(actionType: ActionType, handlerId: string, handler: ActionHandler): void {
    // Initialize handler map for this action type if it doesn't exist
    if (!this.handlers[actionType]) {
      this.handlers[actionType] = {};
    }
    
    // Register the handler
    this.handlers[actionType][handlerId] = handler;
  }
  
  /**
   * Unregister an action handler
   */
  unregisterAction(actionType: ActionType, handlerId: string): void {
    if (this.handlers[actionType] && this.handlers[actionType][handlerId]) {
      delete this.handlers[actionType][handlerId];
    }
  }
  
  /**
   * Get all handlers for a specific action type
   */
  getHandlersForType(actionType: ActionType): Record<string, ActionHandler> {
    return this.handlers[actionType] || {};
  }
  
  /**
   * Check if a specific handler is registered
   */
  hasHandler(actionType: ActionType, handlerId: string): boolean {
    return !!(this.handlers[actionType] && this.handlers[actionType][handlerId]);
  }
  
  /**
   * Clear all handlers for a specific action type
   */
  clearHandlersForType(actionType: ActionType): void {
    this.handlers[actionType] = {};
  }
  
  /**
   * Clear all registered handlers
   */
  clearAllHandlers(): void {
    this.handlers = {};
  }
}

// Singleton instance for easy access
export const actionRegistry = new ActionRegistry(); 