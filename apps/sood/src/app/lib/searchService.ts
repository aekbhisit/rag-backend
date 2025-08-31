/**
 * Advanced Search and RAG Service for Ticket Marketplace
 * 
 * Provides intelligent ticket search, recommendations, and discovery using:
 * - Elasticsearch for full-text search and filtering
 * - Vector embeddings for semantic similarity
 * - RAG (Retrieval Augmented Generation) for contextual recommendations
 * - Machine learning for personalized suggestions
 */

import { Client } from '@elastic/elasticsearch';
import { 
  Ticket, 
  SearchCriteria, 
  AIRecommendation, 
  TicketCategory,
  UserProfile 
} from '@/app/types/marketplace';
// import { callOai } from './callOai'; // Mock for development

interface SearchConfig {
  elasticsearchUrl: string;
  indexName: string;
  enableMLRecommendations: boolean;
  enableVectorSearch: boolean;
  maxResults: number;
}

interface SearchResult {
  tickets: Ticket[];
  totalCount: number;
  facets: SearchFacets;
  suggestions: string[];
  executionTime: number;
}

interface SearchFacets {
  categories: Record<TicketCategory, number>;
  cities: Record<string, number>;
  venues: Record<string, number>;
  priceRanges: Array<{
    min: number;
    max: number;
    count: number;
    label: string;
  }>;
  dateRanges: Array<{
    from: string;
    to: string;
    count: number;
    label: string;
  }>;
}

interface RecommendationContext {
  userId?: string;
  userProfile?: UserProfile;
  searchHistory: SearchCriteria[];
  viewHistory: string[]; // Ticket IDs
  purchaseHistory: string[]; // Ticket IDs
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

const DEFAULT_CONFIG: SearchConfig = {
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  indexName: 'tickets',
  enableMLRecommendations: true,
  enableVectorSearch: true,
  maxResults: 100
};

/**
 * Main Search Service Class
 */
export class SearchService {
  private client: Client;
  private config: SearchConfig;

  constructor(config: Partial<SearchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new Client({ node: this.config.elasticsearchUrl });
    this.initializeIndex();
  }

  /**
   * Initialize Elasticsearch index with proper mappings
   */
  private async initializeIndex(): Promise<void> {
    try {
      const indexExists = await this.client.indices.exists({
        index: this.config.indexName
      });

      if (!indexExists) {
        await this.client.indices.create({
          index: this.config.indexName,
          body: this.getIndexMapping()
        });
      }
    } catch (error) {
      console.error('Failed to initialize search index:', error);
    }
  }

  /**
   * Get Elasticsearch mapping for ticket index
   */
  private getIndexMapping() {
    return {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          sellerId: { type: 'keyword' },
          title: { 
            type: 'text',
            analyzer: 'standard',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          description: { 
            type: 'text',
            analyzer: 'standard'
          },
          category: { type: 'keyword' },
          'event.name': { 
            type: 'text',
            analyzer: 'standard',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          'event.date': { type: 'date' },
          'event.performer': { 
            type: 'text',
            analyzer: 'standard',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          'location.venue': { 
            type: 'text',
            analyzer: 'standard',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          'location.city': { type: 'keyword' },
          'location.coordinates': { type: 'geo_point' },
          'pricing.sellingPrice': { type: 'float' },
          'pricing.currency': { type: 'keyword' },
          'pricing.negotiable': { type: 'boolean' },
          quantity: { type: 'integer' },
          condition: { type: 'keyword' },
          verificationStatus: { type: 'keyword' },
          status: { type: 'keyword' },
          'metadata.createdAt': { type: 'date' },
          'metadata.views': { type: 'integer' },
          'metadata.favorites': { type: 'integer' },
          tags: { type: 'keyword' },
          // Vector embedding for semantic search
          embedding: {
            type: 'dense_vector',
            dims: 1536 // OpenAI embedding dimensions
          }
        }
      }
    };
  }

  /**
   * Index a ticket for search
   */
  async indexTicket(ticket: Ticket): Promise<void> {
    try {
      // Generate embedding for semantic search
      const embedding = await this.generateEmbedding(ticket);

      await this.client.index({
        index: this.config.indexName,
        id: ticket.id,
        body: {
          ...ticket,
          embedding
        }
      });

      // Refresh index for immediate availability
      await this.client.indices.refresh({
        index: this.config.indexName
      });

    } catch (error) {
      console.error(`Failed to index ticket ${ticket.id}:`, error);
      throw error;
    }
  }

  /**
   * Remove ticket from search index
   */
  async removeTicket(ticketId: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.config.indexName,
        id: ticketId
      });
    } catch (error) {
      console.error(`Failed to remove ticket ${ticketId}:`, error);
    }
  }

  /**
   * Search tickets with advanced filtering and ranking
   */
  async searchTickets(
    criteria: SearchCriteria,
    context?: RecommendationContext
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      const query = await this.buildSearchQuery(criteria, context);
      
      const response = await this.client.search({
        index: this.config.indexName,
        body: query,
        size: Math.min(criteria.sortBy === 'RELEVANCE' ? 50 : this.config.maxResults, this.config.maxResults)
      });

      const tickets = response.body.hits.hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score
      }));

      // Get facets for filtering UI
      const facets = this.extractFacets(response.body.aggregations);

      // Generate search suggestions
      const suggestions = await this.generateSearchSuggestions(criteria, tickets.length);

      const executionTime = Date.now() - startTime;

      return {
        tickets,
        totalCount: response.body.hits.total.value,
        facets,
        suggestions,
        executionTime
      };

    } catch (error) {
      console.error('Search failed:', error);
      throw new Error('Search service unavailable');
    }
  }

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(
    userId: string,
    context: RecommendationContext,
    maxResults: number = 10
  ): Promise<AIRecommendation[]> {
    try {
      // Get user's interaction history
      const userInteractions = await this.getUserInteractions(userId);
      
      // Generate contextual prompt for AI recommendations
      const prompt = this.buildRecommendationPrompt(context, userInteractions);
      
      // Get AI-powered recommendations
      const aiRecommendations = await this.getAIRecommendations(prompt, context);
      
      // Combine with collaborative filtering
      const collaborativeRecs = await this.getCollaborativeRecommendations(userId, context);
      
      // Merge and rank recommendations
      const mergedRecs = this.mergeRecommendations(aiRecommendations, collaborativeRecs);
      
      return mergedRecs.slice(0, maxResults);

    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return [];
    }
  }

  /**
   * Semantic search using vector embeddings
   */
  async semanticSearch(
    query: string,
    filters: Partial<SearchCriteria> = {},
    limit: number = 20
  ): Promise<Ticket[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(query);
      
      const searchQuery = {
        query: {
          bool: {
            must: [{
              script_score: {
                query: { match_all: {} },
                script: {
                  source: "cosineSimilarity(params.queryVector, 'embedding') + 1.0",
                  params: {
                    queryVector: queryEmbedding
                  }
                }
              }
            }],
            filter: this.buildFilters(filters)
          }
        },
        size: limit
      };

      const response = await this.client.search({
        index: this.config.indexName,
        body: searchQuery
      });

      return response.body.hits.hits.map((hit: any) => hit._source);

    } catch (error) {
      console.error('Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Find similar tickets based on content
   */
  async findSimilarTickets(ticketId: string, limit: number = 10): Promise<Ticket[]> {
    try {
      const ticket = await this.getTicketById(ticketId);
      if (!ticket) return [];

      // Use More Like This query
      const query = {
        query: {
          bool: {
            must: [{
              more_like_this: {
                fields: ['title', 'description', 'event.name', 'event.performer'],
                like: [{ _index: this.config.indexName, _id: ticketId }],
                min_term_freq: 1,
                max_query_terms: 20
              }
            }],
            must_not: [{ term: { id: ticketId } }],
            filter: [
              { term: { status: 'ACTIVE' } },
              { term: { verificationStatus: 'VERIFIED' } }
            ]
          }
        },
        size: limit
      };

      const response = await this.client.search({
        index: this.config.indexName,
        body: query
      });

      return response.body.hits.hits.map((hit: any) => hit._source);

    } catch (error) {
      console.error('Failed to find similar tickets:', error);
      return [];
    }
  }

  /**
   * Get trending tickets based on views, favorites, and recency
   */
  async getTrendingTickets(
    category?: TicketCategory,
    location?: string,
    timeframe: '1d' | '7d' | '30d' = '7d'
  ): Promise<Ticket[]> {
    try {
      const now = new Date();
      const timeframeDays = timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : 30;
      const since = new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

      const query = {
        query: {
          bool: {
            must: [
              { range: { 'metadata.createdAt': { gte: since.toISOString() } } },
              { term: { status: 'ACTIVE' } }
            ],
            ...(category && { filter: [{ term: { category } }] }),
            ...(location && { filter: [{ term: { 'location.city': location } }] })
          }
        },
        sort: [
          {
            _script: {
              type: 'number',
              script: {
                source: `
                  def views = doc['metadata.views'].value;
                  def favorites = doc['metadata.favorites'].value;
                  def recency = (System.currentTimeMillis() - doc['metadata.createdAt'].value.millis) / 86400000.0;
                  return (views * 0.4 + favorites * 0.4) / Math.max(1, recency * 0.2);
                `
              },
              order: 'desc'
            }
          }
        ],
        size: 20
      };

      const response = await this.client.search({
        index: this.config.indexName,
        body: query
      });

      return response.body.hits.hits.map((hit: any) => hit._source);

    } catch (error) {
      console.error('Failed to get trending tickets:', error);
      return [];
    }
  }

  // Private helper methods

  private async buildSearchQuery(
    criteria: SearchCriteria,
    context?: RecommendationContext
  ): Promise<any> {
    const must: any[] = [];
    const filter: any[] = [];

    // Text search
    if (criteria.query) {
      must.push({
        multi_match: {
          query: criteria.query,
          fields: [
            'title^3',
            'event.name^2',
            'event.performer^2',
            'description',
            'location.venue^1.5',
            'tags^1.5'
          ],
          fuzziness: 'AUTO',
          prefix_length: 1
        }
      });
    }

    // Add filters
    filter.push(...this.buildFilters(criteria));

    // Location-based boosting
    if (criteria.location?.coordinates) {
      must.push({
        function_score: {
          query: { match_all: {} },
          functions: [{
            gauss: {
              'location.coordinates': {
                origin: criteria.location.coordinates,
                scale: `${criteria.location.radius || 50}km`,
                decay: 0.5
              }
            }
          }],
          boost_mode: 'multiply'
        }
      });
    }

    // Personalization boost
    if (context?.userProfile) {
      const personalizedBoost = this.buildPersonalizationBoost(context.userProfile);
      if (personalizedBoost) {
        must.push(personalizedBoost);
      }
    }

    const query = {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter
        }
      },
      sort: this.buildSort(criteria.sortBy || 'RELEVANCE'),
      aggs: this.buildAggregations()
    };

    return query;
  }

  private buildFilters(criteria: Partial<SearchCriteria>): any[] {
    const filters: any[] = [
      { term: { status: 'ACTIVE' } }
    ];

    if (criteria.category) {
      filters.push({ term: { category: criteria.category } });
    }

    if (criteria.location?.city) {
      filters.push({ term: { 'location.city': criteria.location.city } });
    }

    if (criteria.priceRange) {
      filters.push({
        range: {
          'pricing.sellingPrice': {
            gte: criteria.priceRange.min,
            lte: criteria.priceRange.max
          }
        }
      });
    }

    if (criteria.dateRange) {
      filters.push({
        range: {
          'event.date': {
            gte: criteria.dateRange.from,
            lte: criteria.dateRange.to
          }
        }
      });
    }

    if (criteria.filters?.verifiedOnly) {
      filters.push({ term: { verificationStatus: 'VERIFIED' } });
    }

    if (criteria.filters?.transferable) {
      filters.push({ term: { 'details.transferable': true } });
    }

    return filters;
  }

  private buildSort(sortBy: string): any[] {
    switch (sortBy) {
      case 'PRICE_LOW':
        return [{ 'pricing.sellingPrice': { order: 'asc' } }];
      case 'PRICE_HIGH':
        return [{ 'pricing.sellingPrice': { order: 'desc' } }];
      case 'DATE':
        return [{ 'event.date': { order: 'asc' } }];
      case 'DISTANCE':
        return []; // Requires geo-distance sort
      default:
        return ['_score'];
    }
  }

  private buildAggregations(): any {
    return {
      categories: {
        terms: { field: 'category', size: 10 }
      },
      cities: {
        terms: { field: 'location.city', size: 20 }
      },
      venues: {
        terms: { field: 'location.venue.keyword', size: 15 }
      },
      priceRanges: {
        range: {
          field: 'pricing.sellingPrice',
          ranges: [
            { to: 50, key: 'under_50' },
            { from: 50, to: 100, key: '50_100' },
            { from: 100, to: 250, key: '100_250' },
            { from: 250, to: 500, key: '250_500' },
            { from: 500, key: 'over_500' }
          ]
        }
      }
    };
  }

  private extractFacets(aggregations: any): SearchFacets {
    const facets: SearchFacets = {
      categories: {},
      cities: {},
      venues: {},
      priceRanges: [],
      dateRanges: []
    };

    if (aggregations) {
      // Categories
      if (aggregations.categories) {
        aggregations.categories.buckets.forEach((bucket: any) => {
          facets.categories[bucket.key as TicketCategory] = bucket.doc_count;
        });
      }

      // Cities
      if (aggregations.cities) {
        aggregations.cities.buckets.forEach((bucket: any) => {
          facets.cities[bucket.key] = bucket.doc_count;
        });
      }

      // Venues
      if (aggregations.venues) {
        aggregations.venues.buckets.forEach((bucket: any) => {
          facets.venues[bucket.key] = bucket.doc_count;
        });
      }

      // Price ranges
      if (aggregations.priceRanges) {
        aggregations.priceRanges.buckets.forEach((bucket: any) => {
          facets.priceRanges.push({
            min: bucket.from || 0,
            max: bucket.to || Infinity,
            count: bucket.doc_count,
            label: this.getPriceRangeLabel(bucket.key)
          });
        });
      }
    }

    return facets;
  }

  private getPriceRangeLabel(key: string): string {
    const labels: Record<string, string> = {
      'under_50': 'Under $50',
      '50_100': '$50 - $100',
      '100_250': '$100 - $250',
      '250_500': '$250 - $500',
      'over_500': 'Over $500'
    };
    return labels[key] || key;
  }

  private buildPersonalizationBoost(userProfile: UserProfile): any {
    const boosts: any[] = [];

    // Boost favorite categories
    if (userProfile.preferences.favoriteCategories.length > 0) {
      boosts.push({
        terms: {
          category: userProfile.preferences.favoriteCategories,
          boost: 1.5
        }
      });
    }

    // Boost preferred cities
    if (userProfile.preferences.preferredCities.length > 0) {
      boosts.push({
        terms: {
          'location.city': userProfile.preferences.preferredCities,
          boost: 1.2
        }
      });
    }

    if (boosts.length === 0) return null;

    return {
      function_score: {
        query: { match_all: {} },
        functions: boosts.map(boost => ({
          filter: boost,
          weight: boost.boost
        })),
        score_mode: 'sum',
        boost_mode: 'multiply'
      }
    };
  }

  private async generateEmbedding(ticket: Ticket): Promise<number[]> {
    if (!this.config.enableVectorSearch) return [];

    try {
      const text = `${ticket.title} ${ticket.description} ${ticket.event.name} ${ticket.event.performer} ${ticket.location.venue} ${ticket.category}`;
      
      const response = await callOai({
        model: 'text-embedding-ada-002',
        input: text
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return [];
    }
  }

  private async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const response = await callOai({
        model: 'text-embedding-ada-002',
        input: query
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Failed to generate query embedding:', error);
      return [];
    }
  }

  private async generateSearchSuggestions(
    criteria: SearchCriteria,
    resultCount: number
  ): Promise<string[]> {
    if (resultCount > 0) return [];

    const suggestions: string[] = [];
    
    // Add category-based suggestions
    if (!criteria.category) {
      suggestions.push('Try searching in specific categories like concerts or sports');
    }

    // Add location-based suggestions
    if (!criteria.location) {
      suggestions.push('Add your city to find local events');
    }

    // Add price-based suggestions
    if (!criteria.priceRange) {
      suggestions.push('Set a price range to find tickets in your budget');
    }

    return suggestions.slice(0, 3);
  }

  private buildRecommendationPrompt(
    context: RecommendationContext,
    userInteractions: any
  ): string {
    return `
Based on the user's profile and interaction history, recommend relevant tickets:

User Profile: ${JSON.stringify(context.userProfile?.preferences)}
Recent Searches: ${JSON.stringify(context.searchHistory.slice(-5))}
Recently Viewed: ${JSON.stringify(context.viewHistory.slice(-10))}
Purchase History: ${JSON.stringify(context.purchaseHistory)}

Provide ticket recommendations with reasoning.
    `;
  }

  private async getAIRecommendations(
    prompt: string,
    context: RecommendationContext
  ): Promise<AIRecommendation[]> {
    try {
      const response = await callOai({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      });

      // Parse AI response and convert to recommendations
      // This is simplified - in production you'd have more sophisticated parsing
      return [];
    } catch (error) {
      console.error('AI recommendations failed:', error);
      return [];
    }
  }

  private async getCollaborativeRecommendations(
    userId: string,
    context: RecommendationContext
  ): Promise<AIRecommendation[]> {
    // Implement collaborative filtering based on similar users
    return [];
  }

  private mergeRecommendations(
    aiRecs: AIRecommendation[],
    collaborativeRecs: AIRecommendation[]
  ): AIRecommendation[] {
    // Merge and deduplicate recommendations
    const merged = [...aiRecs, ...collaborativeRecs];
    return merged.sort((a, b) => b.score - a.score);
  }

  private async getUserInteractions(userId: string): Promise<any> {
    // Fetch user's search and interaction history from database
    return {};
  }

  private async getTicketById(ticketId: string): Promise<Ticket | null> {
    try {
      const response = await this.client.get({
        index: this.config.indexName,
        id: ticketId
      });
      return response.body._source;
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const searchService = new SearchService();

// Export utility functions
export const searchUtils = {
  buildSimpleQuery: (query: string, category?: TicketCategory) => ({
    query,
    category,
    sortBy: 'RELEVANCE' as const
  }),
  
  formatSearchResults: (results: SearchResult) => ({
    ...results,
    formattedCount: results.totalCount.toLocaleString(),
    hasMore: results.tickets.length < results.totalCount
  })
};