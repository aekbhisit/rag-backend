/**
 * Ticket Search API Endpoint
 * 
 * Advanced search with filtering, sorting, and AI-powered recommendations.
 * GET /api/tickets/search
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchService } from '@/app/lib/searchService.mock';
import { 
  SearchCriteriaSchema, 
  TicketSearchResponse, 
  APIResponse,
  SearchCriteria 
} from '@/app/types/marketplace';

// Enhanced search parameters schema
const SearchParamsSchema = z.object({
  // Text search
  q: z.string().optional(), // query
  query: z.string().optional(), // alias for q
  
  // Category filtering
  category: z.enum(['CONCERT', 'SPORTS', 'THEATER', 'COMEDY', 'FESTIVAL', 'CONFERENCE', 'OTHER']).optional(),
  
  // Location filtering
  city: z.string().optional(),
  venue: z.string().optional(),
  lat: z.string().transform(Number).optional(), // latitude for geo search
  lng: z.string().transform(Number).optional(), // longitude for geo search
  radius: z.string().transform(Number).optional(), // radius in km for geo search
  
  // Date filtering
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  dateRange: z.string().optional(), // preset ranges like 'this_weekend', 'next_month'
  
  // Price filtering
  minPrice: z.string().transform(Number).optional(),
  maxPrice: z.string().transform(Number).optional(),
  priceRange: z.string().optional(), // preset ranges like 'under_50', '50_100'
  
  // Sorting and pagination
  sortBy: z.enum(['RELEVANCE', 'PRICE_LOW', 'PRICE_HIGH', 'DATE', 'DISTANCE', 'POPULARITY']).optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  
  // Filters
  verifiedOnly: z.string().transform(val => val === 'true').optional(),
  transferableOnly: z.string().transform(val => val === 'true').optional(),
  negotiableOnly: z.string().transform(val => val === 'true').optional(),
  availableOnly: z.string().transform(val => val === 'true').optional().default('true'),
  
  // Advanced features
  includeRecommendations: z.string().transform(val => val === 'true').optional(),
  includeFacets: z.string().transform(val => val === 'true').optional().default('true'),
  includeSpellingSuggestions: z.string().transform(val => val === 'true').optional(),
  
  // User context for personalization
  userId: z.string().optional(),
  sessionId: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const rawParams = Object.fromEntries(searchParams.entries());
    const validationResult = SearchParamsSchema.safeParse(rawParams);
    
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Invalid search parameters',
          details: validationResult.error.flatten()
        }
      } as APIResponse, { status: 400 });
    }

    const params = validationResult.data;
    
    // Build search criteria
    const criteria: SearchCriteria = {
      query: params.q || params.query,
      category: params.category,
      location: buildLocationCriteria(params),
      dateRange: buildDateRange(params),
      priceRange: buildPriceRange(params),
      sortBy: params.sortBy || 'RELEVANCE',
      filters: {
        verifiedOnly: params.verifiedOnly,
        transferable: params.transferableOnly,
        negotiable: params.negotiableOnly
      }
    };

    // Get user context for personalization
    const userContext = await getUserContext(params.userId, params.sessionId);
    
    // Perform search
    const searchResults = await searchService.searchTickets(criteria, userContext);
    
    // Apply pagination
    const startIndex = (params.page - 1) * params.limit;
    const endIndex = startIndex + params.limit;
    const paginatedTickets = searchResults.tickets.slice(startIndex, endIndex);
    
    // Get recommendations if requested
    let recommendations = undefined;
    if (params.includeRecommendations && params.userId) {
      try {
        recommendations = await searchService.getRecommendations(
          params.userId,
          userContext,
          5 // max recommendations
        );
      } catch (error) {
        console.warn('Failed to get recommendations:', error);
      }
    }

    // Build facets for filtering UI
    const facets = params.includeFacets ? searchResults.facets : undefined;
    
    // Get spelling suggestions if no results
    let spellingSuggestions = undefined;
    if (params.includeSpellingSuggestions && searchResults.tickets.length === 0 && criteria.query) {
      spellingSuggestions = await getSpellingSuggestions(criteria.query);
    }

    // Prepare response
    const response: TicketSearchResponse = {
      success: true,
      data: {
        tickets: paginatedTickets,
        totalCount: searchResults.totalCount,
        recommendations,
        facets: {
          ...facets,
          // Add custom facet processing
          priceRanges: facets?.priceRanges?.map(range => ({
            ...range,
            label: formatPriceRangeLabel(range.min, range.max),
            selected: isPriceRangeSelected(range, params)
          }))
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
        pagination: {
          page: params.page,
          limit: params.limit,
          total: searchResults.totalCount,
          hasMore: endIndex < searchResults.totalCount
        }
      }
    };

    // Add search suggestions if no results
    if (searchResults.tickets.length === 0) {
      response.data = {
        ...response.data,
        suggestions: [
          ...(searchResults.suggestions || []),
          ...(spellingSuggestions || [])
        ]
      };
    }

    // Add performance metrics for monitoring
    if (process.env.NODE_ENV === 'development') {
      response.metadata = {
        ...response.metadata,
        performance: {
          searchTime: searchResults.executionTime,
          totalResults: searchResults.totalCount,
          query: criteria.query
        }
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Search API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'Search service temporarily unavailable',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as APIResponse, { status: 500 });
  }
}

// POST endpoint for complex search queries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate complex search criteria
    const validationResult = SearchCriteriaSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_SEARCH_CRITERIA',
          message: 'Invalid search criteria',
          details: validationResult.error.flatten()
        }
      } as APIResponse, { status: 400 });
    }

    const criteria = validationResult.data;
    
    // Get user context
    const userContext = await getUserContext(body.userId, body.sessionId);
    
    // Perform search
    const searchResults = await searchService.searchTickets(criteria, userContext);
    
    // Return results
    const response: TicketSearchResponse = {
      success: true,
      data: {
        tickets: searchResults.tickets,
        totalCount: searchResults.totalCount,
        facets: searchResults.facets
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Complex search API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'COMPLEX_SEARCH_ERROR',
        message: 'Complex search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as APIResponse, { status: 500 });
  }
}

// Helper functions

function buildLocationCriteria(params: any) {
  if (params.lat && params.lng) {
    return {
      coordinates: { lat: params.lat, lng: params.lng },
      radius: params.radius || 50
    };
  }
  
  if (params.city) {
    return { city: params.city };
  }
  
  return undefined;
}

function buildDateRange(params: any) {
  // Handle preset date ranges
  if (params.dateRange) {
    const now = new Date();
    switch (params.dateRange) {
      case 'today':
        return {
          from: now.toISOString().split('T')[0],
          to: now.toISOString().split('T')[0]
        };
      case 'this_weekend':
        const weekend = getThisWeekend();
        return weekend;
      case 'next_week':
        const nextWeek = getNextWeek();
        return nextWeek;
      case 'next_month':
        const nextMonth = getNextMonth();
        return nextMonth;
    }
  }
  
  // Handle custom date range
  if (params.dateFrom || params.dateTo) {
    return {
      from: params.dateFrom,
      to: params.dateTo
    };
  }
  
  return undefined;
}

function buildPriceRange(params: any) {
  // Handle preset price ranges
  if (params.priceRange) {
    const ranges: Record<string, { min: number; max: number }> = {
      'under_50': { min: 0, max: 50 },
      '50_100': { min: 50, max: 100 },
      '100_250': { min: 100, max: 250 },
      '250_500': { min: 250, max: 500 },
      'over_500': { min: 500, max: Infinity }
    };
    
    return ranges[params.priceRange];
  }
  
  // Handle custom price range
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    return {
      min: params.minPrice || 0,
      max: params.maxPrice || Infinity
    };
  }
  
  return undefined;
}

async function getUserContext(userId?: string, sessionId?: string) {
  if (!userId && !sessionId) return undefined;
  
  // In production, fetch user profile and history from database
  return {
    userId: userId || `session_${sessionId}`,
    userProfile: undefined, // Would fetch from database
    searchHistory: [],
    viewHistory: [],
    purchaseHistory: []
  };
}

async function getSpellingSuggestions(query: string): Promise<string[]> {
  // In production, integrate with spell check service or AI
  // For now, return some basic suggestions
  const suggestions: string[] = [];
  
  if (query.includes('concert')) {
    suggestions.push('Did you mean "concerts"?');
  }
  
  if (query.includes('footbal')) {
    suggestions.push('Did you mean "football"?');
  }
  
  return suggestions;
}

function formatPriceRangeLabel(min: number, max: number): string {
  if (max === Infinity) return `$${min}+`;
  if (min === 0) return `Under $${max}`;
  return `$${min} - $${max}`;
}

function isPriceRangeSelected(range: any, params: any): boolean {
  if (!params.minPrice && !params.maxPrice) return false;
  
  const selectedMin = params.minPrice || 0;
  const selectedMax = params.maxPrice || Infinity;
  
  return range.min >= selectedMin && range.max <= selectedMax;
}

function getThisWeekend() {
  const now = new Date();
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + (6 - now.getDay())); // Next Saturday
  
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1); // Sunday
  
  return {
    from: saturday.toISOString().split('T')[0],
    to: sunday.toISOString().split('T')[0]
  };
}

function getNextWeek() {
  const now = new Date();
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + (8 - now.getDay()));
  
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  
  return {
    from: nextMonday.toISOString().split('T')[0],
    to: nextSunday.toISOString().split('T')[0]
  };
}

function getNextMonth() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  
  return {
    from: nextMonth.toISOString().split('T')[0],
    to: endOfNextMonth.toISOString().split('T')[0]
  };
}

function generateRequestId(): string {
  return `search_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}