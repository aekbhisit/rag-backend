'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Star, Ticket, Shield, Users } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTicketAlt } from '@fortawesome/free-solid-svg-icons';
import { useCart } from '@/app/contexts/CartContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface TicketCardProps {
  id: string;
  eventId: string;
  title: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  price: number;
  originalPrice?: number;
  image: string;
  verified: boolean;
  seller: string;
  sellerId: string;
  sellerRating: number;
  sellerSales: number;
  description: string;
  seatType: string;
  section: string;
  row: string;
  seats: string[];
  quantity: number;
  benefits: string[];
  onAddToCart?: (ticket: any) => void;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
  isInCart?: boolean;
}

const TicketCard: React.FC<TicketCardProps> = ({
  id,
  eventId,
  title,
  venue,
  city,
  date,
  time,
  price,
  originalPrice,
  image,
  verified,
  seller,
  sellerId,
  sellerRating,
  sellerSales,
  description,
  seatType,
  section,
  row,
  seats,
  quantity,
  benefits,
  onAddToCart,
  onFavorite,
  isFavorite,
  isInCart
}) => {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const formatThaiPrice = (price: number) => {
    return `฿${price.toLocaleString()}`;
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const ticketItem = {
      id,
      title: `${title} - ${seatType}`,
      venue,
      city,
      date,
      time,
      price,
      originalPrice,
      image,
      seller,
      verified,
      maxQuantity: quantity,
      section,
      row,
      seat: seats.join(', ')
    };

    if (onAddToCart) {
      onAddToCart(ticketItem);
    } else {
      addToCart(ticketItem);
    }
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    if (onFavorite) {
      onFavorite(id);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Ticket Image */}
          <div className="lg:w-32 flex-shrink-0">
            <img 
              src={image} 
              alt={`${seatType} ticket`} 
              className="w-full h-32 object-cover rounded-lg"
            />
          </div>
          
          {/* Ticket Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {seatType} - Section {section}, Row {row}
                </h3>
                <p className="text-gray-600 mb-3">{description}</p>
                
                {/* Seat Details */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center">
                    <Ticket className="w-4 h-4 mr-1" />
                    {quantity} tickets available
                  </span>
                  <span>Seats: {seats.join(', ')}</span>
                </div>

                {/* Benefits */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {benefits.map((benefit, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{formatThaiPrice(price)}</div>
                {originalPrice && originalPrice > price && (
                  <div className="text-sm text-gray-500 line-through">{formatThaiPrice(originalPrice)}</div>
                )}
                <div className="text-sm text-green-600 font-medium">
                  Save {formatThaiPrice((originalPrice || 0) - price)}
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                  {seller.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{seller}</p>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span>{sellerRating}</span>
                    <span>•</span>
                    <span>{sellerSales} sales</span>
                  </div>
                </div>
                {verified && (
                  <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {onFavorite && (
                  <button
                    onClick={handleFavorite}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <FontAwesomeIcon 
                      icon={faTicketAlt} 
                      className={`w-5 h-5 ${isFavorite ? 'text-red-500' : 'text-gray-400'}`} 
                    />
                  </button>
                )}
                
                <button
                  onClick={handleAddToCart}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isInCart
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isInCart ? '✓ Added to Cart' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;