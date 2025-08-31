"use client";

import React, { useState } from 'react';
import { HeartIcon as Heart, CalendarIcon as Calendar, MapPinIcon as MapPin, StarIcon as Star, CurrencyDollarIcon as DollarSign, EyeIcon as Eye, ShareIcon as Share2, XMarkIcon as X, BellIcon as Bell, FunnelIcon as Filter } from '@heroicons/react/24/outline';

interface FavoriteItem {
  id: string;
  title: string;
  category: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  price: number;
  originalPrice?: number;
  image: string;
  verified: boolean;
  rating: number;
  soldCount: number;
  seller: string;
  description: string;
  dateAdded: string;
  priceDropped: boolean;
  notificationsEnabled: boolean;
}

const MemberFavoritesPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('dateAdded');
  const [searchQuery, setSearchQuery] = useState('');
  
  const favorites: FavoriteItem[] = [
    {
      id: '1',
      title: 'Taylor Swift - The Eras Tour',
      category: 'Concert',
      venue: 'MetLife Stadium',
      city: 'East Rutherford, NJ',
      date: '2024-12-15',
      time: '19:30',
      price: 450,
      originalPrice: 500,
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      verified: true,
      rating: 4.9,
      soldCount: 2847,
      seller: 'VIP Tickets Co.',
      description: 'Floor seats with amazing view. Section A, Row 5.',
      dateAdded: '2024-10-15',
      priceDropped: true,
      notificationsEnabled: true
    },
    {
      id: '2',
      title: 'Hamilton Broadway',
      category: 'Theater',
      venue: 'Richard Rodgers Theatre',
      city: 'New York, NY',
      date: '2024-12-01',
      time: '20:00',
      price: 350,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      verified: true,
      rating: 4.8,
      soldCount: 934,
      seller: 'Broadway Direct',
      description: 'Orchestra seats with excellent view.',
      dateAdded: '2024-10-10',
      priceDropped: false,
      notificationsEnabled: true
    },
    {
      id: '3',
      title: 'Lakers vs Warriors',
      category: 'Sports',
      venue: 'Crypto.com Arena',
      city: 'Los Angeles, CA',
      date: '2024-11-28',
      time: '20:00',
      price: 275,
      originalPrice: 320,
      image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400',
      verified: true,
      rating: 4.7,
      soldCount: 1892,
      seller: 'Sports Hub',
      description: 'Premium lower bowl seats.',
      dateAdded: '2024-10-05',
      priceDropped: true,
      notificationsEnabled: false
    }
  ];

  const categories = ['all', 'Concert', 'Sports', 'Theater', 'Comedy', 'Festival'];

  const removeFavorite = (id: string) => {
    // Implementation for removing favorite
    console.log('Remove favorite:', id);
  };

  const toggleNotifications = (id: string) => {
    // Implementation for toggling notifications
    console.log('Toggle notifications:', id);
  };

  const filteredFavorites = favorites.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.venue.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedFavorites = [...filteredFavorites].sort((a, b) => {
    switch (sortBy) {
      case 'dateAdded':
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      case 'eventDate':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'priceLow':
        return a.price - b.price;
      case 'priceHigh':
        return b.price - a.price;
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
              <p className="text-gray-600 mt-1">Keep track of events you're interested in</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <p className="text-sm text-blue-700">💡 Get notified when prices drop!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Favorites</p>
                <p className="text-2xl font-bold text-gray-900">{favorites.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-red-600 fill-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Price Drops</p>
                <p className="text-2xl font-bold text-gray-900">{favorites.filter(f => f.priceDropped).length}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Notifications</p>
                <p className="text-2xl font-bold text-gray-900">{favorites.filter(f => f.notificationsEnabled).length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Price</p>
                <p className="text-2xl font-bold text-gray-900">${Math.round(favorites.reduce((sum, f) => sum + f.price, 0) / favorites.length)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center space-x-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="dateAdded">Recently Added</option>
                <option value="eventDate">Event Date</option>
                <option value="priceLow">Price: Low to High</option>
                <option value="priceHigh">Price: High to Low</option>
              </select>
            </div>
            
            <input
              type="text"
              placeholder="Search favorites..."
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Favorites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedFavorites.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group">
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Overlay Elements */}
                <div className="absolute top-3 left-3 flex space-x-2">
                  {item.verified && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      ✅ Verified
                    </span>
                  )}
                  {item.priceDropped && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                      💸 Price Drop!
                    </span>
                  )}
                </div>
                
                <div className="absolute top-3 right-3 flex space-x-2">
                  <button
                    onClick={() => toggleNotifications(item.id)}
                    className={`w-8 h-8 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors ${
                      item.notificationsEnabled
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/90 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => removeFavorite(item.id)}
                    className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Price Badge */}
                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2">
                  <div className="text-lg font-bold text-gray-900">${item.price}</div>
                  {item.originalPrice && (
                    <div className="text-sm text-gray-500 line-through">${item.originalPrice}</div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{item.title}</h3>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{item.venue}, {item.city}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{new Date(item.date).toLocaleDateString()} at {item.time}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>

                {/* Rating & Seller */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">{item.rating}</span>
                    <span className="text-sm text-gray-500">({item.soldCount} sold)</span>
                  </div>
                  <span className="text-sm text-gray-500">by {item.seller}</span>
                </div>

                {/* Added Date */}
                <div className="text-xs text-gray-500 mb-4">
                  Added {new Date(item.dateAdded).toLocaleDateString()}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    Buy Now
                  </button>
                  <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {sortedFavorites.length === 0 && (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites found</h3>
            <p className="text-gray-600 mb-6">
              {selectedCategory === 'all' && !searchQuery
                ? 'Start adding events to your favorites to see them here.'
                : 'No favorites match your current filters.'}
            </p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Browse Events
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberFavoritesPage;