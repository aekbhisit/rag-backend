/**
 * UI Schemas Index
 * Actions that work with bot action framework
 */

export { navigateToMainSchema, navigateToPreviousSchema } from './navigation';

// Export all UI schemas as array
import { navigateToMainSchema, navigateToPreviousSchema } from './navigation';

export const UI_SCHEMAS = [
  navigateToMainSchema,
  navigateToPreviousSchema,
]; 