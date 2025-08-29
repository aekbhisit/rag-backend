/**
 * Resort Handlers Index
 * Thai Resort specific function handlers
 */

export { viewResortCategoryHandler, type ViewResortCategoryArgs } from './category';
export { viewResortDetailHandler, type ViewResortDetailArgs } from './detail';
export { searchResortsHandler, type SearchResortsArgs } from './search';
export { compareResortsHandler, type CompareResortsArgs } from './compare';

// Export all resort handlers as object
import { viewResortCategoryHandler } from './category';
import { viewResortDetailHandler } from './detail';
import { searchResortsHandler } from './search';
import { compareResortsHandler } from './compare';

export const RESORT_HANDLERS = {
  viewResortCategory: viewResortCategoryHandler,
  viewResortDetail: viewResortDetailHandler,
  searchResorts: searchResortsHandler,
  compareResorts: compareResortsHandler,
}; 