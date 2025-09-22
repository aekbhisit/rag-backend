/**
 * UI Handlers Index
 * Actions that work with bot action framework
 */

export { navigateToMainHandler, navigateToPreviousHandler, navigateHandler } from './navigation';
export { extractContentHandler } from './extract-content';

// Export all UI handlers as object
import { navigateToMainHandler, navigateToPreviousHandler, navigateHandler } from './navigation';
import { extractContentHandler } from './extract-content';

export const UI_HANDLERS = {
  navigateToMain: navigateToMainHandler,
  navigateToPrevious: navigateToPreviousHandler,
  navigate: navigateHandler,
  extractContent: extractContentHandler,
}; 