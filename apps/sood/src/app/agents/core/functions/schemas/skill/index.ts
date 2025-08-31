/**
 * Skill Schemas Index
 * Skills to extend agent availability
 */

export { knowledgeSearchSchema } from './knowledge-search';
export { webSearchSchema } from './web-search';

// Export all skill schemas as array
import { knowledgeSearchSchema } from './knowledge-search';
import { webSearchSchema } from './web-search';

export const SKILL_SCHEMAS = [
  knowledgeSearchSchema,
  webSearchSchema,
]; 