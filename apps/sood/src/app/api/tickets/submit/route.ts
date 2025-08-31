/**
 * Ticket Submission API Endpoint
 * 
 * Handles ticket submission with automated OCR processing and validation.
 * POST /api/tickets/submit
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ocrService } from '@/app/lib/ocrService';
import { searchService } from '@/app/lib/searchService.mock';
import { 
  TicketSubmissionSchema, 
  Ticket, 
  TicketSubmissionResponse, 
  APIResponse 
} from '@/app/types/marketplace';

// Enhanced validation schema for submission
const SubmissionRequestSchema = z.object({
  // Required ticket information
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  category: z.enum(['CONCERT', 'SPORTS', 'THEATER', 'COMEDY', 'FESTIVAL', 'CONFERENCE', 'OTHER']),
  
  // Event details
  eventName: z.string().min(2).max(200),
  eventDate: z.string().datetime(),
  eventTime: z.string().optional(),
  performer: z.string().optional(),
  
  // Location information
  venue: z.string().min(2).max(200),
  address: z.string().optional(),
  city: z.string().min(2).max(100),
  state: z.string().optional(),
  country: z.string().default('USA'),
  
  // Pricing
  originalPrice: z.number().positive(),
  sellingPrice: z.number().positive(),
  currency: z.string().default('USD'),
  negotiable: z.boolean().default(false),
  
  // Ticket details
  quantity: z.number().int().positive().max(10),
  section: z.string().optional(),
  row: z.string().optional(),
  seat: z.string().optional(),
  transferable: z.boolean().default(true),
  
  // Images and OCR
  images: z.array(z.string().url()).min(1).max(5),
  processOCR: z.boolean().default(true),
  
  // Seller information
  sellerId: z.string().min(1),
  
  // Additional metadata
  tags: z.array(z.string()).optional(),
  notes: z.string().max(500).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationResult = SubmissionRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ticket submission data',
          details: validationResult.error.flatten()
        }
      } as APIResponse, { status: 400 });
    }

    const data = validationResult.data;
    
    // Generate unique ticket ID
    const ticketId = generateTicketId();
    
    // Process OCR if enabled and images provided
    let ocrData = null;
    if (data.processOCR && data.images.length > 0) {
      try {
        // Process the first image for OCR
        const firstImage = data.images[0];
        ocrData = await ocrService.processTicketImage(firstImage, data.sellerId);
        
        // Enhance extracted data with AI
        ocrData = await ocrService.enhanceExtractedData(ocrData, data);
        
        console.log('OCR processing completed:', ocrData);
      } catch (ocrError) {
        console.warn('OCR processing failed:', ocrError);
        // Continue without OCR data
      }
    }

    // Create ticket object
    const ticket: Ticket = {
      id: ticketId,
      sellerId: data.sellerId,
      title: data.title,
      description: data.description,
      category: data.category as any,
      event: {
        name: data.eventName,
        date: data.eventDate,
        time: data.eventTime,
        performer: data.performer,
        description: `${data.eventName} - ${data.performer || 'Live Event'}`
      },
      location: {
        venue: data.venue,
        address: data.address || '',
        city: data.city,
        state: data.state,
        country: data.country,
        coordinates: await getVenueCoordinates(data.venue, data.city)
      },
      details: {
        section: data.section,
        row: data.row,
        seat: data.seat,
        originalPrice: data.originalPrice,
        transferable: data.transferable,
        restrictions: []
      },
      pricing: {
        originalPrice: data.originalPrice,
        sellingPrice: data.sellingPrice,
        currency: data.currency,
        negotiable: data.negotiable
      },
      quantity: data.quantity,
      condition: 'EXCELLENT', // Default condition, could be enhanced with OCR analysis
      images: data.images,
      verificationStatus: 'UNVERIFIED', // Will be verified by admin
      status: 'PENDING_REVIEW',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        favorites: 0,
        ocrData: ocrData || undefined
      },
      tags: data.tags || generateAutoTags(data)
    };

    // Validate ticket completeness
    const validationScore = calculateTicketCompleteness(ticket, ocrData);
    
    // Store ticket in database (mock implementation)
    await storeTicket(ticket);
    
    // Index ticket for search (if approved or high confidence)
    if (validationScore > 0.8) {
      try {
        await searchService.indexTicket(ticket);
      } catch (indexError) {
        console.error('Failed to index ticket:', indexError);
      }
    }

    // Send notifications (to admin for review, to seller for confirmation)
    await sendNotifications(ticket, validationScore);

    // Calculate estimated review time
    const estimatedReviewTime = calculateReviewTime(validationScore);

    // Prepare response
    const response: TicketSubmissionResponse = {
      success: true,
      data: {
        ticketId: ticket.id,
        status: ticket.status,
        estimatedReviewTime,
        ocrResults: ocrData || undefined
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId()
      }
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Ticket submission error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SUBMISSION_ERROR',
        message: 'Failed to submit ticket',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as APIResponse, { status: 500 });
  }
}

// Helper functions

function generateTicketId(): string {
  return `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

async function getVenueCoordinates(venue: string, city: string): Promise<{ lat: number; lng: number } | undefined> {
  // In production, integrate with geocoding service (Google Maps, etc.)
  // For now, return mock coordinates
  const mockCoordinates: Record<string, { lat: number; lng: number }> = {
    'madison square garden': { lat: 40.7505, lng: -73.9934 },
    'staples center': { lat: 34.0430, lng: -118.2673 },
    'wembley stadium': { lat: 51.5560, lng: -0.2796 }
  };
  
  const venueKey = venue.toLowerCase();
  return mockCoordinates[venueKey];
}

function generateAutoTags(data: any): string[] {
  const tags: string[] = [];
  
  // Add category-based tags
  tags.push(data.category.toLowerCase());
  
  // Add performer/event tags
  if (data.performer) {
    tags.push(...data.performer.toLowerCase().split(' ').filter((t: string) => t.length > 2));
  }
  
  // Add venue tags
  if (data.venue) {
    tags.push(...data.venue.toLowerCase().split(' ').filter((t: string) => t.length > 2));
  }
  
  // Add city tag
  tags.push(data.city.toLowerCase());
  
  // Add price range tag
  if (data.sellingPrice < 50) tags.push('budget');
  else if (data.sellingPrice > 200) tags.push('premium');
  
  return [...new Set(tags)]; // Remove duplicates
}

function calculateTicketCompleteness(ticket: Ticket, ocrData: any): number {
  let score = 0.5; // Base score
  
  // Required fields
  if (ticket.title) score += 0.1;
  if (ticket.description.length > 20) score += 0.1;
  if (ticket.event.name) score += 0.1;
  if (ticket.event.date) score += 0.1;
  if (ticket.location.venue) score += 0.1;
  
  // Images
  if (ticket.images.length > 0) score += 0.1;
  if (ticket.images.length > 1) score += 0.05;
  
  // OCR boost
  if (ocrData) {
    score += 0.1;
    if (ocrData.confidence > 0.8) score += 0.1;
  }
  
  // Seating details
  if (ticket.details.section) score += 0.05;
  if (ticket.details.row) score += 0.05;
  if (ticket.details.seat) score += 0.05;
  
  return Math.min(score, 1.0);
}

async function storeTicket(ticket: Ticket): Promise<void> {
  // In production, store in database (MongoDB, PostgreSQL, etc.)
  console.log('Storing ticket:', ticket.id);
  
  // Mock storage - in production this would be a database call
  // await db.tickets.create(ticket);
}

async function sendNotifications(ticket: Ticket, validationScore: number): Promise<void> {
  // In production, send notifications via email, SMS, push notifications
  console.log('Sending notifications for ticket:', ticket.id);
  
  // Notify admin if manual review needed
  if (validationScore < 0.8) {
    console.log('Notifying admin for manual review');
  }
  
  // Notify seller of successful submission
  console.log('Notifying seller of submission confirmation');
}

function calculateReviewTime(validationScore: number): number {
  // Estimate review time in minutes based on validation score
  if (validationScore >= 0.9) return 15; // High confidence, quick review
  if (validationScore >= 0.7) return 60; // Medium confidence, standard review
  return 240; // Low confidence, detailed review (4 hours)
}

// GET endpoint to retrieve submission status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get('ticketId');
  
  if (!ticketId) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'MISSING_PARAMETER',
        message: 'ticketId parameter is required'
      }
    } as APIResponse, { status: 400 });
  }

  try {
    // In production, fetch from database
    const ticket = await getTicketById(ticketId);
    
    if (!ticket) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found'
        }
      } as APIResponse, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ticketId: ticket.id,
        status: ticket.status,
        verificationStatus: ticket.verificationStatus,
        createdAt: ticket.metadata.createdAt,
        updatedAt: ticket.metadata.updatedAt
      }
    } as APIResponse);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'RETRIEVAL_ERROR',
        message: 'Failed to retrieve ticket status'
      }
    } as APIResponse, { status: 500 });
  }
}

async function getTicketById(ticketId: string): Promise<Ticket | null> {
  // Mock implementation - in production, fetch from database
  return null;
}