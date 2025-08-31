/**
 * Skill Handlers Index
 * Skills to extend agent availability
 */

export { knowledgeSearchHandler } from './knowledge-search';
export { webSearchHandler } from './web-search';

// Export all skill handlers as object
import { knowledgeSearchHandler } from './knowledge-search';
import { webSearchHandler } from './web-search';

export const SKILL_HANDLERS = {
  knowledgeSearch: knowledgeSearchHandler,
  webSearch: webSearchHandler,
}; 