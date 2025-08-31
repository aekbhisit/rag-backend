/**
 * Resort Schema: Search
 * Function for searching Thai resorts
 */
import { Tool } from '@/app/types';

export const searchResortsSchema: Tool = {
  type: 'function',
  name: 'searchResorts',
  description: 'Search for Thai resorts based on criteria',
  parameters: {
    type: 'object',
    properties: {
      searchQuery: {
        type: 'string',
        description: 'Search terms for finding resorts'
      },
      location: {
        type: 'string',
        description: 'Preferred location in Thailand'
      },
      priceRange: {
        type: 'string',
        enum: ['budget', 'mid-range', 'luxury'],
        description: 'Price range preference'
      }
    },
    required: ['searchQuery']
  }
}; 