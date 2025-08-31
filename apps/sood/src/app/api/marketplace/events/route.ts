/**
 * Public Marketplace Events API Endpoint
 * 
 * Provides public access to events with filtering, sorting, and pagination.
 * GET /api/marketplace/events
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { APIResponse } from '@/app/types/marketplace';

// Event data schema
interface Event {
  id: string;
  title: string;
  category: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  priceRange: { min: number; max: number };
  originalPriceRange?: { min: number; max: number };
  image: string;
  verified: boolean;
  rating: number;
  totalTickets: number;
  availableTickets: number;
  soldTickets: number;
  featured: boolean;
  organizer: string;
  description: string;
  tags: string[];
}

// Mock event data - in production this would come from a database
const mockEvents: Event[] = [
  {
    id: '1',
    title: 'BNK48 Special Concert 2024',
    category: 'concerts',
    venue: 'Impact Arena',
    city: 'Bangkok',
    date: '2024-12-15',
    time: '19:30',
    priceRange: { min: 1200, max: 8500 },
    originalPriceRange: { min: 1500, max: 10000 },
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    verified: true,
    rating: 4.9,
    totalTickets: 450,
    availableTickets: 89,
    soldTickets: 361,
    featured: true,
    organizer: 'BNK48 Official',
    description: 'Special concert featuring all BNK48 members with exclusive performances and fan interactions.',
    tags: ['Concert', 'J-Pop', 'Idol', 'Meet & Greet']
  },
  {
    id: '2', 
    title: 'Muay Thai Championship Final',
    category: 'sports',
    venue: 'Rajadamnern Stadium',
    city: 'Bangkok',
    date: '2024-11-28',
    time: '20:00',
    priceRange: { min: 800, max: 5000 },
    originalPriceRange: { min: 1000, max: 6000 },
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400',
    verified: true,
    rating: 4.7,
    totalTickets: 320,
    availableTickets: 67,
    soldTickets: 253,
    featured: true,
    organizer: 'Royal Thai Boxing Association',
    description: 'Championship final featuring top Muay Thai fighters from Thailand and international competitors.',
    tags: ['Sports', 'Muay Thai', 'Championship', 'Traditional']
  },
  {
    id: '3',
    title: 'The Lion King Musical (Thai Version)',
    category: 'theater',
    venue: 'Thailand Cultural Centre',
    city: 'Bangkok',
    date: '2024-12-01',
    time: '20:00',
    priceRange: { min: 2000, max: 7500 },
    originalPriceRange: { min: 2500, max: 8500 },
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    verified: true,
    rating: 4.8,
    totalTickets: 280,
    availableTickets: 45,
    soldTickets: 235,
    featured: false,
    organizer: 'Thailand Cultural Centre',
    description: 'World-renowned musical adapted with Thai cultural elements and local cast.',
    tags: ['Theater', 'Musical', 'Family', 'Cultural']
  },
  {
    id: '4',
    title: 'Songkran Water Festival 2024',
    category: 'festivals',
    venue: 'Silom Road',
    city: 'Bangkok',
    date: '2024-04-13',
    time: '10:00',
    priceRange: { min: 500, max: 1500 },
    originalPriceRange: { min: 600, max: 1800 },
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400',
    verified: true,
    rating: 4.6,
    totalTickets: 500,
    availableTickets: 124,
    soldTickets: 376,
    featured: false,
    organizer: 'Bangkok Metropolitan Administration',
    description: 'Traditional Thai New Year celebration with water fights, cultural performances, and street food.',
    tags: ['Festival', 'Traditional', 'Water Festival', 'Cultural']
  },
  {
    id: '5',
    title: 'Loy Krathong Cultural Show',
    category: 'festivals',
    venue: 'Chao Phraya River',
    city: 'Bangkok',
    date: '2024-11-15',
    time: '18:00',
    priceRange: { min: 800, max: 2500 },
    originalPriceRange: { min: 1000, max: 3000 },
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
    verified: true,
    rating: 4.7,
    totalTickets: 400,
    availableTickets: 95,
    soldTickets: 305,
    featured: true,
    organizer: 'Cultural Heritage Foundation',
    description: 'Traditional Loy Krathong celebration with river lanterns, cultural performances, and traditional Thai cuisine.',
    tags: ['Cultural', 'Traditional', 'Festival', 'River']
  },
  {
    id: '6',
    title: 'Thai Jazz Festival 2024',
    category: 'concerts',
    venue: 'Lumphini Park',
    city: 'Bangkok',
    date: '2024-12-20',
    time: '19:00',
    priceRange: { min: 900, max: 3500 },
    originalPriceRange: { min: 1200, max: 4000 },
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    verified: true,
    rating: 4.5,
    totalTickets: 350,
    availableTickets: 78,
    soldTickets: 272,
    featured: false,
    organizer: 'Thailand Jazz Association',
    description: 'Open-air jazz festival featuring international and Thai jazz artists in the heart of Bangkok.',
    tags: ['Jazz', 'Music', 'International', 'Outdoor']
  },
  {
    id: '7',
    title: 'Stand-Up Comedy Night Bangkok',
    category: 'comedy',
    venue: 'Saxophone Pub',
    city: 'Bangkok',
    date: '2024-11-30',
    time: '21:00',
    priceRange: { min: 600, max: 1200 },
    originalPriceRange: { min: 800, max: 1500 },
    image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400',
    verified: true,
    rating: 4.3,
    totalTickets: 150,
    availableTickets: 32,
    soldTickets: 118,
    featured: false,
    organizer: 'Bangkok Comedy Club',
    description: 'An evening of hilarious stand-up comedy featuring local and international comedians.',
    tags: ['Comedy', 'Stand-up', 'Entertainment', 'Nightlife']
  },
  {
    id: '8',
    title: 'Phuket International Food Festival',
    category: 'festivals',
    venue: 'Phuket Old Town',
    city: 'Phuket',
    date: '2024-12-05',
    time: '12:00',
    priceRange: { min: 400, max: 2000 },
    originalPriceRange: { min: 500, max: 2500 },
    image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400',
    verified: true,
    rating: 4.6,
    totalTickets: 600,
    availableTickets: 145,
    soldTickets: 455,
    featured: true,
    organizer: 'Phuket Tourism Authority',
    description: 'A culinary celebration featuring dishes from around the world and local Thai specialties.',
    tags: ['Food', 'Festival', 'Culinary', 'International']
  },
  {
    id: '9',
    title: 'Classical Symphony Orchestra',
    category: 'concerts',
    venue: 'Thailand Cultural Centre',
    city: 'Bangkok',
    date: '2024-11-25',
    time: '19:30',
    priceRange: { min: 1500, max: 5000 },
    originalPriceRange: { min: 2000, max: 6000 },
    image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400',
    verified: true,
    rating: 4.8,
    totalTickets: 200,
    availableTickets: 42,
    soldTickets: 158,
    featured: false,
    organizer: 'Royal Thai Symphony Orchestra',
    description: 'An evening of classical masterpieces performed by Thailand\'s premier symphony orchestra.',
    tags: ['Classical', 'Orchestra', 'Music', 'Cultural']
  }
];

// Query parameters schema
const QueryParamsSchema = z.object({
  category: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('9'),
  sortBy: z.enum(['featured', 'price-low', 'price-high', 'date', 'popularity']).optional().default('featured'),
  search: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const rawParams = Object.fromEntries(searchParams.entries());
    const validationResult = QueryParamsSchema.safeParse(rawParams);
    
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Invalid query parameters',
          details: validationResult.error.flatten()
        }
      } as APIResponse, { status: 400 });
    }

    const { category, page, limit, sortBy, search } = validationResult.data;
    
    // Filter events by category
    let filteredEvents = mockEvents;
    if (category && category !== 'all') {
      filteredEvents = mockEvents.filter(event => event.category === category);
    }
    
    // Filter by search query
    if (search) {
      const query = search.toLowerCase();
      filteredEvents = filteredEvents.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query) ||
        event.city.toLowerCase().includes(query) ||
        event.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Sort events
    const sortedEvents = [...filteredEvents].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.priceRange.min - b.priceRange.min;
        case 'price-high':
          return b.priceRange.min - a.priceRange.min;
        case 'date':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'popularity':
          return b.soldTickets - a.soldTickets;
        default:
          // 'featured' - keep featured events first
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return 0;
      }
    });
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = sortedEvents.slice(startIndex, endIndex);
    
    // Prepare response
    const response = {
      success: true,
      data: {
        events: paginatedEvents,
        totalCount: sortedEvents.length,
        currentPage: page,
        totalPages: Math.ceil(sortedEvents.length / limit),
        hasNextPage: endIndex < sortedEvents.length,
        hasPrevPage: startIndex > 0
      },
      metadata: {
        timestamp: new Date().toISOString(),
        filters: {
          category: category || 'all',
          sortBy,
          search: search || null
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Marketplace Events API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch events',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as APIResponse, { status: 500 });
  }
}