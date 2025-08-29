/**
 * Resort Schema: Category Viewing
 * Function for viewing resort categories
 */
import { Tool } from '@/app/types';
import { CATEGORIES } from '../../../data/resortData';

export const viewResortCategorySchema: Tool = {
  type: 'function',
  name: 'viewResortCategory',
  description: 'View a specific category of Thai resorts',
  parameters: {
    type: 'object',
    properties: {
      categoryId: {
        type: 'string',
        description: 'The ID of the resort category to view',
        enum: Object.values(CATEGORIES)
      }
    },
    required: ['categoryId']
  }
}; 