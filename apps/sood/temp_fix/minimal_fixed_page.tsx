"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useCart } from '@/app/contexts/CartContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import MarketplaceChatBot from '@/app/components/MarketplaceChatBot';
import Breadcrumb, { breadcrumbConfigs } from '@/app/components/Breadcrumb';
import { UserIcon as User, TicketIcon as Ticket, ShoppingCartIcon as ShoppingCart, HeartIcon as Heart, StarIcon as Star, ArrowTrendingUpIcon as TrendingUp, CurrencyDollarIcon as DollarSign, CalendarIcon as Calendar, MapPinIcon as MapPin, ClockIcon as Clock, ArrowDownTrayIcon as Download, EyeIcon as Eye, ChatBubbleLeftRightIcon as MessageCircle, Cog6ToothIcon as Settings, BellIcon as Bell, ShieldCheckIcon as Shield, CreditCardIcon as CreditCard, ClockIcon as History, DocumentTextIcon as FileText, PlusIcon as Plus, PencilIcon as Edit, TrashIcon as Trash2, ArrowRightOnRectangleIcon as LogOut, QuestionMarkCircleIcon as HelpCircle, ChevronDownIcon as ChevronDown, ChevronUpIcon as ChevronUp, MinusIcon } from '@heroicons/react/24/outline';

// All interfaces remain the same
interface MemberStats {
  ticketsListed: number;
  ticketsSold: number;
  ticketsBought: number;
  totalEarnings: number;
  totalSpent: number;
  rating: number;
  reviewCount: number;
}

interface TicketListing {
  id: string;
  title: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  price: number;
  originalPrice: number;
  status: 'active' | 'sold' | 'pending' | 'expired';
  views: number;
  favorites: number;
  category: string;
  section: string;
  row: string;
  seat: string;
  image: string;
  description: string;
  createdAt: string;
}

interface Order {
  id: string;
  title: string;
  venue: string;
  date: string;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  orderDate: string;
  tickets: number;
}

interface Review {
  id: string;
  reviewer: string;
  rating: number;
  comment: string;
  date: string;
  type: 'buyer' | 'seller';
}

const MemberDashboard: React.FC = () => {
  // State variables and hooks
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  // Set initial chatbox state to minimized by default for all devices
  const [isChatboxMinimized, setIsChatboxMinimized] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Remove the useEffect that changes the chatbox state based on screen size
  // This ensures the chatbox starts minimized on all devices

  // FAQ Data remains the same
  const faqData = [
    {
      id: 'selling-tickets',
      question: 'How do I sell tickets on the platform?',
      answer: 'To sell tickets, go to "My Tickets" tab and click "Add Ticket". Upload clear photos of your tickets, set a competitive price, and provide detailed event information. Our verification process ensures secure transactions.'
    },
    // Other FAQ items...
    {
      id: 'account-verification',
      question: 'Why verify my account?',
      answer: 'Verified accounts build buyer trust, get priority listing visibility, and access to premium features. Upload ID document and phone verification for instant verification.'
    }
  ];

  // UseEffect and handlers remain the same
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'my-tickets', 'orders', 'favorites', 'reviews', 'payments', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`/member/dashboard?${params.toString()}`);
  };
  
  const memberStats: MemberStats = {
    ticketsListed: 24,
    ticketsSold: 18,
    ticketsBought: 32,
    totalEarnings: 4250,
    totalSpent: 2890,
    rating: 4.8,
    reviewCount: 127
  };

  const recentListings: TicketListing[] = [
    {
      id: '1',
      title: 'Taylor Swift - The Eras Tour Bangkok',
      venue: 'Rajamangala National Stadium',
      city: 'Bangkok, Thailand',
      date: '2024-12-15',
      time: '19:30',
      price: 12500,
      originalPrice: 15000,
      status: 'active',
      views: 189,
      favorites: 24,
      category: 'Concert',
      section: 'Floor A',
      row: '5',
      seat: '101-102',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      description: 'Amazing floor seats with perfect view of the stage.',
      createdAt: '2024-10-15'
    },
    {
      id: '2',
      title: 'Thailand Premier League Final',
      venue: 'Chang Arena',
      city: 'Buriram, Thailand',
      date: '2024-11-28',
      time: '20:00',
      price: 8500,
      originalPrice: 10000,
      status: 'sold',
      views: 256,
      favorites: 18,
      category: 'Sports',
      section: '111',
      row: '12',
      seat: '15-16',
      image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400',
      description: 'Premium seats for the championship match.',
      createdAt: '2024-09-20'
    }
  ];

  const recentOrders: Order[] = [
    {
      id: 'ORD-001',
      title: 'Hamilton Broadway',
      venue: 'Richard Rodgers Theatre',
      date: '2024-12-01',
      price: 350,
      status: 'confirmed',
      orderDate: '2024-10-15',
      tickets: 2
    },
    {
      id: 'ORD-002',
      title: 'NBA Finals Game 7',
      venue: 'Chase Center',
      date: '2024-10-25',
      price: 890,
      status: 'completed',
      orderDate: '2024-09-20',
      tickets: 1
    }
  ];

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'sold': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'expired': return 'text-red-600 bg-red-50 border-red-200';
      case 'confirmed': return 'text-green-600 bg-green-50 border-green-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      case 'completed': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const myTicketListings = [...recentListings];
  const filteredTickets = myTicketListings.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(ticketSearchQuery.toLowerCase()) ||
                         ticket.venue.toLowerCase().includes(ticketSearchQuery.toLowerCase());
    const matchesStatus = ticketStatusFilter === 'all' || ticket.status === ticketStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const ticketTabs = [
    { id: 'all', label: 'All Tickets', count: myTicketListings.length },
    { id: 'active', label: 'Active', count: myTicketListings.filter(t => t.status === 'active').length },
    { id: 'sold', label: 'Sold', count: myTicketListings.filter(t => t.status === 'sold').length },
    { id: 'pending', label: 'Pending', count: myTicketListings.filter(t => t.status === 'pending').length },
    { id: 'expired', label: 'Expired', count: myTicketListings.filter(t => t.status === 'expired').length }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'my-tickets', label: 'My Tickets', icon: Ticket },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Mock data for favorites
  const favoriteItems = recentListings.map(listing => ({
    id: listing.id,
    title: listing.title,
    venue: listing.venue,
    city: listing.city,
    date: listing.date,
    time: listing.time,
    price: listing.price,
    originalPrice: listing.originalPrice,
    image: listing.image,
    category: listing.category,
    seller: {
      name: 'ThaiTickets Pro',
      rating: 4.9,
      soldCount: 2847,
      verified: true
    },
    addedDate: '2024-10-20'
  }));

  const reviews = [
    {
      id: '1',
      reviewer: 'Sarah Johnson',
      rating: 5,
      comment: 'Great seller! Tickets were exactly as described and delivered quickly.',
      date: '2024-10-20',
      type: 'buyer'
    },
    {
      id: '2',
      reviewer: 'Mike Chen',
      rating: 4,
      comment: 'Smooth transaction, would buy again.',
      date: '2024-10-18',
      type: 'buyer'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Breadcrumb items={breadcrumbConfigs.member.dashboard} />
          
          <button 
            className="lg:hidden p-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle dashboard menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user?.name?.charAt(0) || 'J'}
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Welcome back, {user?.name || 'Member'}!</h1>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">{memberStats.rating}</span>
                    <span className="text-sm text-gray-500">({memberStats.reviewCount} reviews)</span>
                  </div>
                  <span className="text-sm text-gray-500">Member since {user?.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'Jan 2023'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end md:justify-end sm:space-x-4 md:space-x-6 bg-white sm:bg-transparent md:bg-transparent p-3 sm:p-0 md:p-0 rounded-lg sm:rounded-none md:rounded-none shadow-sm sm:shadow-none md:shadow-none border border-gray-100 sm:border-0 md:border-0">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-blue-600">{memberStats.ticketsSold}</div>
                <div className="text-xs text-gray-500">Sold</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-green-600">฿{memberStats.totalEarnings.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Earned</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-purple-600">{memberStats.ticketsListed}</div>
                <div className="text-xs text-gray-500">Listed</div>
              </div>
              {totalItems > 0 && (
                <div className="text-center hidden sm:block md:block">
                  <div className="flex items-center space-x-1 text-blue-600 justify-center">
                    <ShoppingCart className="w-5 h-5" />
                    <span className="text-lg font-bold">{totalItems}</span>
                  </div>
                  <div className="text-xs text-gray-500">In Cart</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu (omitted for brevity) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Content omitted for brevity */}
        </div>
      )}

      <div className="w-full px-4 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-6 md:py-8 lg:py-8">
        <div className="flex flex-col md:flex-row lg:flex-row gap-4 md:gap-4 lg:gap-8 max-w-full">
          {/* Sidebar Navigation */}
          <aside className="w-full md:w-52 lg:w-64 flex-shrink-0 space-y-4 md:space-y-6 order-2 md:order-1 lg:order-1 hidden md:block lg:block">
            {/* Main Navigation - Desktop only */}
            <nav className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <ul className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <li key={tab.id}>
                      <button
                        onClick={() => handleTabChange(tab.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-600 text-white border border-blue-600'
                            : 'text-gray-700 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* FAQs Section - Desktop only */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4 lg:mt-0 hidden md:block lg:block">
              {/* FAQ content omitted for brevity */}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 w-full order-1 md:order-2 lg:order-2 mb-6 md:mb-0 lg:mb-0 md:mr-4 lg:mr-8">
            {/* Mobile tab indicator - Hidden on tablet and desktop */}
            <div className="md:hidden lg:hidden mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="flex items-center space-x-2">
                {(() => {
                  const activeTabInfo = tabs.find(tab => tab.id === activeTab);
                  const Icon = activeTabInfo?.icon || User;
                  return (
                    <>
                      <Icon className="w-5 h-5 text-blue-600" />
                      <h2 className="text-lg font-semibold text-gray-900">{activeTabInfo?.label || 'Overview'}</h2>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6 sm:space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">Tickets Listed</p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-800">{memberStats.ticketsListed}</p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Ticket className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">Tickets Sold</p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-800">{memberStats.ticketsSold}</p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Earnings</p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-800">฿{memberStats.totalEarnings.toLocaleString()}</p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">Purchases</p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-800">{memberStats.ticketsBought}</p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity - Fixed structure */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  {/* Recent Listings */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Listings</h3>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All</button>
                    </div>
                    <div className="p-3 sm:p-4">
                      {recentListings.map((ticket) => (
                        <div key={ticket.id} className="bg-gray-50 rounded-lg mb-3 last:mb-0">
                          <div className="px-3 py-3 sm:px-4 sm:py-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-1 sm:mb-0 pr-4">{ticket.title}</h4>
                              <p className="font-semibold text-gray-900 text-sm whitespace-nowrap">฿{ticket.price.toLocaleString()}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                              <p className="text-xs text-gray-600 mb-2 sm:mb-0">{ticket.venue} • {ticket.date}</p>
                              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mr-2 sm:mr-3 ${getStatusColor(ticket.status)}`}>
                                  {ticket.status}
                                </span>
                                <div className="flex items-center text-xs text-gray-500">
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  <span>{ticket.views}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Orders */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All</button>
                    </div>
                    <div className="p-3 sm:p-4">
                      {recentOrders.map((order) => (
                        <div key={order.id} className="bg-gray-50 rounded-lg mb-3 last:mb-0">
                          <div className="px-3 py-3 sm:px-4 sm:py-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-1 sm:mb-0 pr-4">{order.title}</h4>
                              <div className="flex items-center">
                                <p className="font-semibold text-gray-900 text-sm whitespace-nowrap mr-1">฿{order.price.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">({order.id})</p>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                              <p className="text-xs text-gray-600 mb-2 sm:mb-0">{order.venue} • {order.date}</p>
                              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mr-2 sm:mr-3 ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </span>
                                <div className="flex items-center text-xs text-gray-500">
                                  <span>{order.tickets} ticket(s)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other tabs omitted for brevity */}
            
          </main>

          {/* Right Sidebar - Chat (omitted for brevity) */}
          <aside className="hidden lg:block w-80 flex-shrink-0 order-3 z-10">
            {/* Chat content omitted for brevity */}
          </aside>

          {/* Mobile Chat Button (omitted for brevity) */}
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;