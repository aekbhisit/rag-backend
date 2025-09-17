import { Tool } from '@/app/types';

export const ragContextsSchema: Tool = {
  type: 'function',
  name: 'ragContexts',
  description: 'Retrieve relevant contexts from RAG system for enhanced responses.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Query to find relevant contexts'
      },
      topK: {
        type: 'number',
        description: 'Number of contexts to return (default: 5)'
      }
    },
    required: ['query']
  }
};
