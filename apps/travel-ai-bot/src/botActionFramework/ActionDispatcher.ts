/**
 * Bot Action Framework
 * ActionDispatcher - Handles the execution of actions
 */

import { v4 as uuidv4 } from 'uuid';
import { ActionType, ActionPayloadUnion, ActionResult } from './ActionTypes';
import { ActionRegistry, actionRegistry } from './ActionRegistry';

/**
 * Interface for the action dispatcher
 */
export interface IActionDispatcher {
  /**
   * Execute an action with the given type and payload
   * @param actionType The type of action to execute
   * @param payload The payload for the action
   */
  executeAction: <T extends ActionPayloadUnion>(
    actionType: ActionType, 
    payload: Omit<T, 'actionId'>
  ) => Promise<ActionResult>;
  
  /**
   * Execute a sequence of actions
   * @param actions Array of actions to execute in sequence
   */
  executeSequence: (
    actions: Array<{
      actionType: ActionType;
      payload: Omit<ActionPayloadUnion, 'actionId'>;
    }>
  ) => Promise<ActionResult[]>;
}

/**
 * Implementation of the action dispatcher
 */
export class ActionDispatcher implements IActionDispatcher {
  constructor(private registry: ActionRegistry) {}
  
  /**
   * Execute an action with the given type and payload
   */
  async executeAction<T extends ActionPayloadUnion>(
    actionType: ActionType, 
    payload: Omit<T, 'actionId'>
  ): Promise<ActionResult> {
    try {
      // Generate a unique ID for this action
      const actionId = uuidv4();
      
      // Complete payload with ID
      const fullPayload = {
        ...payload,
        actionId,
      } as T;
      
      // Log action start
      console.log(`[ActionDispatcher] Executing action ${actionType}`, fullPayload);
      
      // Get handlers for this action type
      const handlers = this.registry.getHandlersForType(actionType);
      
      // Check if we have handlers
      if (Object.keys(handlers).length === 0) {
        // Fallback for common actions (client-side only)
        if (actionType === ActionType.NAVIGATE_PAGE) {
          try {
            const anyPayload: any = fullPayload as any;
            let route: string | null = null;
            if (typeof anyPayload.path === 'string' && anyPayload.path.startsWith('/')) {
              route = anyPayload.path;
            } else if (Array.isArray(anyPayload.segments) && anyPayload.segments.length > 0) {
              const base = anyPayload.pageName === 'travel' ? '/travel' : '/';
              route = base.replace(/\/$/, '') + '/' + anyPayload.segments.map((s: string) => encodeURIComponent(s)).join('/');
            } else if (anyPayload.pageName === 'travel') {
              const slug = anyPayload.slug || anyPayload?.pageParams?.slug;
              if (typeof slug === 'string' && slug) route = `/travel/${encodeURIComponent(slug)}`;
            }
            if (route && typeof window !== 'undefined') {
              // For travel pages, prefer partial render via query param to preserve chat session
              if (anyPayload.pageName === 'travel') {
                const url = new URL(window.location.href);
                const params = new URLSearchParams(url.search);
                params.delete('content');
                const query = params.toString();
                const next = `${url.origin}${url.pathname}${query ? `?${query}&` : '?'}content=${route}${url.hash || ''}`;
                window.history.pushState({}, '', next);
                window.dispatchEvent(new Event('popstate'));
                return { success: true, message: `Set content=${route}` };
              }
              // Otherwise fallback to full navigation
              window.location.assign(route);
              return { success: true, message: `Navigated to ${route}` };
            }
          } catch (e: any) {
            // ignore and fall through to error
          }
        }
        return {
          success: false,
          error: `No handlers registered for action type: ${actionType}`,
        };
      }
      
      // Use dynamic import for contextManager
      const { contextManager } = require('./ContextManager');
      
      // Get current page/context from context manager
      const currentContext = contextManager.getCurrentContext();
      
      // Try each handler until one succeeds
      for (const [handlerId, handler] of Object.entries(handlers)) {
        try {
          // Execute the handler with the payload
          const result = await handler(fullPayload);
          
          // If successful, update context and return result
          if (result.success) {
            // Update context with the action and result
            contextManager.updateContext({
              lastActionType: actionType,
              lastActionPayload: fullPayload,
              lastActionResult: result,
              lastActionTimestamp: Date.now(),
            });
            
            console.log(`[ActionDispatcher] Action ${actionType} succeeded with handler ${handlerId}`, result);
            return result;
          }
          
          // Log handler failure but continue trying other handlers
          console.log(`[ActionDispatcher] Handler ${handlerId} failed for ${actionType}`, result);
        } catch (error) {
          // Log error but continue trying other handlers
          console.error(`[ActionDispatcher] Handler ${handlerId} threw error for ${actionType}`, error);
        }
      }
      
      // If we get here, all handlers failed
      return {
        success: false,
        error: `All handlers failed for action type: ${actionType}`,
      };
    } catch (error) {
      // Catch any unexpected errors
      console.error(`[ActionDispatcher] Unexpected error executing ${actionType}`, error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Execute a sequence of actions
   */
  async executeSequence(
    actions: Array<{
      actionType: ActionType;
      payload: Omit<ActionPayloadUnion, 'actionId'>;
    }>
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    
    // Execute actions in sequence
    for (const { actionType, payload } of actions) {
      const result = await this.executeAction(actionType, payload);
      results.push(result);
      
      // Stop sequence if an action fails
      if (!result.success) {
        break;
      }
    }
    
    return results;
  }
}

// Create singleton instance
export const actionDispatcher = new ActionDispatcher(actionRegistry); 