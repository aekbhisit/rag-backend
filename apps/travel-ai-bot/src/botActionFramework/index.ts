/**
 * Bot Action Framework
 * Main entry point for the framework
 */

// Core types
export * from './ActionTypes';

// Core classes and interfaces
export { 
  ActionRegistry,
  actionRegistry 
} from './ActionRegistry';
export type { IActionRegistry, ActionHandler } from './ActionRegistry';

export { 
  ActionDispatcher,
  actionDispatcher 
} from './ActionDispatcher';
export type { IActionDispatcher } from './ActionDispatcher';

export { 
  ContextManager,
  contextManager 
} from './ContextManager';
export type { IContextManager, AppContext } from './ContextManager';

// React integration
export { 
  ActionProvider, 
  useActionContext 
} from './ActionContext';

// Hooks
export { useAction } from './hooks/useAction';

// OpenAI function call integration
export { 
  isBotAction, 
  handleFunctionCall, 
  getBotActionFunctionDefinitions
} from './FunctionCallMapper';
export type { FunctionCallParams, FunctionCallResult } from './FunctionCallMapper';

/**
 * Initialize the Bot Action Framework
 * Call this when your application starts
 */
export function initializeBotActionFramework() {
  console.log('[BotActionFramework] Initializing framework');
  
  // Import contextManager to avoid linter error
  const { contextManager } = require('./ContextManager');
  
  // Set up any global listeners or state
  contextManager.updateContext({
    // Initial context values
    currentPage: 'home',
    lastActionTimestamp: Date.now(),
  });
  
  // Import these to avoid linter errors
  const { actionRegistry } = require('./ActionRegistry');
  const { actionDispatcher } = require('./ActionDispatcher');
  
  return {
    actionRegistry,
    actionDispatcher,
    contextManager,
  };
} 