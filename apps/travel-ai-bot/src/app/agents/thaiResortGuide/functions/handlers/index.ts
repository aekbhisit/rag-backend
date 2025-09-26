/**
 * Thai Resort Guide Handlers Index
 * All function handlers for the Thai Resort Guide
 */

// Export all handler groups
export * from './resort';
export * from './skill/knowledge-search';
export * from './ui/navigation';

// Export handler objects
export { RESORT_HANDLERS } from './resort';

// Export all handlers combined
import { RESORT_HANDLERS } from './resort';
import { thaiResortKnowledgeSearchHandler } from './skill/knowledge-search';
import { thaiResortNavigateToMainHandler } from './ui/navigation';

export const ALL_THAI_RESORT_HANDLERS = {
  ...RESORT_HANDLERS,
  knowledgeSearch: thaiResortKnowledgeSearchHandler,
  navigateToMain: thaiResortNavigateToMainHandler,
}; 