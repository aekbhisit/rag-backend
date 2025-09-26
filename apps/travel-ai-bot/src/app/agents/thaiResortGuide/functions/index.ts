/**
 * Thai Resort Guide Functions Index
 * Main entry point for all Thai Resort Guide functions
 * Follows the same pattern as core functions with schema/handler separation
 */

// Export all schemas and handlers
export * from './schemas';
export * from './handlers';

// Export schema arrays
export { RESORT_SCHEMAS, ALL_THAI_RESORT_SCHEMAS } from './schemas';

// Export handler objects
export { RESORT_HANDLERS, ALL_THAI_RESORT_HANDLERS } from './handlers';

// Import core functions for combination
import { 
  CoreFunctionConfig, 
  getCoreSchemasByConfig,
  getCoreHandlersByConfig
} from '../../core/functions';
import { ALL_THAI_RESORT_SCHEMAS } from './schemas';
import { ALL_THAI_RESORT_HANDLERS } from './handlers';

// ===== CORE FUNCTION CONFIGURATION =====
// Configure which core function groups to include
const CORE_FUNCTION_CONFIG: CoreFunctionConfig = {
  core: true,      // Essential bot intelligence (intentionChange, transferAgents, transferBack)
  skill: true,     // Skills (knowledgeSearch, webSearch)
  ui: true,        // UI actions (navigateToMain, navigateToPrevious)
};

// Helper function to get all schemas (core + thai resort specific)
export function getThaiResortSchemas() {
  const coreSchemas = getCoreSchemasByConfig(CORE_FUNCTION_CONFIG);
  return [
    ...coreSchemas,
    ...ALL_THAI_RESORT_SCHEMAS
  ];
}

// Helper function to get all handlers (core + thai resort specific)
export function getThaiResortHandlers() {
  const coreHandlers = getCoreHandlersByConfig(CORE_FUNCTION_CONFIG);
  return {
    ...coreHandlers,
    ...ALL_THAI_RESORT_HANDLERS
  };
}

// Export combined functions for backward compatibility
export const thaiResortFunctions = getThaiResortSchemas();

// ===== HELPER FUNCTIONS =====
// Keep existing helper functions for compatibility
export { 
  getThaiResortViewContext, 
  getAvailableArticles,
  getArticleById,
  THAI_RESORT_FUNCTION_NAMES
} from '../config/functions'; 