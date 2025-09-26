import { Tool } from '@/app/types';

export const ragSearchSchema: Tool = {
  type: 'function',
  name: 'ragSearch',
  description: 'Search the RAG index for relevant passages using a query string.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Natural language query' },
      topK: { type: 'number', description: 'Number of passages to return (default 5)' },
      filters: { type: 'object', description: 'Optional metadata filter object' }
    },
    required: ['query']
  }
};
