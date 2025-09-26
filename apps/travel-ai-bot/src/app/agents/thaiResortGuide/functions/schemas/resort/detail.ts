/**
 * Resort Schema: Detail Viewing
 * Function for viewing detailed resort information
 */
import { Tool } from '@/app/types';

export const viewResortDetailSchema: Tool = {
  type: 'function',
  name: 'viewResortDetail',
  description: 'View detailed information about a specific Thai resort',
  parameters: {
    type: 'object',
    properties: {
      resortId: {
        type: 'string',
        description: 'The ID of the resort to display'
      }
    },
    required: ['resortId']
  }
}; 