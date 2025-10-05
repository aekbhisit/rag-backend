/**
 * Core Functions Schemas Index
 * Organized by: CORE, SKILL, UI
 */

// Export all schema groups
export * from './core';
export * from './skill';
export * from './ui';

// Export schema arrays
export { CORE_SCHEMAS } from './core';
export { SKILL_SCHEMAS } from './skill';
export { UI_SCHEMAS } from './ui';

// Export all schemas combined
import { CORE_SCHEMAS } from './core';
import { SKILL_SCHEMAS } from './skill';
import { UI_SCHEMAS } from './ui';

export const ALL_SCHEMAS = [
  ...CORE_SCHEMAS,
  ...SKILL_SCHEMAS,
  ...UI_SCHEMAS,
]; 