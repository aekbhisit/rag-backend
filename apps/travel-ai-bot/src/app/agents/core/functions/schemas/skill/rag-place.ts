import { Tool } from '@/app/types';

export const ragPlaceSchema: Tool = {
  type: 'function',
  name: 'ragPlace',
  description: 'Search for places using RAG with location-based filtering and semantic search.',
  parameters: {
    type: 'object',
    properties: {
      searchQuery: {
        type: 'string',
        description: 'Search query for places'
      },
      category: {
        type: 'string',
        description: 'Category filter for places'
      },
      lat: {
        type: 'number',
        description: 'Latitude for location-based search'
      },
      long: {
        type: 'number',
        description: 'Longitude for location-based search'
      },
      maxDistanceKm: {
        type: 'number',
        description: 'Maximum distance in kilometers (default: 5)'
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 3)'
      }
    },
    required: ['searchQuery']
  }
};
