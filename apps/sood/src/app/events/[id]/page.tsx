'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { useCart } from '@/app/contexts/CartContext';
import Header from '@/app/components/Header';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Star, 
  Heart, 
  Share2, 
  Shield, 
  Users, 
  TrendingUp,
  Filter,
  ChevronDown,
  ShoppingCart,
  User,
  Eye,
  ArrowLeft,
  Ticket
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTicket } from '@fortawesome/free-solid-svg-icons';

// Mock data for event details
const mockEventData = {
  '1': {
    id: '1',
    title: 'Muay Thai Championship 2024',
    description: 'Experience the ultimate Muay Thai championship featuring top fighters from across Thailand and Southeast Asia. Witness legendary battles in the heart of Bangkok.',
    longDescription: 'The Muay Thai Championship 2024 brings together the most skilled fighters from Thailand, Myanmar, Cambodia, and Laos for an unforgettable night of traditional martial arts. This premium event features multiple championship bouts, traditional ceremonies, and cultural performances. The venue offers world-class facilities with excellent views from every seat.',
    date: '2024-12-15',
    time: '19:00',
    venue: 'Rajadamnern Stadium',
    city: 'Bangkok',
    address: '1 Ratchadamnoen Nok Ave, Pom Prap Sattru Phai, Bangkok 10100',
    category: 'Sports',
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800',
    organizer: 'Thai Boxing Association',
    rating: 4.8,
    totalTickets: 156,
    soldTickets: 89,
    priceRange: { min: 800, max: 5000 },
    featured: true,
    tags: ['Championship', 'Muay Thai', 'Sports', 'Traditional'],
  }
};

// Mock tickets data for this event
const mockTicketsData = [
  {
    id: 'tkt001',
    eventId: '1',
    section: 'Ringside',
    row: 'A',
    seats: ['1', '2'],
    price: 5000,
    originalPrice: 6000,
    seller: 'Bangkok Sports Tickets',
    sellerId: 'seller001',
    sellerRating: 4.9,
    sellerSales: 1250,
    quantity: 2,
    description: 'Premium ringside seats with the best view of all action. Includes complimentary drinks and snacks.',
    verified: true,
    seatType: 'Premium Ringside',
    benefits: ['Best view', 'Complimentary refreshments', 'VIP entrance'],
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400'
  },
  {
    id: 'tkt002',
    eventId: '1',
    section: 'VIP',
    row: 'B',
    seats: ['15', '16', '17', '18'],
    price: 3200,
    originalPrice: 4000,
    seller: 'ThaiTicket Pro',
    sellerId: 'seller002',
    sellerRating: 4.7,
    sellerSales: 890,
    quantity: 4,
    description: 'VIP section with excellent views and access to VIP lounge.',
    verified: true,
    seatType: 'VIP',
    benefits: ['VIP lounge access', 'Great view', 'Priority entrance'],
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400'
  },
  {
    id: 'tkt003',
    eventId: '1',
    section: 'General',
    row: 'J',
    seats: ['8', '9'],
    price: 1200,
    originalPrice: 1500,
    seller: 'Bangkok Events',
    sellerId: 'seller003',
    sellerRating: 4.5,
    sellerSales: 456,
    quantity: 2,
    description: 'General admission with good view of the ring.',
    verified: false,
    seatType: 'General Admission',
    benefits: ['Good view', 'Standard entrance'],
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
  },
  {
    id: 'tkt004',
    eventId: '1',
    section: 'Upper',
    row: 'M',
    seats: ['20', '21', '22'],
    price: 800,
    originalPrice: 1000,
    seller: 'Sports Ticket Hub',
    sellerId: 'seller004',
    sellerRating: 4.6,
    sellerSales: 678,
    quantity: 3,
    description: 'Upper level seats with clear view of the entire arena.',
    verified: true,
    seatType: 'Upper Level',
    benefits: ['Arena view', 'Affordable price'],
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400'
  }
];

const EventDetailPage = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { addToCart, totalItems, isInCart } = useCart();
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('price-low');
  const [filterSection, setFilterSection] = useState('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<string[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 6; // Show 6 tickets per page (2 rows of 3 on desktop)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const eventData = mockEventData[eventId as keyof typeof mockEventData];
      if (eventData) {
        setEvent(eventData);
        setTickets(mockTicketsData.filter(ticket => ticket.eventId === eventId));
      }
      setLoading(false);
    }, 500);
  }, [eventId]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showMobileMenu && !target.closest('.mobile-menu-container') && !target.closest('.mobile-menu-button')) {
        setShowMobileMenu(false);
      }
      if (showMemberMenu && !target.closest('.member-menu-container') && !target.closest('.member-menu-button')) {
        setShowMemberMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileMenu, showMemberMenu]);

  const formatThaiPrice = (price: number) => {
    return `฿${price.toLocaleString()}`;
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Could implement search functionality here
  };

  const handleAddTicketToCart = (ticket: any) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    addToCart({
      id: ticket.id,
      title: `${event.title} - ${ticket.seatType}`,
      venue: event.venue,
      city: event.city,
      date: event.date,
      time: event.time,
      price: ticket.price,
      originalPrice: ticket.originalPrice,
      image: ticket.image,
      category: event.category,
      seller: ticket.seller,
      verified: ticket.verified,
      maxQuantity: ticket.quantity
    });
  };

  const toggleFavorite = (ticketId: string) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    setFavorites(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const updateCartTicketIds = (ticketId: string) => {
    setCart(prev => [...prev, ticketId]);
    // Could show toast notification here
  };

  const checkTicketInCart = (ticketId: string) => cart.includes(ticketId);

  const filteredAndSortedTickets = tickets
    .filter(ticket => filterSection === 'all' || ticket.seatType.toLowerCase().includes(filterSection.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'seller-rating':
          return b.sellerRating - a.sellerRating;
        default:
          return 0;
      }
    });

  // Pagination logic
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredAndSortedTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredAndSortedTickets.length / ticketsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Using the new reusable Header component */}
      <Header />
      
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/marketplace" className="text-blue-600 hover:text-blue-800 font-medium">
              Events
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-500 truncate max-w-xs sm:max-w-md">
              {event?.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading event details...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && !event && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Event Not Found</h1>
            <Link href="/marketplace" className="text-blue-600 hover:text-blue-700">
              Return to Marketplace
            </Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && event && (
        <>
          {/* Event Header - Mobile Optimized */}
          <div className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="lg:grid lg:grid-cols-12 lg:gap-8">
                {/* Event Image */}
                <div className="lg:col-span-5 mb-6 lg:mb-0">
                  <div className="relative h-64 sm:h-80 lg:h-96 rounded-xl overflow-hidden">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <div className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
                        <Calendar className="w-4 h-4 mr-1" />
                        {event.category}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="lg:col-span-7">
                  <div className="mb-4">
                    <button
                      onClick={() => router.push('/marketplace')}
                      className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Events
                    </button>
                    
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                      {event.title}
                    </h1>
                    
                    <p className="text-base sm:text-lg text-gray-600 mb-5">{event.description}</p>
                  </div>

                  {/* Event Info Grid - Mobile Responsive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div className="space-y-4">
                      <div className="flex items-start text-gray-700">
                        <Calendar className="w-5 h-5 mr-3 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Date & Time</p>
                          <p className="text-sm text-gray-600">
                            {new Date(event.date).toLocaleDateString('en-US', { 
                              weekday: 'long',
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })} at {event.time}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start text-gray-700">
                        <MapPin className="w-5 h-5 mr-3 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">{event.venue}</p>
                          <p className="text-sm text-gray-600">{event.address}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start text-gray-700">
                        <Users className="w-5 h-5 mr-3 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Tickets Available</p>
                          <p className="text-sm text-gray-600">
                            {event.totalTickets - event.soldTickets} of {event.totalTickets} remaining
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start text-gray-700">
                        <TrendingUp className="w-5 h-5 mr-3 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Price Range</p>
                          <p className="text-sm text-gray-600">
                            {formatThaiPrice(event.priceRange.min)} - {formatThaiPrice(event.priceRange.max)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Mobile Responsive */}
                  <div className="flex flex-wrap gap-3">
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Heart className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Save Event</span>
                      <span className="sm:hidden">Save</span>
                    </button>
                    <button className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      <Share2 className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Share</span>
                      <span className="sm:hidden">Share</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tickets Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Section Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Tickets</h2>
              <p className="text-gray-600">Choose from {tickets.length} ticket listings by verified sellers</p>
            </div>

            {/* Filters and Sort - Enhanced Mobile Responsive Design */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Section</label>
                  <div className="relative">
                    <select
                      value={filterSection}
                      onChange={(e) => setFilterSection(e.target.value)}
                      className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-10 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Sections</option>
                      <option value="ringside">Ringside</option>
                      <option value="vip">VIP</option>
                      <option value="general">General</option>
                      <option value="upper">Upper Level</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-10 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="seller-rating">Seller Rating</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Filter Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200 sm:hidden">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium">{currentTickets.length}</span> of <span className="font-medium">{filteredAndSortedTickets.length}</span> tickets
                  </div>
                  <div className="text-sm text-gray-600">
                    Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tickets List - Improved Responsive Layout with Pagination */}
            <div className="space-y-4">
              {currentTickets.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Desktop Layout - 3 Column Grid */}
                  <div className="hidden sm:grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
                    {/* Ticket Image */}
                    <div className="lg:col-span-2">
                      <img 
                        src={ticket.image} 
                        alt={`${ticket.seatType} ticket`} 
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    </div>
                    
                    {/* Ticket Info */}
                    <div className="lg:col-span-5">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Round {event.date} - {ticket.section} Zone, {ticket.seatType}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{ticket.description}</p>
                      
                      {/* Seat Details */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
                        <span className="flex items-center">
                          <Ticket className="w-4 h-4 mr-1" />
                          {ticket.quantity} tickets
                        </span>
                        <span>Seats: {ticket.seats.join(', ')}</span>
                      </div>

                      {/* Benefits */}
                      <div className="flex flex-wrap gap-2">
                        {ticket.benefits.map((benefit: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                            {benefit}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Seller Info */}
                    <div className="lg:col-span-3">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {ticket.seller.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{ticket.seller}</p>
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span>{ticket.sellerRating}</span>
                            <span>•</span>
                            <span>{ticket.sellerSales} sales</span>
                          </div>
                        </div>
                      </div>
                      {ticket.verified && (
                        <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          <Shield className="w-3 h-3 mr-1" />
                          Verified
                        </div>
                      )}
                    </div>
                    
                    {/* Price and Actions */}
                    <div className="lg:col-span-2 flex flex-col items-end justify-between">
                      <div className="text-right mb-4">
                        <div className="text-xl font-bold text-gray-900">{formatThaiPrice(ticket.price)}</div>
                        {ticket.originalPrice > ticket.price && (
                          <div className="text-xs text-gray-500 line-through">{formatThaiPrice(ticket.originalPrice)}</div>
                        )}
                        <div className="text-xs text-green-600 font-medium mt-1">
                          Save {formatThaiPrice(ticket.originalPrice - ticket.price)}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleFavorite(ticket.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              favorites.includes(ticket.id)
                                ? 'text-red-500 fill-red-500'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                        
                        <button
                          onClick={() => handleAddTicketToCart(ticket)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isInCart(ticket.id)
                              ? 'bg-green-100 text-green-700 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isInCart(ticket.id) ? '✓ Added' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile Layout - 2 Row Layout */}
                  <div className="sm:hidden p-4">
                    {/* Top Row: Image and Ticket Info */}
                    <div className="flex gap-4 mb-3">
                      {/* Ticket Image */}
                      <div className="w-20 flex-shrink-0">
                        <img 
                          src={ticket.image} 
                          alt={`${ticket.seatType} ticket`} 
                          className="w-full h-16 object-cover rounded-lg"
                        />
                      </div>
                      
                      {/* Ticket Info */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">
                          Round {event.date} - {ticket.section} Zone
                        </h3>
                        <p className="text-gray-600 text-xs mb-2 line-clamp-2">{ticket.description}</p>
                        
                        {/* Price and Rating */}
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold text-gray-900">{formatThaiPrice(ticket.price)}</div>
                          <div className="flex items-center space-x-1">
                            <div className="text-xs text-gray-500">{ticket.quantity} left</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom Row: Seller Info and Action Buttons */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                      {/* Seller Info */}
                      <div className="flex items-center flex-1">
                        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-xs mr-1">
                          {ticket.seller.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <span className="text-xs text-gray-700">{ticket.seller}</span>
                            {ticket.verified && (
                              <div className="inline-flex items-center px-1 py-0.5 bg-green-100 text-green-800 rounded-full text-xs ml-1">
                                <Shield className="w-2 h-2 mr-0.5" />
                                Verified
                              </div>
                            )}
                          </div>
                          <div className="flex items-center">
                            <Star className="w-3 h-3 text-yellow-400 fill-current mr-0.5" />
                            <span className="text-xs text-gray-600">{ticket.sellerRating}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleFavorite(ticket.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              favorites.includes(ticket.id)
                                ? 'text-red-500 fill-red-500'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                        
                        <button
                          onClick={() => handleAddTicketToCart(ticket)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            isInCart(ticket.id)
                              ? 'bg-green-100 text-green-700 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isInCart(ticket.id) ? '✓ Added' : 'Buy'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg border ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-full ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg border ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            )}

            {/* Event Description */}
            <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">About This Event</h3>
              <p className="text-gray-700 leading-relaxed mb-6">{event.longDescription}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Event Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Organizer</h4>
                  <p className="text-gray-700">{event.organizer}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EventDetailPage;