"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserIcon as User, TicketIcon as Ticket, ShoppingCartIcon as ShoppingCart, HeartIcon as Heart, StarIcon as Star, ArrowTrendingUpIcon as TrendingUp, CurrencyDollarIcon as DollarSign, CalendarIcon as Calendar, MapPinIcon as MapPin, ClockIcon as Clock, ArrowDownTrayIcon as Download, EyeIcon as Eye, ChatBubbleLeftRightIcon as MessageCircle, Cog6ToothIcon as Settings, BellIcon as Bell, ShieldCheckIcon as Shield, CreditCardIcon as CreditCard, ClockIcon as History, DocumentTextIcon as FileText, PlusIcon as Plus, PencilIcon as Edit, TrashIcon as Trash2, ArrowRightOnRectangleIcon as LogOut, QuestionMarkCircleIcon as HelpCircle, ChevronDownIcon as ChevronDown, ChevronUpIcon as ChevronUp, MinusIcon } from '@heroicons/react/24/outline';

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

const DashboardTabs = ({ 
  activeTab, 
  setActiveTab,
  ticketSearchQuery,
  setTicketSearchQuery,
  ticketStatusFilter,
  setTicketStatusFilter
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  ticketSearchQuery: string;
  setTicketSearchQuery: (query: string) => void;
  ticketStatusFilter: string;
  setTicketStatusFilter: (filter: string) => void;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for controlling view (list or add form)
  const [showAddTicketForm, setShowAddTicketForm] = useState(false);
  const [showCreateEventForm, setShowCreateEventForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    eventId: '',
    eventName: '',
    eventLocation: '',
    eventDate: '',
    eventWebsite: '',
    title: '',
    venue: '',
    city: '',
    date: '',
    time: '',
    price: '',
    originalPrice: '',
    category: '',
    section: '',
    row: '',
    seat: '',
    image: '',
    description: ''
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'my-tickets', 'orders', 'favorites', 'reviews', 'payments', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, setActiveTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`/member/dashboard?${params.toString()}`);
  };

  // Handle input changes for the add ticket form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTicket(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Update form state with file name
      setNewTicket(prev => ({
        ...prev,
        image: file.name
      }));
    }
  };

  // Handle form submission for adding a new ticket
  const handleAddTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a new ticket object with the form data
    const ticketToAdd = {
      id: `ticket-${Date.now()}`, // Generate a unique ID
      title: newTicket.title,
      venue: newTicket.venue,
      city: newTicket.city,
      date: newTicket.date,
      time: newTicket.time,
      price: parseFloat(newTicket.price) || 0,
      originalPrice: parseFloat(newTicket.originalPrice) || 0,
      status: 'active' as const,
      views: 0,
      favorites: 0,
      category: newTicket.category,
      section: newTicket.section,
      row: newTicket.row,
      seat: newTicket.seat,
      image: imagePreview || newTicket.image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      description: newTicket.description,
      createdAt: new Date().toISOString()
    };
    
    // Here you would typically send the data to your backend API
    console.log('Adding new ticket:', ticketToAdd);
    
    // Close the form
    setShowAddTicketForm(false);
    
    // Reset the form and image states
    setNewTicket({
      eventId: '',
      eventName: '',
      eventLocation: '',
      eventDate: '',
      eventWebsite: '',
      title: '',
      venue: '',
      city: '',
      date: '',
      time: '',
      price: '',
      originalPrice: '',
      category: '',
      section: '',
      row: '',
      seat: '',
      image: '',
      description: ''
    });
    setSelectedImage(null);
    setImagePreview(null);
    setShowCreateEventForm(false);
    
    // In a real application, you would update the tickets list here
    // For now, we'll just show an alert
    alert('Ticket added successfully!');
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
    <div className="space-y-6 sm:space-y-8">
      {/* Stats Grid */}
      {activeTab === 'overview' && (
        <>
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
          <div className="grid grid-cols-1 gap-5 md:gap-6">
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
        </>
      )}

      {/* My Tickets Tab */}
      {activeTab === 'my-tickets' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900">
                {showAddTicketForm ? 'Add New Ticket' : 'My Tickets'}
              </h2>
              {!showAddTicketForm && (
                <button 
                  onClick={() => setShowAddTicketForm(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Ticket
                </button>
              )}
            </div>
          </div>
          
          <div className="p-4 sm:p-4 md:p-3">
            {showAddTicketForm ? (
              // Add Ticket Form
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Ticket Details</h3>
                  <button
                    onClick={() => setShowAddTicketForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleAddTicketSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Image Upload - Moved to Top for OCR */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ticket Image (for OCR data extraction)
                      </label>
                      <div className="flex items-start space-x-4">
                        <div className="flex-1">
                          <input
                            type="file"
                            id="image"
                            name="image"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-medium
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100"
                          />
                          <p className="mt-1 text-xs text-gray-500">Upload a clear photo of your ticket for automatic data extraction</p>
                        </div>
                        {imagePreview && (
                          <div className="mt-2">
                            <img 
                              src={imagePreview} 
                              alt="Preview" 
                              className="h-16 w-16 object-cover rounded-md border border-gray-300"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Event Selection */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Event *
                      </label>
                      <div className="flex space-x-2">
                        <select
                          name="eventId"
                          value={newTicket.eventId || ''}
                          onChange={handleInputChange}
                          className="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border appearance-none bg-white"
                        >
                          <option value="">Choose an existing event</option>
                          <option value="event-1">Taylor Swift - The Eras Tour Bangkok</option>
                          <option value="event-2">Thailand Premier League Final</option>
                          <option value="event-3">Coldplay Music of the Spheres</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCreateEventForm(!showCreateEventForm)}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          {showCreateEventForm ? 'Cancel' : 'Create New'}
                        </button>
                      </div>
                    </div>

                    {/* Event Creation Form - Hidden by default */}
                    {showCreateEventForm && (
                      <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-3">Create New Event</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-1">
                              Event Name *
                            </label>
                            <input
                              type="text"
                              id="eventName"
                              name="eventName"
                              value={newTicket.eventName || ''}
                              onChange={handleInputChange}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                              placeholder="e.g., Taylor Swift - The Eras Tour"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="eventLocation" className="block text-sm font-medium text-gray-700 mb-1">
                              Location *
                            </label>
                            <input
                              type="text"
                              id="eventLocation"
                              name="eventLocation"
                              value={newTicket.eventLocation || ''}
                              onChange={handleInputChange}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                              placeholder="e.g., Rajamangala National Stadium"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
                              Event Date *
                            </label>
                            <input
                              type="date"
                              id="eventDate"
                              name="eventDate"
                              value={newTicket.eventDate || ''}
                              onChange={handleInputChange}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="eventWebsite" className="block text-sm font-medium text-gray-700 mb-1">
                              Event Website
                            </label>
                            <input
                              type="url"
                              id="eventWebsite"
                              name="eventWebsite"
                              value={newTicket.eventWebsite || ''}
                              onChange={handleInputChange}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                              placeholder="https://example.com/event"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ticket Details */}
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                        Ticket Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        id="title"
                        required
                        value={newTicket.title}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                        placeholder="e.g., Floor A, Row 5, Seats 101-102"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                        Category *
                      </label>
                      <div className="relative">
                        <select
                          name="category"
                          id="category"
                          required
                          value={newTicket.category}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border appearance-none bg-white"
                        >
                          <option value="">Select a category</option>
                          <option value="Concert">Concert</option>
                          <option value="Sports">Sports</option>
                          <option value="Theater">Theater</option>
                          <option value="Festival">Festival</option>
                          <option value="Other">Other</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-1">
                        Venue *
                      </label>
                      <input
                        type="text"
                        name="venue"
                        id="venue"
                        required
                        value={newTicket.venue}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                        placeholder="e.g., Rajamangala National Stadium"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        id="city"
                        required
                        value={newTicket.city}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                        placeholder="e.g., Bangkok, Thailand"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        name="date"
                        id="date"
                        required
                        value={newTicket.date}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                        Time *
                      </label>
                      <input
                        type="time"
                        name="time"
                        id="time"
                        required
                        value={newTicket.time}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                        Price (฿) *
                      </label>
                      <input
                        type="number"
                        name="price"
                        id="price"
                        required
                        min="0"
                        step="0.01"
                        value={newTicket.price}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                        placeholder="e.g., 12500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="originalPrice" className="block text-sm font-medium text-gray-700 mb-1">
                        Original Price (฿)
                      </label>
                      <input
                        type="number"
                        name="originalPrice"
                        id="originalPrice"
                        min="0"
                        step="0.01"
                        value={newTicket.originalPrice}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                        placeholder="e.g., 15000"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1">
                        Section
                      </label>
                      <input
                        type="text"
                        name="section"
                        id="section"
                        value={newTicket.section}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                        placeholder="e.g., Floor A"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="row" className="block text-sm font-medium text-gray-700 mb-1">
                        Row
                      </label>
                      <input
                        type="text"
                        name="row"
                        id="row"
                        value={newTicket.row}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                        placeholder="e.g., 5"
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="seat" className="block text-sm font-medium text-gray-700 mb-1">
                        Seat Numbers
                      </label>
                      <input
                        type="text"
                        name="seat"
                        id="seat"
                        value={newTicket.seat}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                        placeholder="e.g., 101-102"
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        id="description"
                        rows={3}
                        value={newTicket.description}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                        placeholder="Describe the ticket details, special features, etc."
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="flex justify-start space-x-3 pt-4">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Add Ticket
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddTicketForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Ticket List View
              <>
                <div className="flex flex-col gap-3 mb-4">
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="ค้นหากิจกรรม สถานที่ หรือศิลปิน... | Search events, venues, artists..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-800 placeholder-gray-500"
                      value={ticketSearchQuery}
                      onChange={(e) => setTicketSearchQuery(e.target.value)}
                    />
                  </div>
                
                  <div className="flex overflow-x-auto pb-1">
                    <div className="flex flex-nowrap space-x-1">
                      {ticketTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setTicketStatusFilter(tab.id)}
                          className={`px-1.5 py-0.5 text-xs whitespace-nowrap rounded-full ${
                            ticketStatusFilter === tab.id
                              ? 'bg-blue-100 text-blue-800 font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {tab.label} {tab.id !== 'all' && `(${tab.count})`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTickets.map((ticket) => (
                    <div key={ticket.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative">
                        <img src={ticket.image} alt={ticket.title} className="w-full h-40 object-cover" />
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-1">{ticket.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">{ticket.venue}</p>
                        <div className="flex items-center text-sm text-gray-500 mb-3">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>{new Date(ticket.date).toLocaleDateString()}</span>
                          <Clock className="w-4 h-4 ml-3 mr-1" />
                          <span>{ticket.time}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-bold text-gray-900">฿{ticket.price.toLocaleString()}</p>
                            {ticket.originalPrice > ticket.price && (
                              <p className="text-sm text-gray-500 line-through">฿{ticket.originalPrice.toLocaleString()}</p>
                            )}
                          </div>
                          
                          <div className="flex space-x-2">
                            <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Favorites Tab */}
      {activeTab === 'favorites' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Favorite Tickets</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favoriteItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative">
                    <img src={item.image} alt={item.title} className="w-full h-40 object-cover" />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        {item.category}
                      </span>
                    </div>
                    <button className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm border border-gray-200 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{item.venue}, {item.city}</p>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      <Clock className="w-4 h-4 ml-3 mr-1" />
                      <span>{item.time}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-gray-700">{item.seller.name}</span>
                      </div>
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        <span className="text-xs font-medium text-gray-800 ml-1">{item.seller.rating}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-lg font-bold text-gray-900">฿{item.price.toLocaleString()}</p>
                        {item.originalPrice > item.price && (
                          <p className="text-sm text-gray-500 line-through">฿{item.originalPrice.toLocaleString()}</p>
                        )}
                      </div>
                      <button className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        Buy
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {favoriteItems.length === 0 && (
              <div className="py-10 text-center">
                <Heart className="w-12 h-12 mx-auto text-gray-300" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No favorites yet</h3>
                <p className="mt-1 text-sm text-gray-500">Save your favorite tickets to find them easily later.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-xl font-bold text-gray-900">My Reviews</h2>
              <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                <span className="font-bold text-lg text-gray-800 mx-1">{memberStats.rating}</span>
                <span className="text-sm text-gray-500">({memberStats.reviewCount} reviews)</span>
              </div>
            </div>
          </div>
          
          <div className="px-4 py-4 sm:p-6">
            <div className="flex space-x-2 mb-6 border-b border-gray-200 pb-3">
              <button className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg">All Reviews</button>
              <button className="px-3 py-1.5 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100">As Buyer</button>
              <button className="px-3 py-1.5 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100">As Seller</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <div key={review.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{review.reviewer}</p>
                      <div className="flex items-center mt-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <span className="ml-2 text-xs text-gray-500">{new Date(review.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-100 capitalize">
                      {review.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{review.comment}</p>
                </div>
              ))}
            </div>
            
            {reviews.length === 0 && (
              <div className="py-10 text-center">
                <Star className="w-12 h-12 mx-auto text-gray-300" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No reviews yet</h3>
                <p className="mt-1 text-sm text-gray-500">Reviews will appear here after your transactions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
          </div>
          
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">Total Earnings</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">฿{memberStats.totalEarnings.toLocaleString()}</p>
                <p className="text-sm text-gray-600 mt-1">From {memberStats.ticketsSold} tickets sold</p>
              </div>
              
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CreditCard className="w-5 h-5 text-purple-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">Total Spent</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">฿{memberStats.totalSpent.toLocaleString()}</p>
                <p className="text-sm text-gray-600 mt-1">From {memberStats.ticketsBought} tickets purchased</p>
              </div>
            </div>
            
            <h3 className="font-semibold text-gray-900 mb-3">Recent Transactions</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">2024-10-15</td>
                    <td className="px-4 py-3 text-sm text-gray-900">Taylor Swift - The Eras Tour Bangkok</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">Sale</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-600">+฿12,500</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">2024-10-10</td>
                    <td className="px-4 py-3 text-sm text-gray-900">Hamilton Broadway</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">Purchase</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-red-600">-฿350</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">2024-09-25</td>
                    <td className="px-4 py-3 text-sm text-gray-900">Thailand Premier League Final</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">Sale</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-600">+฿8,500</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Account Settings</h2>
          </div>
          
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Settings - Left Column */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input 
                        type="text" 
                        id="name" 
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                        defaultValue="John Doe"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input 
                        type="email" 
                        id="email" 
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                        defaultValue="john.doe@example.com"
                        disabled
                      />
                      <p className="mt-1 text-xs text-gray-500">Your email cannot be changed</p>
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input 
                        type="tel" 
                        id="phone" 
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                        defaultValue="+66 89 123 4567"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                      <input 
                        type="password" 
                        id="current-password" 
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <input 
                        type="password" 
                        id="new-password" 
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <input 
                        type="password" 
                        id="confirm-password" 
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 p-2 border"
                      />
                    </div>
                    
                    <div className="pt-2">
                      <button className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notification Settings and Other Settings - Right Column */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="email-notifications"
                          name="email-notifications"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          defaultChecked
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="email-notifications" className="font-medium text-gray-700">Email Notifications</label>
                        <p className="text-gray-500">Receive updates about your tickets and orders</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="sms-notifications"
                          name="sms-notifications"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          defaultChecked
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="sms-notifications" className="font-medium text-gray-700">SMS Notifications</label>
                        <p className="text-gray-500">Receive text messages for important updates</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="marketing"
                          name="marketing"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="marketing" className="font-medium text-gray-700">Marketing Emails</label>
                        <p className="text-gray-500">Receive promotions and special offers</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h3>
                  <button className="w-full px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium mb-3 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </button>
                  <p className="text-sm text-gray-500">No payment methods saved yet</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Actions</h3>
                  <button className="w-full px-4 py-2 bg-red-50 border border-red-100 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other tabs would be implemented similarly */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">My Orders</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-3 md:space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 md:mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base">{order.title}</h3>
                      <p className="text-xs text-gray-600">{order.venue}</p>
                    </div>
                    <div className="mt-2 sm:mt-0">
                      <p className="text-base md:text-lg font-bold text-gray-900">฿{order.price.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 text-right">Order #{order.id}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="flex items-center text-xs md:text-sm text-gray-500 mb-2 sm:mb-0">
                      <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      <span>{new Date(order.date).toLocaleDateString()}</span>
                      <span className="mx-2">•</span>
                      <span>{order.tickets} ticket(s)</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardTabs;