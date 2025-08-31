/**
 * Payment Intent API Endpoint
 * 
 * Creates payment intents for secure ticket purchases with escrow protection.
 * POST /api/payments/intent
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { paymentService } from '@/app/lib/paymentService';
import { 
  PurchaseRequestSchema, 
  APIResponse 
} from '@/app/types/marketplace';

// Enhanced purchase request schema
const PaymentIntentRequestSchema = z.object({
  ticketId: z.string().min(1),
  buyerId: z.string().min(1),
  sellerId: z.string().min(1),
  quantity: z.number().int().positive().max(10),
  ticketPrice: z.number().positive(),
  currency: z.string().default('USD'),
  offerPrice: z.number().positive().optional(),
  buyerMessage: z.string().max(500).optional(),
  paymentMethod: z.enum(['CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER']).optional(),
  
  // Purchase context
  isNegotiation: z.boolean().default(false),
  urgentPurchase: z.boolean().default(false), // For events happening soon
  
  // Buyer information for enhanced security
  buyerInfo: z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    billingAddress: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string().optional(),
      country: z.string(),
      zipCode: z.string()
    }).optional()
  })
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validationResult = PaymentIntentRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid payment request',
          details: validationResult.error.flatten()
        }
      } as APIResponse, { status: 400 });
    }

    const data = validationResult.data;
    
    // Verify ticket availability and ownership
    const ticket = await getTicketById(data.ticketId);
    if (!ticket) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found or no longer available'
        }
      } as APIResponse, { status: 404 });
    }

    // Verify ticket is still available
    if (ticket.status !== 'ACTIVE') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TICKET_UNAVAILABLE',
          message: 'Ticket is no longer available for purchase',
          details: { status: ticket.status }
        }
      } as APIResponse, { status: 400 });
    }

    // Verify seller ownership
    if (ticket.sellerId !== data.sellerId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SELLER_MISMATCH',
          message: 'Invalid seller information'
        }
      } as APIResponse, { status: 400 });
    }

    // Verify buyer isn't the seller
    if (data.buyerId === data.sellerId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SELF_PURCHASE',
          message: 'Cannot purchase your own tickets'
        }
      } as APIResponse, { status: 400 });
    }

    // Check quantity availability
    if (data.quantity > ticket.quantity) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_QUANTITY',
          message: `Only ${ticket.quantity} tickets available`,
          details: { available: ticket.quantity, requested: data.quantity }
        }
      } as APIResponse, { status: 400 });
    }

    // Determine final price (handle negotiations)
    const finalPrice = data.offerPrice || ticket.pricing.sellingPrice;
    
    // Validate offer price if negotiating
    if (data.isNegotiation && data.offerPrice) {
      if (!ticket.pricing.negotiable) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'NOT_NEGOTIABLE',
            message: 'This ticket price is not negotiable'
          }
        } as APIResponse, { status: 400 });
      }

      // Basic validation for reasonable offers
      if (data.offerPrice < ticket.pricing.sellingPrice * 0.5) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'OFFER_TOO_LOW',
            message: 'Offer price is too low',
            details: { minimumOffer: ticket.pricing.sellingPrice * 0.5 }
          }
        } as APIResponse, { status: 400 });
      }
    }

    // Calculate payment breakdown
    const paymentBreakdown = paymentService.calculatePaymentBreakdown(
      finalPrice,
      data.quantity,
      data.currency
    );

    // Create transaction record
    const transactionId = generateTransactionId();
    const transaction = await createTransaction({
      id: transactionId,
      ticketId: data.ticketId,
      buyerId: data.buyerId,
      sellerId: data.sellerId,
      quantity: data.quantity,
      pricing: paymentBreakdown,
      isNegotiation: data.isNegotiation,
      buyerMessage: data.buyerMessage,
      urgentPurchase: data.urgentPurchase
    });

    // Create payment intent
    const paymentIntent = await paymentService.createPaymentIntent(
      data.ticketId,
      data.buyerId,
      data.sellerId,
      paymentBreakdown,
      {
        transactionId,
        buyerEmail: data.buyerInfo.email,
        buyerName: `${data.buyerInfo.firstName} ${data.buyerInfo.lastName}`,
        ticketTitle: ticket.title,
        eventName: ticket.event.name,
        eventDate: ticket.event.date,
        isNegotiation: data.isNegotiation.toString(),
        offerPrice: data.offerPrice?.toString() || '',
        urgentPurchase: data.urgentPurchase.toString()
      }
    );

    // Reserve the tickets temporarily (15-minute hold)
    await reserveTickets(data.ticketId, data.quantity, transactionId);

    // Send notifications
    await sendPurchaseNotifications({
      transaction,
      ticket,
      buyer: data.buyerInfo,
      isNegotiation: data.isNegotiation
    });

    // Prepare response
    const response = {
      success: true,
      data: {
        transactionId,
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.clientSecret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        },
        pricing: paymentBreakdown,
        reservation: {
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
          ticketsReserved: data.quantity
        },
        ticket: {
          id: ticket.id,
          title: ticket.title,
          event: ticket.event,
          location: ticket.location
        },
        nextSteps: data.isNegotiation 
          ? 'Your offer has been sent to the seller. You will be notified of their response.'
          : 'Complete your payment to secure your tickets. You have 15 minutes to complete this purchase.'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId()
      }
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'PAYMENT_INTENT_ERROR',
        message: 'Failed to create payment intent',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as APIResponse, { status: 500 });
  }
}

// GET endpoint to retrieve payment intent status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentIntentId = searchParams.get('paymentIntentId');
  const transactionId = searchParams.get('transactionId');
  
  if (!paymentIntentId && !transactionId) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'MISSING_PARAMETER',
        message: 'paymentIntentId or transactionId parameter is required'
      }
    } as APIResponse, { status: 400 });
  }

  try {
    // Get payment status and transaction details
    const paymentStatus = paymentIntentId 
      ? await getPaymentIntentStatus(paymentIntentId)
      : await getTransactionStatus(transactionId!);
    
    if (!paymentStatus) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment intent not found'
        }
      } as APIResponse, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: paymentStatus
    } as APIResponse);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'STATUS_RETRIEVAL_ERROR',
        message: 'Failed to retrieve payment status'
      }
    } as APIResponse, { status: 500 });
  }
}

// Helper functions

function generateTransactionId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

async function getTicketById(ticketId: string): Promise<any> {
  // Mock implementation - in production, fetch from database
  return {
    id: ticketId,
    sellerId: 'seller_123',
    title: 'Sample Ticket',
    status: 'ACTIVE',
    quantity: 2,
    pricing: {
      sellingPrice: 100,
      negotiable: true
    },
    event: {
      name: 'Sample Event',
      date: '2024-12-01T19:00:00Z'
    },
    location: {
      venue: 'Sample Venue',
      city: 'New York'
    }
  };
}

async function createTransaction(transactionData: any): Promise<any> {
  // Mock implementation - in production, store in database
  console.log('Creating transaction:', transactionData.id);
  return {
    id: transactionData.id,
    status: 'INITIATED',
    createdAt: new Date().toISOString()
  };
}

async function reserveTickets(ticketId: string, quantity: number, transactionId: string): Promise<void> {
  // Mock implementation - in production, implement ticket reservation logic
  console.log(`Reserving ${quantity} tickets for ${ticketId} (transaction: ${transactionId})`);
  
  // In production, this would:
  // 1. Create a temporary hold on the tickets
  // 2. Set expiration time (15 minutes)
  // 3. Update ticket availability
  // 4. Schedule cleanup job to release reservation if not confirmed
}

async function sendPurchaseNotifications(data: {
  transaction: any;
  ticket: any;
  buyer: any;
  isNegotiation: boolean;
}): Promise<void> {
  console.log('Sending purchase notifications');
  
  if (data.isNegotiation) {
    // Notify seller of offer
    console.log('Notifying seller of price offer');
  } else {
    // Notify seller of purchase intent
    console.log('Notifying seller of purchase intent');
  }
  
  // Notify buyer of next steps
  console.log('Notifying buyer of next steps');
}

async function getPaymentIntentStatus(paymentIntentId: string): Promise<any> {
  // Mock implementation - in production, fetch from Stripe or payment provider
  return {
    id: paymentIntentId,
    status: 'requires_payment_method',
    amount: 10000,
    currency: 'usd'
  };
}

async function getTransactionStatus(transactionId: string): Promise<any> {
  // Mock implementation - in production, fetch from database
  return {
    id: transactionId,
    status: 'PAYMENT_PENDING',
    createdAt: new Date().toISOString()
  };
}