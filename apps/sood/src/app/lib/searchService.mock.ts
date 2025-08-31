/**
 * Mock Search Service for Development
 * Provides the same interface as the full search service but with mock implementations
 */

import { 
  Ticket, 
  SearchCriteria, 
  SearchResult, 
  TicketCategory, 
  AIRecommendation,
  RecommendationContext 
} from '@/app/types/marketplace';

interface SearchConfig {
  elasticsearchUrl: string;
  indexName: string;
  maxResults: number;
  aiModel: string;
}

const DEFAULT_CONFIG: SearchConfig = {
  elasticsearchUrl: 'http://localhost:9200',
  indexName: 'tickets',
  maxResults: 50,
  aiModel: 'gpt-4'
};

class MockSearchService {
  private config: SearchConfig;
  private mockTickets: Ticket[] = [];

  constructor(config: Partial<SearchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeMockData();
  }

  /**
   * Initialize with mock ticket data
   */
  private initializeMockData(): void {
    this.mockTickets = [
      {
        id: 'ticket_1',
        sellerId: 'seller_1',
        title: 'Taylor Swift Concert - Premium Seats',
        description: 'Amazing floor seats for The Eras Tour',
        category: 'CONCERT',
        event: {
          name: 'Taylor Swift - The Eras Tour',
          date: '2024-09-15T19:30:00Z',
          performer: 'Taylor Swift'
        },
        location: {
          venue: 'MetLife Stadium',
          address: '1 MetLife Stadium Dr',
          city: 'East Rutherford',
          country: 'USA'
        },
        details: {
          section: 'Floor',
          row: '5',
          seat: '101-102',
          originalPrice: 350,
          transferable: true
        },
        pricing: {
          originalPrice: 350,
          sellingPrice: 450,
          currency: 'USD',
          negotiable: true
        },
        quantity: 2,
        condition: 'EXCELLENT',
        images: [],
        verificationStatus: 'VERIFIED',
        status: 'ACTIVE',
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          views: 125,
          favorites: 18
        },
        tags: ['pop', 'stadium', 'tour']
      },
      {
        id: 'ticket_2',
        sellerId: 'seller_2',
        title: 'Giants vs Cowboys - Football',
        description: 'Great seats for this rivalry game',
        category: 'SPORTS',
        event: {
          name: 'New York Giants vs Dallas Cowboys',
          date: '2024-09-22T13:00:00Z'
        },
        location: {
          venue: 'MetLife Stadium',
          address: '1 MetLife Stadium Dr',
          city: 'East Rutherford',
          country: 'USA'
        },
        details: {
          section: '133',
          row: '12',
          seat: '15-16',
          originalPrice: 150,
          transferable: true
        },
        pricing: {
          originalPrice: 150,
          sellingPrice: 175,
          currency: 'USD',
          negotiable: false
        },
        quantity: 2,
        condition: 'EXCELLENT',
        images: [],
        verificationStatus: 'VERIFIED',
        status: 'ACTIVE',
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          views: 89,
          favorites: 12
        },
        tags: ['nfl', 'football', 'sports']
      }
    ];
  }

  /**
   * Initialize Elasticsearch index (mock)
   */
  async initializeIndex(): Promise<void> {
    console.log('Mock: Search index initialized');
  }

  /**
   * Index a ticket for search (mock)
   */
  async indexTicket(ticket: Ticket): Promise<void> {
    const existingIndex = this.mockTickets.findIndex(t => t.id === ticket.id);
    if (existingIndex >= 0) {
      this.mockTickets[existingIndex] = ticket;
    } else {
      this.mockTickets.push(ticket);
    }
    console.log(`Mock: Indexed ticket ${ticket.id}`);
  }

  /**
   * Remove ticket from search index (mock)
   */
  async removeTicket(ticketId: string): Promise<void> {
    this.mockTickets = this.mockTickets.filter(t => t.id !== ticketId);
    console.log(`Mock: Removed ticket ${ticketId}`);
  }

  /**
   * Search tickets with filtering
   */
  async searchTickets(
    criteria: SearchCriteria,
    context?: RecommendationContext
  ): Promise<SearchResult> {
    let results = [...this.mockTickets];

    // Filter by category
    if (criteria.category) {
      results = results.filter(t => t.category === criteria.category);
    }

    // Filter by location
    if (criteria.location?.city) {
      results = results.filter(t => 
        t.location.city.toLowerCase().includes(criteria.location?.city?.toLowerCase() || '')
      );
    }

    // Filter by text query
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      results = results.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.event.name.toLowerCase().includes(query) ||
        (t.event.performer && t.event.performer.toLowerCase().includes(query))
      );
    }

    // Filter by price range
    if (criteria.priceRange) {
      results = results.filter(t => 
        t.pricing.sellingPrice >= (criteria.priceRange?.min || 0) &&
        t.pricing.sellingPrice <= (criteria.priceRange?.max || Infinity)
      );
    }

    // Apply filters
    if (criteria.filters?.verifiedOnly) {
      results = results.filter(t => t.verificationStatus === 'VERIFIED');
    }

    // Sort results
    switch (criteria.sortBy) {
      case 'PRICE_LOW':
        results.sort((a, b) => a.pricing.sellingPrice - b.pricing.sellingPrice);
        break;
      case 'PRICE_HIGH':
        results.sort((a, b) => b.pricing.sellingPrice - a.pricing.sellingPrice);
        break;
      case 'DATE':
        results.sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());
        break;
      default: // RELEVANCE
        results.sort((a, b) => (b.metadata.views || 0) - (a.metadata.views || 0));
    }

    return {
      tickets: results.slice(0, 20),
      totalCount: results.length,
      facets: {
        categories: {
          CONCERT: this.mockTickets.filter(t => t.category === 'CONCERT').length,
          SPORTS: this.mockTickets.filter(t => t.category === 'SPORTS').length,
          THEATER: this.mockTickets.filter(t => t.category === 'THEATER').length,
          COMEDY: 0,
          FESTIVAL: 0,
          CONFERENCE: 0,
          OTHER: 0
        },
        cities: { 'East Rutherford': 2, 'New York': 1 },
        priceRanges: { '0-100': 0, '100-300': 1, '300+': 1 },
        venues: { 'MetLife Stadium': 2 }
      },
      suggestions: ['concert tickets', 'sports tickets', 'taylor swift'],
      executionTime: 25
    };
  }

  /**
   * Get recommendations (mock)
   */
  async getRecommendations(
    userId: string,
    context: RecommendationContext,
    maxResults: number = 10
  ): Promise<AIRecommendation[]> {
    return [
      {
        ticketId: 'ticket_1',
        score: 0.95,
        reasons: ['concert preference', 'popular artist', 'verified ticket'],
        category: 'CATEGORY_MATCH'
      },
      {
        ticketId: 'ticket_2',
        score: 0.8,
        reasons: ['sports preference', 'price match', 'local venue'],
        category: 'PRICE_MATCH'
      }
    ];
  }

  /**
   * Find similar tickets (mock)
   */
  async findSimilarTickets(ticketId: string, maxResults: number = 10): Promise<Ticket[]> {
    const ticket = this.mockTickets.find(t => t.id === ticketId);
    if (!ticket) return [];

    return this.mockTickets
      .filter(t => t.id !== ticketId && t.category === ticket.category)
      .slice(0, maxResults);
  }

  /**
   * Get trending tickets (mock)
   */
  async getTrendingTickets(
    category?: TicketCategory,
    location?: string,
    timeframe: '1d' | '7d' | '30d' = '7d'
  ): Promise<Ticket[]> {
    let trending = [...this.mockTickets];

    if (category) {
      trending = trending.filter(t => t.category === category);
    }

    if (location) {
      trending = trending.filter(t => 
        t.location.city.toLowerCase().includes(location.toLowerCase())
      );
    }

    return trending
      .sort((a, b) => (b.metadata.views || 0) - (a.metadata.views || 0))
      .slice(0, 10);
  }

  /**
   * Generate search suggestions (mock)
   */
  async generateSearchSuggestions(criteria: SearchCriteria, resultCount: number): Promise<string[]> {
    return [
      'taylor swift concert',
      'football tickets',
      'broadway shows',
      'comedy shows',
      'music festivals'
    ];
  }
}

// Export singleton instance
export const searchService = new MockSearchService();