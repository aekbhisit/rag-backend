'use client';

import React from 'react';
import Link from 'next/link';

interface BreadcrumbItem {
  name: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {item.current ? (
              <span className="text-sm font-medium text-gray-900 truncate max-w-xs sm:max-w-md">
                {item.name}
              </span>
            ) : item.href ? (
              <Link 
                href={item.href} 
                className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate max-w-xs sm:max-w-md"
              >
                {item.name}
              </Link>
            ) : (
              <span className="text-sm font-medium text-gray-500 truncate max-w-xs sm:max-w-md">
                {item.name}
              </span>
            )}
            
            {index < items.length - 1 && (
              <span className="mx-2 text-gray-400">/</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Predefined breadcrumb configurations
export const breadcrumbConfigs = {
  home: [
    { name: 'Home', href: '/', current: true }
  ],
  marketplace: [
    { name: 'Home', href: '/' },
    { name: 'Events', href: '/marketplace', current: true }
  ],
  eventDetail: (eventId: string, eventName: string) => [
    { name: 'Home', href: '/' },
    { name: 'Events', href: '/marketplace' },
    { name: eventName, current: true }
  ],
  cart: [
    { name: 'Home', href: '/' },
    { name: 'Cart', current: true }
  ],
  checkout: [
    { name: 'Home', href: '/' },
    { name: 'Cart', href: '/cart' },
    { name: 'Checkout', current: true }
  ],
  member: {
    dashboard: [
      { name: 'Home', href: '/' },
      { name: 'Dashboard', current: true }
    ],
    tickets: [
      { name: 'Home', href: '/' },
      { name: 'Dashboard', href: '/member/dashboard' },
      { name: 'My Tickets', current: true }
    ],
    orders: [
      { name: 'Home', href: '/' },
      { name: 'Dashboard', href: '/member/dashboard' },
      { name: 'Orders', current: true }
    ],
    favorites: [
      { name: 'Home', href: '/' },
      { name: 'Dashboard', href: '/member/dashboard' },
      { name: 'Favorites', current: true }
    ],
    reviews: [
      { name: 'Home', href: '/' },
      { name: 'Dashboard', href: '/member/dashboard' },
      { name: 'Reviews', current: true }
    ]
  },
  auth: {
    login: [
      { name: 'Home', href: '/' },
      { name: 'Login', current: true }
    ],
    register: [
      { name: 'Home', href: '/' },
      { name: 'Register', current: true }
    ]
  }
};

export default Breadcrumb;