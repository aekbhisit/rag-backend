"use client";

/**
 * Ticket Display Component
 * 
 * Displays tickets in various layouts with AI-powered recommendations,
 * integrated with the Bot Action Framework for seamless user interactions.
 */

import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  AIRecommendation,
  TicketDisplayAction,
  PurchaseFlowAction 
} from '@/app/types/marketplace';
// import { useAction } from '@/botActionFramework/hooks/useAction'; // Removed to fix SSR

interface TicketDisplayComponentProps {
  tickets: Ticket[];
  recommendations?: AIRecommendation[];
  layout?: 'grid' | 'list' | 'carousel';
  title?: string;
  showFilters?: boolean;
  onTicketSelect?: (ticket: Ticket) => void;
  onPurchaseInitiate?: (ticket: Ticket, quantity: number) => void;
  className?: string;
}

interface TicketCardProps {
  ticket: Ticket;
  recommendation?: AIRecommendation;
  onSelect?: (ticket: Ticket) => void;
  onPurchase?: (ticket: Ticket) => void;
  compact?: boolean;
}

const TicketCard: React.FC<TicketCardProps> = ({ 
  ticket, 
  recommendation, 
  onSelect, 
  onPurchase,
  compact = false 
}) => {
  const [imageError, setImageError] = useState(false);
  const [favorited, setFavorited] = useState(false);

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getVerificationBadge = () => {
    switch (ticket.verificationStatus) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified
          </span>
        );
      case 'FLAGGED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            ⚠️ Flagged
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Pending
          </span>
        );
    }
  };

  const getRecommendationBadge = () => {
    if (!recommendation) return null;

    const badgeColors: Record<string, string> = {
      'PRICE_MATCH': 'bg-green-100 text-green-800',
      'LOCATION_MATCH': 'bg-blue-100 text-blue-800',
      'CATEGORY_MATCH': 'bg-purple-100 text-purple-800',
      'TIME_MATCH': 'bg-orange-100 text-orange-800'
    };

    return (
      <div className="absolute top-2 left-2 z-10">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeColors[recommendation.category] || 'bg-gray-100 text-gray-800'}`}>
          🎯 Recommended ({Math.round(recommendation.score * 100)}% match)
        </span>
      </div>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
          {ticket.images[0] && !imageError ? (
            <img
              src={ticket.images[0]}
              alt={ticket.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              🎫
            </div>
          )}
        </div>
        
        <div className="ml-3 flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {ticket.event.name}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {ticket.location.venue} • {formatDate(ticket.event.date)}
          </p>
          <p className="text-sm font-semibold text-gray-900">
            {formatPrice(ticket.pricing.sellingPrice, ticket.pricing.currency)}
            {ticket.pricing.negotiable && (
              <span className="text-xs text-blue-600 ml-1">(negotiable)</span>
            )}
          </p>
        </div>

        <div className="ml-3 flex-shrink-0">
          {getVerificationBadge()}
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer">
      {getRecommendationBadge()}
      
      {/* Main Image */}
      <div className="aspect-w-16 aspect-h-9 bg-gray-200 relative overflow-hidden">
        {ticket.images[0] && !imageError ? (
          <img
            src={ticket.images[0]}
            alt={ticket.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center text-gray-400 text-4xl">
            🎫
          </div>
        )}
        
        {/* Overlay Actions */}
        <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFavorited(!favorited);
            }}
            className={`p-2 rounded-full transition-colors ${
              favorited ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-red-50 hover:text-red-500'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-3 left-3">
          <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg px-3 py-2">
            <div className="text-lg font-bold text-gray-900">
              {formatPrice(ticket.pricing.sellingPrice, ticket.pricing.currency)}
            </div>
            {ticket.pricing.negotiable && (
              <div className="text-xs text-blue-600">Negotiable</div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Event Info */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
            {ticket.event.name}
          </h3>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {ticket.description}
          </p>
        </div>

        {/* Date & Venue */}
        <div className="flex items-center text-sm text-gray-500 mb-3">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span className="mr-4">
            {formatDate(ticket.event.date)} • {formatTime(ticket.event.date)}
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-500 mb-3">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span>{ticket.location.venue}, {ticket.location.city}</span>
        </div>

        {/* Seating Info */}
        {(ticket.details.section || ticket.details.row) && (
          <div className="flex items-center text-sm text-gray-500 mb-3">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            <span>
              {ticket.details.section && `Section ${ticket.details.section}`}
              {ticket.details.section && ticket.details.row && ' • '}
              {ticket.details.row && `Row ${ticket.details.row}`}
              {ticket.details.seat && ` • Seat ${ticket.details.seat}`}
            </span>
          </div>
        )}

        {/* Badges & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {getVerificationBadge()}
            {ticket.quantity > 1 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {ticket.quantity} available
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onPurchase?.(ticket);
            }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Buy Now
          </button>
        </div>

        {/* Recommendation Reasons */}
        {recommendation && recommendation.reasons.length > 0 && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800 font-medium mb-1">Why we recommend this:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              {recommendation.reasons.slice(0, 2).map((reason, index) => (
                <li key={index} className="flex items-start">
                  <span className="w-1 h-1 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const TicketDisplayComponent: React.FC<TicketDisplayComponentProps> = ({
  tickets,
  recommendations = [],
  layout = 'grid',
  title,
  showFilters = false,
  onTicketSelect,
  onPurchaseInitiate,
  className = ''
}) => {
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [filterBy, setFilterBy] = useState<string>('all');
  const [displayTickets, setDisplayTickets] = useState<Ticket[]>([]);

  // Register Bot Action handler for ticket display
  useAction('DISPLAY_TICKETS', (action: TicketDisplayAction) => {
    setDisplayTickets(action.tickets);
  });

  // Register Bot Action handler for purchase flow
  useAction('INITIATE_PURCHASE', (action: PurchaseFlowAction) => {
    const ticket = tickets.find(t => t.id === action.ticketId);
    if (ticket && onPurchaseInitiate) {
      onPurchaseInitiate(ticket, action.quantity);
    }
  });

  useEffect(() => {
    let filteredTickets = [...tickets];

    // Apply filters
    if (filterBy === 'verified') {
      filteredTickets = filteredTickets.filter(t => t.verificationStatus === 'VERIFIED');
    } else if (filterBy === 'negotiable') {
      filteredTickets = filteredTickets.filter(t => t.pricing.negotiable);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price_low':
        filteredTickets.sort((a, b) => a.pricing.sellingPrice - b.pricing.sellingPrice);
        break;
      case 'price_high':
        filteredTickets.sort((a, b) => b.pricing.sellingPrice - a.pricing.sellingPrice);
        break;
      case 'date':
        filteredTickets.sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());
        break;
      case 'relevance':
      default:
        // Keep original order (assumed to be by relevance)
        break;
    }

    setDisplayTickets(filteredTickets);
  }, [tickets, sortBy, filterBy]);

  const getRecommendationForTicket = (ticket: Ticket): AIRecommendation | undefined => {
    return recommendations.find(rec => rec.ticketId === ticket.id);
  };

  const getLayoutClasses = () => {
    switch (layout) {
      case 'list':
        return 'space-y-4';
      case 'carousel':
        return 'flex space-x-4 overflow-x-auto pb-4';
      case 'grid':
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
    }
  };

  if (displayTickets.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 text-6xl mb-4">🎫</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
        <p className="text-gray-500">Try adjusting your search filters or check back later.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      {(title || showFilters) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {title && (
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          )}
          
          {showFilters && (
            <div className="flex flex-wrap items-center space-x-4">
              {/* Sort Options */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="relevance">Sort by Relevance</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="date">Date: Soonest First</option>
              </select>

              {/* Filter Options */}
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Tickets</option>
                <option value="verified">Verified Only</option>
                <option value="negotiable">Negotiable Price</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {displayTickets.length} {displayTickets.length === 1 ? 'ticket' : 'tickets'}
        {recommendations.length > 0 && (
          <span className="ml-2 text-blue-600">
            • {recommendations.length} personalized {recommendations.length === 1 ? 'recommendation' : 'recommendations'}
          </span>
        )}
      </div>

      {/* Tickets Grid/List */}
      <div className={getLayoutClasses()}>
        {displayTickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            recommendation={getRecommendationForTicket(ticket)}
            onSelect={onTicketSelect}
            onPurchase={(ticket) => onPurchaseInitiate?.(ticket, 1)}
            compact={layout === 'list'}
          />
        ))}
      </div>

      {/* Load More Button (if needed) */}
      {tickets.length > displayTickets.length && (
        <div className="text-center pt-6">
          <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Show More Tickets
          </button>
        </div>
      )}
    </div>
  );
};

export default TicketDisplayComponent;