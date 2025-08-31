"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Search, Filter, Calendar, MapPin, Star, Heart, ShoppingCart, User, Menu, X, ChevronDown, TrendingUp, Fire } from 'lucide-react';

// Dynamically import AgentIntegratedChatApp to avoid SSR issues
const AgentIntegratedChatApp = dynamic(
  () => import('@/app/components/AgentIntegratedChatApp'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">Loading AI Assistant...</div>
  }
);

/**
 * Enhanced Ticket Marketplace Page
 * 
 * Professional marketplace with advanced features, member system, and better UX/UI
 */

interface Ticket {
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
  featured: boolean;
  seller: string;
  description: string;
}

interface User {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  isLoggedIn: boolean;
}

const MarketplacePage: React.FC = () => {
  const [user, setUser] = useState<User>({
    id: '1',
    name: 'John Doe',
    avatar: '👤',
    rating: 4.8,
    reviewCount: 127,
    isLoggedIn: true
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  const categories = [
    { id: 'all', name: 'All Events', icon: '🎪', count: 2847 },
    { id: 'concerts', name: 'Concerts', icon: '🎵', count: 1205 },
    { id: 'sports', name: 'Sports', icon: '⚽', count: 892 },
    { id: 'theater', name: 'Theater', icon: '🎭', count: 456 },
    { id: 'comedy', name: 'Comedy', icon: '😂', count: 234 },
    { id: 'festivals', name: 'Festivals', icon: '🎪', count: 178 },
  ];

  const featuredEvents = [
    {
      id: '1',
      title: 'Taylor Swift - The Eras Tour',
      category: 'concerts',
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
      featured: true,
      seller: 'VIP Tickets Co.',
      description: 'Floor seats with amazing view. Section A, Row 5. Guaranteed authentic tickets.'
    },
    {
      id: '2',
      title: 'Lakers vs Warriors',
      category: 'sports',
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
      featured: true,
      seller: 'Sports Hub',
      description: 'Premium lower bowl seats. Section 111, perfect view of the court.'
    },
    {
      id: '3',
      title: 'Hamilton Broadway',
      category: 'theater',
      venue: 'Richard Rodgers Theatre',
      city: 'New York, NY',
      date: '2024-12-01',
      time: '20:00',
      price: 350,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      verified: true,
      rating: 4.8,
      soldCount: 934,
      featured: false,
      seller: 'Broadway Direct',
      description: 'Orchestra seats with excellent view. Row H, center section.'
    }
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implement search logic
  };

  const toggleFavorite = (ticketId: string) => {
    setFavorites(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-lg">
                <span className="text-xl font-bold">🎫</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  TicketHub
                </h1>
                <p className="text-xs text-gray-500">Your Event Marketplace</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search events, venues, or artists..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* AI Chat Toggle */}
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              >
                <span className="text-lg">🤖</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></span>
              </button>

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                <span className="text-lg">🔔</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* User Profile */}
              <div className="relative">
                <button
                  onClick={() => setShowMemberMenu(!showMemberMenu)}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user.name.charAt(0)}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {/* Member Dropdown */}
                {showMemberMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm text-gray-600">{user.rating} ({user.reviewCount} reviews)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-2">
                      <a href="/member/dashboard" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50">
                        <User className="w-4 h-4 mr-3" />
                        My Dashboard
                      </a>
                      <a href="/member/tickets" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50">
                        <span className="w-4 h-4 mr-3">🎫</span>
                        My Tickets
                      </a>
                      <a href="/member/orders" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50">
                        <ShoppingCart className="w-4 h-4 mr-3" />
                        Orders & History
                      </a>
                      <a href="/member/favorites" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50">
                        <Heart className="w-4 h-4 mr-3" />
                        Favorites
                      </a>
                      <a href="/member/reviews" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50">
                        <Star className="w-4 h-4 mr-3" />
                        Reviews
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Filters & Categories */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{category.icon}</span>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{category.count}</span>
                  </button>
                ))}
              </div>

              {/* Price Range Filter */}
              <div className="mt-8">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Price Range</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>$0</span>
                    <span>${priceRange[1]}</span>
                  </div>
                </div>
              </div>

              {/* Location Filter */}
              <div className="mt-8">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Location</h4>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Locations</option>
                  <option value="new-york">New York</option>
                  <option value="los-angeles">Los Angeles</option>
                  <option value="chicago">Chicago</option>
                  <option value="miami">Miami</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Featured Section */}
            <section className="mb-8">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white mb-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Fire className="w-6 h-6 text-yellow-300" />
                  <h2 className="text-2xl font-bold">Hot Events This Week</h2>
                </div>
                <p className="text-purple-100 mb-6">Don't miss these trending events with high demand!</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {featuredEvents.filter(event => event.featured).map((event) => (
                    <div key={event.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-colors cursor-pointer">
                      <h3 className="font-semibold mb-2">{event.title}</h3>
                      <p className="text-sm text-purple-100 mb-2">{event.venue}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">${event.price}</span>
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-sm">{event.soldCount} sold</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Sort & Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">All Events</h2>
                <p className="text-gray-600">Showing 1,247 results</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="date">Date</option>
                  <option value="popularity">Most Popular</option>
                </select>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </button>
              </div>
            </div>

            {/* Tickets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {featuredEvents.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group">
                  {/* Ticket Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={ticket.image}
                      alt={ticket.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Overlay Elements */}
                    <div className="absolute top-3 left-3">
                      {ticket.verified && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          ✅ Verified
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => toggleFavorite(ticket.id)}
                      className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favorites.includes(ticket.id)
                            ? 'text-red-500 fill-red-500'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>

                    {/* Price Badge */}
                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2">
                      <div className="text-lg font-bold text-gray-900">${ticket.price}</div>
                      {ticket.originalPrice && (
                        <div className="text-sm text-gray-500 line-through">${ticket.originalPrice}</div>
                      )}
                    </div>
                  </div>

                  {/* Ticket Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{ticket.title}</h3>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">{ticket.venue}, {ticket.city}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">{new Date(ticket.date).toLocaleDateString()} at {ticket.time}</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{ticket.description}</p>

                    {/* Rating & Seller */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">{ticket.rating}</span>
                        <span className="text-sm text-gray-500">({ticket.soldCount} sold)</span>
                      </div>
                      <span className="text-sm text-gray-500">by {ticket.seller}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        Buy Now
                      </button>
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            <div className="text-center mt-8">
              <button className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors">
                Load More Events
              </button>
            </div>
          </main>

          {/* Right Sidebar - AI Chat */}
          {isChatOpen && (
            <aside className="hidden xl:block w-96 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-[600px] sticky top-24">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Ask me anything about events!</p>
                </div>
                <div className="h-[calc(100%-80px)]">
                  <AgentIntegratedChatApp 
                    agentSetKey="ticketMarketplace"
                    className="h-full"
                  />
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplacePage;