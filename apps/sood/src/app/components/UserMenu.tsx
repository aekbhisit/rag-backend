'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User, Star, ChevronDown, Heart, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

interface UserMenuProps {
  variant?: 'desktop' | 'mobile';
  className?: string;
}

const UserMenu: React.FC<UserMenuProps> = ({ 
  variant = 'desktop',
  className = ''
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <Link
          href="/auth/login"
          className="text-gray-700 hover:text-blue-600 font-medium transition-colors text-sm"
        >
          Login
        </Link>
        <Link
          href="/auth/register"
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          Register
        </Link>
      </div>
    );
  }

  if (variant === 'mobile') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center space-x-1 p-2 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
            {user.name.charAt(0)}
          </div>
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{user.name}</p>
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="text-xs text-gray-600">{user.rating}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="py-2">
              <Link href="/member/dashboard" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                <User className="w-4 h-4 mr-3" />
                <span className="text-sm">My Dashboard</span>
              </Link>
              <Link href="/member/tickets" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                <span className="w-4 h-4 mr-3">🎫</span>
                <span className="text-sm">My Tickets</span>
              </Link>
              <Link href="/member/orders" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                <ShoppingCart className="w-4 h-4 mr-3" />
                <span className="text-sm">Orders</span>
              </Link>
              <Link href="/member/favorites" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                <Heart className="w-4 h-4 mr-3" />
                <span className="text-sm">Favorites</span>
              </Link>
              <button 
                onClick={logout}
                className="w-full text-left flex items-center px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="w-4 h-4 mr-3">🚪</span>
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user.name.charAt(0)}
        </div>
        <div className="hidden lg:block text-left">
          <p className="text-sm font-medium text-gray-800">{user.name}</p>
          <div className="flex items-center space-x-1">
            <Star className="w-3 h-3 text-yellow-400 fill-current" />
            <span className="text-xs text-gray-600">{user.rating}</span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-500 hidden lg:block" />
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                {user.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-800">{user.name}</p>
                <div className="flex items-center space-x-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-600">{user.rating} Rating</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="py-2">
            <Link href="/member/dashboard" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <User className="w-4 h-4 mr-3" />
              <span>My Dashboard</span>
            </Link>
            <Link href="/member/tickets" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <span className="w-4 h-4 mr-3">🎫</span>
              <span>My Tickets</span>
            </Link>
            <Link href="/member/orders" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <ShoppingCart className="w-4 h-4 mr-3" />
              <span>Orders</span>
            </Link>
            <Link href="/member/favorites" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <Heart className="w-4 h-4 mr-3" />
              <span>Favorites</span>
            </Link>
            <button 
              onClick={logout}
              className="w-full text-left flex items-center px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
            >
              <span className="w-4 h-4 mr-3">🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;