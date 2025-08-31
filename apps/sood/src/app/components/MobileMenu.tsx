'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, ChevronDown } from 'lucide-react';
import SearchBar from '@/app/components/SearchBar';
import LocationSelector from '@/app/components/LocationSelector';

interface MobileMenuProps {
  onClose: () => void;
  onSearch: (query: string) => void;
  onLocationChange: (location: string) => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ 
  onClose, 
  onSearch,
  onLocationChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
    onClose();
  };

  const categoryItems = [
    { id: 'all', name: 'All Events', nameTh: 'กิจกรรมทั้งหมด', count: 4325, color: 'bg-purple-100 text-purple-700' },
    { id: 'concerts', name: 'Concerts', nameTh: 'คอนเสิร์ต', count: 1850, color: 'bg-pink-100 text-pink-700' },
    { id: 'sports', name: 'Sports', nameTh: 'กีฬา', count: 1240, color: 'bg-green-100 text-green-700' },
    { id: 'festivals', name: 'Festivals', nameTh: 'เทศกาล', count: 680, color: 'bg-indigo-100 text-indigo-700' },
    { id: 'theater', name: 'Theater', nameTh: 'ละคร', count: 425, color: 'bg-red-100 text-red-700' },
    { id: 'comedy', name: 'Comedy', nameTh: 'ตลก', count: 130, color: 'bg-yellow-100 text-yellow-700' },
  ];

  const menuItems = [
    { name: 'About Us', section: 'about' },
    { name: 'Contact Support', section: 'contact' },
    { name: 'Terms of Service', section: 'terms' },
    { name: 'Privacy Policy', section: 'privacy' }
  ];

  return (
    <div className="bg-white border-b border-gray-200 shadow-lg max-h-[80vh] overflow-y-auto">
      <div className="px-4 py-4">
        {/* Mobile Search Bar */}
        <div className="mb-4">
          <SearchBar 
            onSearch={handleSearch}
            placeholder="ค้นหากิจกรรม... | Search events..."
            initialValue={searchQuery}
            className="w-full"
          />
        </div>

        {/* Mobile Location Selector */}
        <div className="mb-6">
          <LocationSelector 
            onSelect={onLocationChange}
            variant="mobile"
          />
        </div>
        
        {/* Categories Section */}
        <div className="mb-6">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="w-5 h-5 mr-3 text-purple-600">🏪</span>
              Categories
            </h3>
            <p className="text-sm text-gray-600 mt-1">Browse by event type</p>
          </div>
          
          <div className="space-y-2">
            {categoryItems.map((category) => {
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    // Could implement category filtering here
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-purple-50 hover:text-purple-700 border border-gray-100"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${category.color}`}>
                      <span className="text-sm">🏪</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{category.name}</div>
                      <div className="text-xs text-gray-500">{category.nameTh}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded-full">
                    {category.count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side Menu Items */}
        <div className="border-t border-gray-200 pt-4">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="w-5 h-5 mr-3 text-gray-600">ℹ️</span>
              Support & Info
            </h3>
            <p className="text-sm text-gray-600 mt-1">Account & support</p>
          </div>
          
          <div className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  // Could implement menu navigation here
                  onClose();
                }}
                className="w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors border border-gray-100 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <span className="w-4 h-4">ℹ️</span>
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;