"use client";

import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Transaction, 
  ModerationCase,
  MarketplaceMetrics,
  TicketStatus,
  TransactionStatus 
} from '@/app/types/marketplace';

interface AdminDashboardProps {
  className?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'transactions' | 'moderation' | 'analytics'>('overview');
  const [metrics, setMetrics] = useState<MarketplaceMetrics | null>(null);
  const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [moderationCases, setModerationCases] = useState<ModerationCase[]>([]);

  useEffect(() => {
    // Load dashboard data
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Mock data - in production, fetch from APIs
      setMetrics({
        tickets: { total: 1250, active: 890, sold: 360, categories: {
          CONCERT: 450, SPORTS: 380, THEATER: 220, COMEDY: 100, FESTIVAL: 80, CONFERENCE: 20, OTHER: 0
        }},
        transactions: { total: 360, volume: 245000, averagePrice: 125.50, completionRate: 0.94 },
        users: { total: 2840, active: 1680, sellers: 420, buyers: 2420 },
        timeRange: { from: '2024-01-01', to: '2024-12-31' }
      });

      setPendingTickets([
        {
          id: 'pending_1',
          title: 'Taylor Swift Concert - Need Review',
          sellerId: 'seller_123',
          category: 'CONCERT',
          event: { name: 'Taylor Swift - The Eras Tour', date: '2024-12-15T19:30:00Z' },
          location: { venue: 'MetLife Stadium', city: 'East Rutherford', country: 'USA' },
          pricing: { sellingPrice: 450, currency: 'USD', negotiable: true, originalPrice: 350 },
          quantity: 2,
          condition: 'EXCELLENT',
          images: ['/api/placeholder/200/150'],
          verificationStatus: 'UNVERIFIED',
          status: 'PENDING_REVIEW',
          details: { section: '133', transferable: true, originalPrice: 350 },
          metadata: { createdAt: '2024-01-15T10:30:00Z', updatedAt: '2024-01-15T10:30:00Z', views: 0, favorites: 0 },
          tags: ['pop', 'stadium']
        }
      ]);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleTicketAction = async (ticketId: string, action: 'approve' | 'reject' | 'flag') => {
    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Refresh pending tickets
        loadDashboardData();
        alert(`✅ Ticket ${action}d successfully!`);
      }
    } catch (error) {
      alert(`❌ Failed to ${action} ticket`);
    }
  };

  const MetricsCard = ({ title, value, subtitle, icon, color = 'blue' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color?: 'blue' | 'green' | 'purple' | 'orange';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500 text-blue-100',
      green: 'bg-green-500 text-green-100',
      purple: 'bg-purple-500 text-purple-100',
      orange: 'bg-orange-500 text-orange-100'
    };

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-full ${colorClasses[color]} mr-4`}>
            <span className="text-xl">{icon}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
    );
  };

  const TicketReviewCard = ({ ticket }: { ticket: Ticket }) => (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex items-start space-x-4">
        <img 
          src={ticket.images[0] || '/api/placeholder/80/60'} 
          alt={ticket.title}
          className="w-20 h-15 object-cover rounded"
        />
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{ticket.title}</h4>
          <p className="text-sm text-gray-600">{ticket.location.venue} • {new Date(ticket.event.date).toLocaleDateString()}</p>
          <p className="text-lg font-semibold text-gray-900">${ticket.pricing.sellingPrice}</p>
          
          <div className="flex items-center space-x-2 mt-2">
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              {ticket.verificationStatus}
            </span>
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
              {ticket.quantity} tickets
            </span>
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <button
            onClick={() => handleTicketAction(ticket.id, 'approve')}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            Approve
          </button>
          <button
            onClick={() => handleTicketAction(ticket.id, 'reject')}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Reject
          </button>
          <button
            onClick={() => handleTicketAction(ticket.id, 'flag')}
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
          >
            Flag
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">🛠️ Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
              <button 
                onClick={loadDashboardData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'tickets', label: 'Ticket Review', icon: '🎫' },
                { id: 'transactions', label: 'Transactions', icon: '💰' },
                { id: 'moderation', label: 'Moderation', icon: '⚠️' },
                { id: 'analytics', label: 'Analytics', icon: '📈' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricsCard
                title="Total Tickets"
                value={metrics?.tickets.total.toLocaleString() || '0'}
                subtitle={`${metrics?.tickets.active || 0} active`}
                icon="🎫"
                color="blue"
              />
              <MetricsCard
                title="Total Revenue"
                value={`$${(metrics?.transactions.volume || 0).toLocaleString()}`}
                subtitle={`${metrics?.transactions.total || 0} transactions`}
                icon="💰"
                color="green"
              />
              <MetricsCard
                title="Active Users"
                value={metrics?.users.active.toLocaleString() || '0'}
                subtitle={`${metrics?.users.sellers || 0} sellers`}
                icon="👥"
                color="purple"
              />
              <MetricsCard
                title="Completion Rate"
                value={`${Math.round((metrics?.transactions.completionRate || 0) * 100)}%`}
                subtitle="Transaction success"
                icon="✅"
                color="orange"
              />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Reviews ({pendingTickets.length})</h3>
                <div className="space-y-3">
                  {pendingTickets.slice(0, 3).map(ticket => (
                    <TicketReviewCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
                {pendingTickets.length > 3 && (
                  <button
                    onClick={() => setActiveTab('tickets')}
                    className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View all pending tickets →
                  </button>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Category Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(metrics?.tickets.categories || {}).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{category.toLowerCase()}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${((count as number) / (metrics?.tickets.total || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Tickets Pending Review ({pendingTickets.length})
              </h3>
              <div className="space-y-4">
                {pendingTickets.map(ticket => (
                  <TicketReviewCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
              {pendingTickets.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  ✅ No tickets pending review
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
              <div className="text-center py-8 text-gray-500">
                💰 Transaction monitoring interface coming soon...
              </div>
            </div>
          </div>
        )}

        {activeTab === 'moderation' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Moderation Cases</h3>
              <div className="text-center py-8 text-gray-500">
                ⚠️ No active moderation cases
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Analytics</h3>
              <div className="text-center py-8 text-gray-500">
                📈 Advanced analytics dashboard coming soon...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;