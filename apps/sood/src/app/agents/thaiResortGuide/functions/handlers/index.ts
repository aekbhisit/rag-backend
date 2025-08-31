/**
 * Thai Resort Guide Handlers Index
 * All function handlers for the Thai Resort Guide
 */

// Export all handler groups
export * from './resort';

// Export handler objects
export { RESORT_HANDLERS } from './resort';

// Export all handlers combined
import { RESORT_HANDLERS } from './resort';

export const ALL_THAI_RESORT_HANDLERS = {
  ...RESORT_HANDLERS,
}; 