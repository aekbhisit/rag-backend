/**
 * Skill Schema: Knowledge Search
 * Skill to extend agent availability with knowledge base search
 */
import { Tool } from '@/app/types';

export const knowledgeSearchSchema: Tool = {
  type: 'function',
  name: 'knowledgeSearch',
  description: 'Search the knowledge base for information relevant to user queries.',
  parameters: {
    type: 'object',
    properties: {
      searchQuery: {
        type: 'string',
        description: 'The search query to find information in the knowledge base'
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5)'
      }
    },
    required: ['searchQuery']
  }
}; 