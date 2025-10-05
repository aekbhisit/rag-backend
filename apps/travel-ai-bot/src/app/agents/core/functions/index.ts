/**
 * Core Functions Index - New Schema/Handler Structure
 * Organized by: CORE, SKILL, UI
 * Contains both schemas and handlers for reuse
 */

// Export all schemas and handlers
export * from './schemas';
export * from './handlers';

// Re-export important functions for easy access
export { 
  createTransferBackHandler,
  type TransferBackArgs,
  type TransferBackResult 
} from './handlers';

// Note: Dynamic injection utilities removed - transfer functions are now core tools

// Export schema arrays
export { CORE_SCHEMAS, SKILL_SCHEMAS, UI_SCHEMAS, ALL_SCHEMAS } from './schemas';

// Export handler objects
export { CORE_HANDLERS, SKILL_HANDLERS, UI_HANDLERS, ALL_HANDLERS } from './handlers';

// Function group configuration interface
export interface CoreFunctionConfig {
  core: boolean;      // Essential bot intelligence
  skill: boolean;     // Bot skills and capabilities
  ui: boolean;        // Bot action framework functions
}

// Import all schemas and handlers at the top level
import { CORE_SCHEMAS, SKILL_SCHEMAS, UI_SCHEMAS } from './schemas';
import { CORE_HANDLERS, SKILL_HANDLERS, UI_HANDLERS } from './handlers';

// Helper function to get schemas by configuration
export function getCoreSchemasByConfig(config: CoreFunctionConfig) {
  const schemas: any[] = [];
  
  if (config.core) {
    schemas.push(...CORE_SCHEMAS);
  }
  
  if (config.skill) {
    schemas.push(...SKILL_SCHEMAS);
  }
  
  if (config.ui) {
    schemas.push(...UI_SCHEMAS);
  }
  
  return schemas;
}

// Helper function to get handlers by configuration
export function getCoreHandlersByConfig(config: CoreFunctionConfig) {
  const handlers: Record<string, (args: any) => Promise<any>> = {};
  
  if (config.core) {
    Object.assign(handlers, CORE_HANDLERS);
  }
  
  if (config.skill) {
    Object.assign(handlers, SKILL_HANDLERS);
  }
  
  if (config.ui) {
    Object.assign(handlers, UI_HANDLERS);
  }
  
  return handlers;
}

// Legacy compatibility exports (deprecated)
export const getCoreFunctionsByConfig = getCoreSchemasByConfig;
export const getCoreImplementationsByConfig = getCoreHandlersByConfig; 