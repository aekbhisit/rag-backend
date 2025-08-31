'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { useCart } from '@/app/contexts/CartContext';
import { useRouter } from 'next/navigation';
import { 
  Menu, 
  X, 
  User, 
  Star
} from 'lucide-react';
import SearchBar from '@/app/components/SearchBar';
import LocationSelector from '@/app/components/LocationSelector';
import CartIcon from '@/app/components/CartIcon';
import UserMenu from '@/app/components/UserMenu';
import MobileMenu from '@/app/components/MobileMenu';

interface HeaderProps {
  variant?: 'simple' | 'marketplace';
  showSearch?: boolean;
  showLocationSelector?: boolean;
  showAuthMenu?: boolean;
  showCart?: boolean;
  showDashboardButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  variant = 'marketplace',
  showSearch = true,
  showLocationSelector = true,
  showAuthMenu = true,
  showCart = true,
  showDashboardButton = true
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const router = useRouter();
  
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');

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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Could implement search functionality here
  };

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
    // Could implement location filtering here
  };

  if (variant === 'simple') {
    return (
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full mb-4 sm:mb-6">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
          AI Travel Assistant Platform
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Discover intelligent travel planning with AI-powered recommendations, 
          real-time assistance, and personalized experiences for your journeys.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Enhanced Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Side - Logo and Mobile Menu */}
            <div className="flex items-center space-x-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="mobile-menu-button xl:hidden p-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                {showMobileMenu ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-2 lg:space-x-4">
                <div className="bg-gradient-to-r from-red-600 to-blue-600 text-white p-1.5 lg:p-2 rounded-lg">
                  <span className="text-lg lg:text-xl font-bold">🇹🇭</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent">
                    ThaiTicket Hub
                  </h1>
                  <p className="text-xs text-gray-500">Thailand Event Marketplace</p>
                </div>
                {/* Mobile Logo Text */}
                <div className="sm:hidden">
                  <h1 className="text-base font-bold bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent">
                    ThaiTicket
                  </h1>
                  <p className="text-xs text-gray-500">Hub</p>
                </div>
              </Link>
            </div>

            {/* Center - Search Bar (Desktop only) */}
            {showSearch && (
              <div className="hidden md:flex md:flex-1 lg:flex-1 md:max-w-md lg:max-w-lg md:mx-4 lg:mx-8">
                <SearchBar 
                  onSearch={handleSearch}
                  placeholder="ค้นหากิจกรรม สถานที่ หรือศิลปิน... | Search events, venues, artists..."
                  initialValue={searchQuery}
                  className="flex-grow"
                />
              </div>
            )}

            {/* Right Side - Actions */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* Thailand Location Selector - Hide on mobile */}
              {showLocationSelector && (
                <div className="hidden md:block">
                  <LocationSelector 
                    onSelect={handleLocationChange}
                    initialValue={selectedLocation}
                  />
                </div>
              )}

              {/* Cart Icon */}
              {showCart && (
                <CartIcon />
              )}

              {/* Desktop Dashboard Button - Hidden on mobile */}
              {isAuthenticated && showDashboardButton && (
                <Link 
                  href="/member/dashboard" 
                  className="hidden xl:flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              )}

              {/* Mobile Auth/Profile Menu - Only show on mobile */}
              {showAuthMenu && (
                <div className="xl:hidden">
                  <UserMenu variant="mobile" />
                </div>
              )}

              {/* Desktop User Profile - Only show on desktop */}
              {showAuthMenu && (
                <div className="hidden xl:block">
                  <UserMenu />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Mobile Menu with Categories and Side Menu */}
        {showMobileMenu && (
          <div className="mobile-menu-container xl:hidden">
            <MobileMenu 
              onClose={() => setShowMobileMenu(false)}
              onSearch={handleSearch}
              onLocationChange={handleLocationChange}
            />
          </div>
        )}
      </header>
    </>
  );
};

export default Header;
