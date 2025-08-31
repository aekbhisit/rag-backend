/**
 * Marketplace Type Definitions for Ticket Trading Platform
 * 
 * This file contains all TypeScript interfaces and types for the ticket marketplace,
 * including tickets, users, payments, transactions, and related entities.
 */

import { z } from "zod";

// ==========================================
// Core Ticket Types
// ==========================================

export type TicketCategory = 
  | 'CONCERT' 
  | 'SPORTS' 
  | 'THEATER' 
  | 'COMEDY' 
  | 'FESTIVAL' 
  | 'CONFERENCE' 
  | 'OTHER';

export type TicketStatus = 
  | 'PENDING_REVIEW' 
  | 'ACTIVE' 
  | 'SOLD' 
  | 'EXPIRED' 
  | 'REJECTED' 
  | 'CANCELLED';

export type TicketCondition = 
  | 'EXCELLENT' 
  | 'GOOD' 
  | 'FAIR' 
  | 'POOR';

export interface TicketLocation {
  venue: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface TicketDetails {
  section?: string;
  row?: string;
  seat?: string;
  entrance?: string;
  restrictions?: string[];
  transferable: boolean;
  originalPrice: number;
}

export interface Ticket {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  category: TicketCategory;
  event: {
    name: string;
    date: string; // ISO date string
    time?: string;
    duration?: number; // in minutes
    performer?: string;
    description?: string;
  };
  location: TicketLocation;
  details: TicketDetails;
  pricing: {
    originalPrice: number;
    sellingPrice: number;
    currency: string;
    negotiable: boolean;
  };
  quantity: number;
  condition: TicketCondition;
  images: string[]; // URLs to ticket images
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'FLAGGED';
  status: TicketStatus;
  metadata: {
    createdAt: string;
    updatedAt: string;
    expiresAt?: string; // Auto-expire after event date
    views: number;
    favorites: number;
    ocrData?: OCRData; // Extracted data from OCR
  };
  tags: string[];
}

// ==========================================
// Event Types
// ==========================================

export interface Event {
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

// ==========================================
// OCR and AI Processing Types
// ==========================================

export interface OCRData {
  extractedText: string;
  confidence: number;
  detectedFields: {
    eventName?: string;
    date?: string;
    time?: string;
    venue?: string;
    section?: string;
    row?: string;
    seat?: string;
    price?: number;
  };
  processingInfo: {
    processedAt: string;
    processingTimeMs: number;
    imageQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  };
}

export interface AIRecommendation {
  ticketId: string;
  score: number;
  reasons: string[];
  category: 'PRICE_MATCH' | 'LOCATION_MATCH' | 'CATEGORY_MATCH' | 'TIME_MATCH';
}

export interface SearchResult {
  tickets: Ticket[];
  totalCount: number;
  facets: {
    categories: Record<TicketCategory, number>;
    cities: Record<string, number>;
    priceRanges: Record<string, number>;
    venues: Record<string, number>;
  };
  suggestions: string[];
  executionTime: number;
}

export interface RecommendationContext {
  userId?: string;
  userProfile?: UserProfile;
  searchHistory?: string[];
  viewHistory?: string[];
  purchaseHistory?: string[];
}

export interface SearchCriteria {
  query?: string;
  category?: TicketCategory;
  location?: {
    city?: string;
    radius?: number; // km
    coordinates?: { lat: number; lng: number };
  };
  dateRange?: {
    from: string;
    to: string;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  sortBy?: 'RELEVANCE' | 'PRICE_LOW' | 'PRICE_HIGH' | 'DATE' | 'DISTANCE';
  filters?: {
    transferable?: boolean;
    verifiedOnly?: boolean;
    negotiable?: boolean;
  };
}

// ==========================================
// User and Profile Types
// ==========================================

export type UserRole = 'BUYER' | 'SELLER' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  verification: {
    email: boolean;
    phone: boolean;
    identity: boolean;
    paymentMethod: boolean;
  };
  ratings: {
    averageRating: number;
    totalRatings: number;
    asSellerRating: number;
    asBuyerRating: number;
  };
  preferences: {
    favoriteCategories: TicketCategory[];
    preferredCities: string[];
    notifications: NotificationSettings;
  };
  metadata: {
    joinedAt: string;
    lastActive: string;
    totalTicketsSold: number;
    totalTicketsBought: number;
  };
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketingEmails: boolean;
  priceDropAlerts: boolean;
  newListingsInArea: boolean;
  transactionUpdates: boolean;
}

// ==========================================
// Payment and Transaction Types
// ==========================================

export type PaymentStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'ESCROW' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'REFUNDED' 
  | 'DISPUTED';

export type TransactionStatus = 
  | 'INITIATED' 
  | 'PAYMENT_PENDING' 
  | 'PAYMENT_CONFIRMED' 
  | 'TICKETS_IN_ESCROW' 
  | 'TRANSFER_PENDING' 
  | 'TRANSFER_COMPLETED' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'DISPUTED' 
  | 'REFUNDED';

export interface PaymentBreakdown {
  ticketPrice: number;
  platformFee: number;
  processingFee: number;
  total: number;
  currency: string;
}

export interface EscrowDetails {
  holdUntil: string; // ISO date when funds will be released
  releaseConditions: string[];
  buyerProtection: boolean;
  sellerProtection: boolean;
}

export interface Transaction {
  id: string;
  ticketId: string;
  buyerId: string;
  sellerId: string;
  quantity: number;
  pricing: PaymentBreakdown;
  payment: {
    method: 'CREDIT_CARD' | 'PAYPAL' | 'BANK_TRANSFER' | 'CRYPTO';
    status: PaymentStatus;
    paymentIntentId?: string; // Stripe payment intent ID
    capturedAt?: string;
    refundedAt?: string;
  };
  escrow: EscrowDetails;
  status: TransactionStatus;
  timeline: TransactionEvent[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    notes?: string;
  };
}

export interface TransactionEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  actor: 'BUYER' | 'SELLER' | 'SYSTEM' | 'ADMIN';
  metadata?: Record<string, any>;
}

// ==========================================
// Messaging and Communication Types
// ==========================================

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'TEXT' | 'TICKET_OFFER' | 'PRICE_NEGOTIATION' | 'SYSTEM' | 'IMAGE';
  metadata: {
    timestamp: string;
    readAt?: string;
    ticketId?: string; // If message is about a specific ticket
    offerAmount?: number; // If message contains a price offer
  };
}

export interface Conversation {
  id: string;
  participantIds: string[];
  ticketId?: string; // Primary ticket being discussed
  lastMessage?: ChatMessage;
  metadata: {
    createdAt: string;
    updatedAt: string;
    archived: boolean;
  };
}

// ==========================================
// Admin and Moderation Types
// ==========================================

export type ModerationAction = 
  | 'APPROVE' 
  | 'REJECT' 
  | 'FLAG' 
  | 'SUSPEND' 
  | 'DELETE';

export interface ModerationCase {
  id: string;
  targetType: 'TICKET' | 'USER' | 'TRANSACTION' | 'REVIEW';
  targetId: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED';
  assignedTo?: string; // Admin user ID
  reportedBy?: string; // User who reported
  actions: ModerationActionRecord[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    resolvedAt?: string;
  };
}

export interface ModerationActionRecord {
  action: ModerationAction;
  reason: string;
  performedBy: string;
  timestamp: string;
  notes?: string;
}

// ==========================================
// Analytics and Metrics Types
// ==========================================

export interface MarketplaceMetrics {
  tickets: {
    total: number;
    active: number;
    sold: number;
    categories: Record<TicketCategory, number>;
  };
  transactions: {
    total: number;
    volume: number; // Total monetary value
    averagePrice: number;
    completionRate: number;
  };
  users: {
    total: number;
    active: number;
    sellers: number;
    buyers: number;
  };
  timeRange: {
    from: string;
    to: string;
  };
}

// ==========================================
// Bot Action Framework Integration Types
// ==========================================

export interface TicketDisplayAction {
  type: 'DISPLAY_TICKETS';
  tickets: Ticket[];
  searchContext?: SearchCriteria;
  recommendations?: AIRecommendation[];
}

export interface PurchaseFlowAction {
  type: 'INITIATE_PURCHASE';
  ticketId: string;
  quantity: number;
  negotiatedPrice?: number;
}

export interface SearchResultsAction {
  type: 'SHOW_SEARCH_RESULTS';
  results: Ticket[];
  totalCount: number;
  searchCriteria: SearchCriteria;
  suggestions?: string[];
}

// ==========================================
// Zod Validation Schemas
// ==========================================

export const TicketCategorySchema = z.enum([
  'CONCERT', 'SPORTS', 'THEATER', 'COMEDY', 'FESTIVAL', 'CONFERENCE', 'OTHER'
]);

export const TicketSubmissionSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  category: TicketCategorySchema,
  eventName: z.string().min(2).max(200),
  eventDate: z.string().datetime(),
  venue: z.string().min(2).max(200),
  city: z.string().min(2).max(100),
  sellingPrice: z.number().positive(),
  originalPrice: z.number().positive(),
  quantity: z.number().int().positive().max(10),
  transferable: z.boolean(),
  negotiable: z.boolean(),
  images: z.array(z.string().url()).min(1).max(5)
});

export const SearchCriteriaSchema = z.object({
  query: z.string().optional(),
  category: TicketCategorySchema.optional(),
  city: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  verifiedOnly: z.boolean().optional(),
  transferableOnly: z.boolean().optional()
});

export const PurchaseRequestSchema = z.object({
  ticketId: z.string().uuid(),
  quantity: z.number().int().positive().max(10),
  offerPrice: z.number().positive().optional(),
  message: z.string().max(500).optional()
});

// ==========================================
// API Response Types
// ==========================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

export type TicketSearchResponse = APIResponse<{
  tickets: Ticket[];
  totalCount: number;
  recommendations?: AIRecommendation[];
  facets?: {
    categories: Record<TicketCategory, number>;
    cities: Record<string, number>;
    priceRanges: { min: number; max: number; count: number }[];
  };
}>;

export type TicketSubmissionResponse = APIResponse<{
  ticketId: string;
  status: TicketStatus;
  estimatedReviewTime: number; // minutes
  ocrResults?: OCRData;
}>;

// All types are already exported inline above