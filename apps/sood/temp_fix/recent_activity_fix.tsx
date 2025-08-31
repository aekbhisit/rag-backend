import React from 'react';

// This is a simplified component to test the JSX syntax
const RecentActivitySection = () => {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Stats cards go here */}
      </div>

      {/* Recent Activity - Properly structured */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
        {/* Recent Listings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Listings</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All</button>
          </div>
          <div className="p-3 sm:p-4">
            {/* Listing items would map here */}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All</button>
          </div>
          <div className="p-3 sm:p-4">
            {/* Order items would map here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentActivitySection;