/**
 * Resort Schema: Comparison
 * Function for comparing multiple Thai resorts
 */
import { Tool } from '@/app/types';

export const compareResortsSchema: Tool = {
  type: 'function',
  name: 'compareResorts',
  description: 'Compare multiple Thai resorts',
  parameters: {
    type: 'object',
    properties: {
      resortIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of resort IDs to compare (2-4 resorts)'
      }
    },
    required: ['resortIds']
  }
}; 