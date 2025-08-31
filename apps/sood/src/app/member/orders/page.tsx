"use client";

import React, { useState } from 'react';
import OrderTracker from '@/app/components/OrderTracker';
import { ShoppingCartIcon as ShoppingCart, ArrowDownTrayIcon as Download, ChatBubbleLeftRightIcon as MessageCircle, StarIcon as Star, CalendarIcon as Calendar, MapPinIcon as MapPin, ClockIcon as Clock, CreditCardIcon as CreditCard, TicketIcon as Ticket, EyeIcon as Eye, PrinterIcon as Printer, ShareIcon as Share } from '@heroicons/react/24/outline';

interface Order {
  id: string;
  title: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  orderDate: string;
  tickets: number;
  section: string;
  row: string;
  seat: string;
  image: string;
  seller: string;
  paymentMethod: string;
  orderTotal: number;
  fees: number;
  deliveryMethod: 'electronic' | 'physical' | 'pickup';
  canDownload: boolean;
  canCancel: boolean;
  canReview: boolean;
}

const MemberOrdersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showTracker, setShowTracker] = useState<string | null>(null);
  
  const orders: Order[] = [
    {
      id: 'ORD-001',
      title: 'Hamilton Broadway',
      venue: 'Richard Rodgers Theatre',
      city: 'New York, NY',
      date: '2024-12-01',
      time: '20:00',
      price: 350,
      status: 'confirmed',
      orderDate: '2024-10-15',
      tickets: 2,
      section: 'Orchestra',
      row: 'H',
      seat: '105-106',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      seller: 'Broadway Direct',
      paymentMethod: 'Visa •••• 4532',
      orderTotal: 750,
      fees: 50,
      deliveryMethod: 'electronic',
      canDownload: true,
      canCancel: false,
      canReview: false
    },
    {
      id: 'ORD-002',
      title: 'NBA Finals Game 7',
      venue: 'Chase Center',
      city: 'San Francisco, CA',
      date: '2024-10-25',
      time: '21:00',
      price: 890,
      status: 'completed',
      orderDate: '2024-09-20',
      tickets: 1,
      section: 'Lower Bowl',
      row: '15',
      seat: '108',
      image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400',
      seller: 'Sports Hub',
      paymentMethod: 'Mastercard •••• 8901',
      orderTotal: 940,
      fees: 50,
      deliveryMethod: 'electronic',
      canDownload: true,
      canCancel: false,
      canReview: true
    },
    {
      id: 'ORD-003',
      title: 'Taylor Swift - The Eras Tour',
      venue: 'MetLife Stadium',
      city: 'East Rutherford, NJ',
      date: '2024-12-15',
      time: '19:30',
      price: 450,
      status: 'pending',
      orderDate: '2024-10-20',
      tickets: 2,
      section: 'Floor A',
      row: '5',
      seat: '101-102',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      seller: 'VIP Tickets Co.',
      paymentMethod: 'Apple Pay',
      orderTotal: 950,
      fees: 50,
      deliveryMethod: 'electronic',
      canDownload: false,
      canCancel: true,
      canReview: false
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      case 'completed': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === 'all' || order.status === activeTab;
    const matchesSearch = order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const tabs = [
    { id: 'all', label: 'All Orders', count: orders.length },
    { id: 'confirmed', label: 'Confirmed', count: orders.filter(o => o.status === 'confirmed').length },
    { id: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length },
    { id: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
    { id: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
              <p className="text-gray-600 mt-1">Track and manage your ticket purchases</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">${orders.reduce((sum, o) => sum + o.orderTotal, 0)}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tickets Purchased</p>
                <p className="text-2xl font-bold text-gray-900">{orders.reduce((sum, o) => sum + o.tickets, 0)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <Ticket className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">${Math.round(orders.reduce((sum, o) => sum + o.orderTotal, 0) / orders.length)}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
            
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search orders..."
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                {/* Order Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-gray-900">{order.title}</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">${order.orderTotal}</p>
                    <p className="text-sm text-gray-500">Order #{order.id}</p>
                  </div>
                </div>

                {/* Order Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Event Image and Details */}
                  <div className="flex space-x-4">
                    <img
                      src={order.image}
                      alt={order.title}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="space-y-2">
                        <div className="flex items-center text-gray-600">
                          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="text-sm">{order.venue}, {order.city}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="text-sm">{new Date(order.date).toLocaleDateString()} at {order.time}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Ticket className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="text-sm">Section {order.section}, Row {order.row}, Seat {order.seat}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Order Date</p>
                      <p className="font-medium">{new Date(order.orderDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="font-medium">{order.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tickets</p>
                      <p className="font-medium">{order.tickets} ticket(s)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Seller</p>
                      <p className="font-medium">{order.seller}</p>
                    </div>
                  </div>

                      {/* Enhanced Action Buttons */}
                      <div className="space-y-3">
                        {order.canDownload && (
                          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2">
                            <Download className="w-4 h-4" />
                            <span>Download Tickets</span>
                          </button>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => setShowTracker(showTracker === order.id ? null : order.id)}
                            className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Track</span>
                          </button>
                          
                          <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center space-x-1">
                            <Printer className="w-4 h-4" />
                            <span>Print</span>
                          </button>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center space-x-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>Contact Seller</span>
                          </button>
                          
                          {order.canReview && (
                            <button className="flex-1 bg-yellow-50 text-yellow-700 py-2 px-3 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-medium flex items-center justify-center space-x-1">
                              <Star className="w-4 h-4" />
                              <span>Review</span>
                            </button>
                          )}
                          
                          <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                            <Share className="w-4 h-4" />
                          </button>
                        </div>

                        {order.canCancel && (
                          <button className="w-full bg-red-50 text-red-700 py-2 px-4 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">
                            Cancel Order
                          </button>
                        )}
                      </div>
                </div>

                {/* Order Summary */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Subtotal ({order.tickets} ticket{order.tickets > 1 ? 's' : ''})</span>
                    <span className="font-medium">${order.price * order.tickets}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Service fees</span>
                    <span className="font-medium">${order.fees}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold mt-2 pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span>${order.orderTotal}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'all' ? 'You haven\'t made any purchases yet.' : `No ${activeTab} orders found.`}
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

export default MemberOrdersPage;