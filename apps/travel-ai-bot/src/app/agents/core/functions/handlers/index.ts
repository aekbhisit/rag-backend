/**
 * Core Functions Handlers Index
 * Organized by: CORE, SKILL, UI
 */

// Export all handler groups
export * from './core';
export * from './skill';
export * from './ui';

// Re-export important types and functions for easy access
export { 
  createTransferBackHandler,
  type TransferBackArgs,
  type TransferBackResult 
} from './core';

// Export handler objects
export { CORE_HANDLERS } from './core';
export { SKILL_HANDLERS } from './skill';
export { UI_HANDLERS } from './ui';

// Export all handlers combined
import { CORE_HANDLERS } from './core';
import { SKILL_HANDLERS } from './skill';
import { UI_HANDLERS } from './ui';

export const ALL_HANDLERS = {
  ...CORE_HANDLERS,
  ...SKILL_HANDLERS,
  ...UI_HANDLERS,
}; 