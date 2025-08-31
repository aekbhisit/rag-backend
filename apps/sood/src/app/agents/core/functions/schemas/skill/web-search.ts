/**
 * Skill Schema: Web Search
 * Skill to extend agent availability with web search capabilities
 */
import { Tool } from '@/app/types';

export const webSearchSchema: Tool = {
  type: 'function',
  name: 'webSearch',
  description: 'Search the web for real-time information and current data relevant to user queries.',
  parameters: {
    type: 'object',
    properties: {
      searchQuery: {
        type: 'string',
        description: 'The search query to find information on the web'
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5)'
      },
      searchType: {
        type: 'string',
        enum: ['general', 'news', 'images', 'videos'],
        description: 'Type of web search to perform (default: general)'
      }
    },
    required: ['searchQuery']
  }
}; 