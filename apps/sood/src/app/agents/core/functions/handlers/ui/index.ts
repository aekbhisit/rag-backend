/**
 * UI Handlers Index
 * Actions that work with bot action framework
 */

export { navigateToMainHandler, navigateToPreviousHandler } from './navigation';

// Export all UI handlers as object
import { navigateToMainHandler, navigateToPreviousHandler } from './navigation';

export const UI_HANDLERS = {
  navigateToMain: navigateToMainHandler,
  navigateToPrevious: navigateToPreviousHandler,
}; 