'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Star, Ticket } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTicketAlt } from '@fortawesome/free-solid-svg-icons';

interface EventCardProps {
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
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({
  id,
  title,
  category,
  venue,
  city,
  date,
  time,
  priceRange,
  originalPriceRange,
  image,
  verified,
  rating,
  totalTickets,
  availableTickets,
  soldTickets,
  featured,
  organizer,
  description,
  tags,
  onFavorite,
  isFavorite
}) => {
  const formatThaiPrice = (price: number) => {
    return `฿${price.toLocaleString()}`;
  };

  const eventDate = new Date(date);
  const formattedDate = eventDate.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Event Image */}
      <div className="relative h-48">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover"
        />
        {featured && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Featured
            </span>
          </div>
        )}
        {verified && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✅ Verified
            </span>
          </div>
        )}
        {onFavorite && (
          <button
            onClick={() => onFavorite && onFavorite(id)}
            className="absolute bottom-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors"
          >
            <FontAwesomeIcon 
              icon={faTicketAlt} 
              className={`w-4 h-4 ${isFavorite ? 'text-red-500' : 'text-gray-400'}`} 
            />
          </button>
        )}
      </div>

      {/* Event Details */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            <Link href={`/events/${id}`} className="hover:text-blue-600 transition-colors">
              {title}
            </Link>
          </h3>
          <div className="flex items-center ml-2 flex-shrink-0">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-sm font-medium text-gray-700 ml-1">{rating}</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{description}</p>

        {/* Event Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500" />
            <span>{formattedDate} at {time}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500" />
            <span>{venue}, {city}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {tags.slice(0, 2).map((tag, index) => (
            <span 
              key={index} 
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
            >
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              +{tags.length - 2}
            </span>
          )}
        </div>

        {/* Price and Tickets */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">
              {formatThaiPrice(priceRange.min)} - {formatThaiPrice(priceRange.max)}
            </div>
            {originalPriceRange && (
              <div className="text-xs text-gray-500 line-through">
                {formatThaiPrice(originalPriceRange.min)} - {formatThaiPrice(originalPriceRange.max)}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-700">{availableTickets} left</div>
            <div className="text-xs text-gray-500">{totalTickets} total</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;