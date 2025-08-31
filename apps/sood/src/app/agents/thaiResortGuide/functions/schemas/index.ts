/**
 * Thai Resort Guide Schemas Index
 * All function schemas for the Thai Resort Guide
 */

// Export all schema groups
export * from './resort';

// Export schema arrays
export { RESORT_SCHEMAS } from './resort';

// Export all schemas combined
import { RESORT_SCHEMAS } from './resort';

export const ALL_THAI_RESORT_SCHEMAS = [
  ...RESORT_SCHEMAS,
]; 