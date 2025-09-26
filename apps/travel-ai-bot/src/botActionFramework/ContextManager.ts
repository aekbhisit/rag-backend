/**
 * Bot Action Framework
 * ContextManager - Tracks application state and action history
 */

import { ActionType, ActionPayloadUnion, ActionResult } from './ActionTypes';

/**
 * Interface for the application context
 */
export interface AppContext {
  // Current page and state information
  currentPage?: string;
  currentPageParams?: Record<string, any>;
  
  // UI state
  activeModal?: string;
  selectedItems?: Record<string, string[]>;
  
  // Last action information
  lastActionType?: ActionType;
  lastActionPayload?: ActionPayloadUnion;
  lastActionResult?: ActionResult;
  lastActionTimestamp?: number;
  
  // Custom context properties
  [key: string]: any;
}

/**
 * Interface for the context manager
 */
export interface IContextManager {
  /**
   * Get the current application context
   */
  getCurrentContext: () => AppContext;
  
  /**
   * Update the application context
   * @param context Partial context to merge with current context
   */
  updateContext: (context: Partial<AppContext>) => void;
  
  /**
   * Set page context when navigating to a new page
   * @param page The page name
   * @param params Optional page parameters
   */
  setCurrentPage: (page: string, params?: Record<string, any>) => void;
  
  /**
   * Add item to selected items list
   * @param itemType Type of item
   * @param itemId Item identifier
   * @param replace Replace existing items of this type
   */
  addSelectedItem: (itemType: string, itemId: string, replace?: boolean) => void;
  
  /**
   * Remove item from selected items list
   * @param itemType Type of item
   * @param itemId Item identifier
   */
  removeSelectedItem: (itemType: string, itemId: string) => void;
  
  /**
   * Get action history (recent actions)
   * @param limit Maximum number of actions to return
   */
  getActionHistory: (limit?: number) => {
    actionType: ActionType;
    payload: ActionPayloadUnion;
    result: ActionResult;
    timestamp: number;
  }[];
  
  /**
   * Clear the current context
   */
  clearContext: () => void;
}

/**
 * Implementation of the context manager
 */
export class ContextManager implements IContextManager {
  private context: AppContext = {};
  
  // Store action history for context-aware decisions
  private actionHistory: {
    actionType: ActionType;
    payload: ActionPayloadUnion;
    result: ActionResult;
    timestamp: number;
  }[] = [];
  
  // Maximum history items to store
  private readonly MAX_HISTORY_ITEMS = 20;
  
  /**
   * Get the current application context
   */
  getCurrentContext(): AppContext {
    return { ...this.context };
  }
  
  /**
   * Update the application context
   */
  updateContext(newContext: Partial<AppContext>): void {
    // Merge new context with existing
    this.context = {
      ...this.context,
      ...newContext,
    };
    
    // If this is a new action, add it to history
    if (newContext.lastActionType && newContext.lastActionPayload && newContext.lastActionResult) {
      this.addToActionHistory(
        newContext.lastActionType,
        newContext.lastActionPayload,
        newContext.lastActionResult,
        newContext.lastActionTimestamp || Date.now()
      );
    }
    
    // Log context update
    console.log('[ContextManager] Context updated', this.context);
  }
  
  /**
   * Set page context when navigating to a new page
   */
  setCurrentPage(page: string, params?: Record<string, any>): void {
    this.updateContext({
      currentPage: page,
      currentPageParams: params || {},
    });
  }
  
  /**
   * Add item to selected items list
   */
  addSelectedItem(itemType: string, itemId: string, replace = false): void {
    const selectedItems = this.context.selectedItems || {};
    
    if (replace) {
      // Replace all items of this type
      this.updateContext({
        selectedItems: {
          ...selectedItems,
          [itemType]: [itemId],
        },
      });
    } else {
      // Add to existing items
      const existingItems = selectedItems[itemType] || [];
      
      if (!existingItems.includes(itemId)) {
        this.updateContext({
          selectedItems: {
            ...selectedItems,
            [itemType]: [...existingItems, itemId],
          },
        });
      }
    }
  }
  
  /**
   * Remove item from selected items list
   */
  removeSelectedItem(itemType: string, itemId: string): void {
    const selectedItems = this.context.selectedItems || {};
    const existingItems = selectedItems[itemType] || [];
    
    if (existingItems.includes(itemId)) {
      this.updateContext({
        selectedItems: {
          ...selectedItems,
          [itemType]: existingItems.filter(id => id !== itemId),
        },
      });
    }
  }
  
  /**
   * Get action history (recent actions)
   */
  getActionHistory(limit = this.MAX_HISTORY_ITEMS): {
    actionType: ActionType;
    payload: ActionPayloadUnion;
    result: ActionResult;
    timestamp: number;
  }[] {
    return this.actionHistory.slice(0, limit);
  }
  
  /**
   * Clear the current context
   */
  clearContext(): void {
    this.context = {};
    console.log('[ContextManager] Context cleared');
  }
  
  /**
   * Add an action to the history
   */
  private addToActionHistory(
    actionType: ActionType,
    payload: ActionPayloadUnion,
    result: ActionResult,
    timestamp: number
  ): void {
    // Add to front of array
    this.actionHistory.unshift({
      actionType,
      payload,
      result,
      timestamp,
    });
    
    // Trim history to max size
    if (this.actionHistory.length > this.MAX_HISTORY_ITEMS) {
      this.actionHistory = this.actionHistory.slice(0, this.MAX_HISTORY_ITEMS);
    }
  }
}

// Create singleton instance
export const contextManager = new ContextManager(); 