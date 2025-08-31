/**
 * Resort Schemas Index
 * Thai Resort specific function schemas
 */

export { viewResortCategorySchema } from './category';
export { viewResortDetailSchema } from './detail';
export { searchResortsSchema } from './search';
export { compareResortsSchema } from './compare';

// Export all resort schemas as array
import { viewResortCategorySchema } from './category';
import { viewResortDetailSchema } from './detail';
import { searchResortsSchema } from './search';
import { compareResortsSchema } from './compare';

export const RESORT_SCHEMAS = [
  viewResortCategorySchema,
  viewResortDetailSchema,
  searchResortsSchema,
  compareResortsSchema,
]; 