'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/app/contexts/CartContext';

interface CartIconProps {
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  href?: string;
}

const CartIcon: React.FC<CartIconProps> = ({ 
  className = '',
  iconSize = 'md',
  showCount = true,
  href = '/cart'
}) => {
  const { totalItems } = useCart();
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  const sizeClass = sizeClasses[iconSize] || sizeClasses.md;

  return (
    <Link href={href} className={`relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors ${className}`}>
      <ShoppingCart className={sizeClass} />
      {showCount && totalItems > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 lg:w-5 lg:h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
          {totalItems}
        </span>
      )}
    </Link>
  );
};

export default CartIcon;