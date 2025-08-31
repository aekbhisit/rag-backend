"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useCart } from '@/app/contexts/CartContext';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Breadcrumb, { breadcrumbConfigs } from '@/app/components/Breadcrumb';
import { 
  ShoppingBagIcon as ShoppingBagIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  MapPinIcon as MapPinIcon,
  CalendarIcon as CalendarIcon,
  StarIcon as StarIcon,
  HeartIcon as HeartIcon,
  UserIcon as UserIcon,
  Bars3Icon as MenuIcon,
  XMarkIcon as XIcon,
  ChevronDownIcon as ChevronDownIcon
} from '@heroicons/react/24/outline';

const CartPage: React.FC = () => {
  const { items, totalItems, totalAmount, fees, finalTotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);

  const applyPromoCode = () => {
    // Mock promo code logic
    const validCodes = {
      'WELCOME10': 0.1,
      'SAVE20': 0.2,
      'FIRST15': 0.15
    };

    if (validCodes[promoCode as keyof typeof validCodes]) {
      setPromoDiscount(totalAmount * validCodes[promoCode as keyof typeof validCodes]);
    } else {
      alert('Invalid promo code');
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Using the new reusable Header component */}
        <Header />
        
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <Breadcrumb items={breadcrumbConfigs.cart} />
          </div>
        </div>

        {/* Empty Cart - Full width like home page */}
        <div className="px-4 sm:px-6 py-16">
          <div className="text-center">
            <ShoppingBagIcon className="w-24 h-24 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Looks like you haven't added any tickets to your cart yet.</p>
            <Link
              href="/marketplace"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Using the new reusable Header component */}
      <Header />
      
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumb items={breadcrumbConfigs.cart} />
        </div>
      </div>

      {/* Main content - Full width like home page */}
      <div className="px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <ShoppingBagIcon className="w-5 h-5" />
            <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Cart Items</h2>
                  <button
                    onClick={clearCart}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {items.map((item) => (
                  <div key={item.id} className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Event Image */}
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                      />

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                        
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center text-gray-600">
                            <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="text-sm">{item.venue}, {item.city}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="text-sm">{new Date(item.date).toLocaleDateString()} at {item.time}</span>
                          </div>
                          {item.section && (
                            <div className="text-sm text-gray-600">
                              Section {item.section}, Row {item.row}, Seat {item.seat}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-4">
                          {item.verified && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✅ Verified
                            </span>
                          )}
                          <span className="text-sm text-gray-500">by {item.seller}</span>
                        </div>
                      </div>

                      {/* Price and Quantity */}
                      <div className="flex-shrink-0 text-right">
                        <div className="mb-4">
                          <div className="text-xl font-bold text-gray-900">${item.price}</div>
                          {item.originalPrice && (
                            <div className="text-sm text-gray-500 line-through">${item.originalPrice}</div>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-2 mb-4">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                            disabled={item.quantity <= 1}
                          >
                            <MinusIcon className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                            disabled={item.quantity >= item.maxQuantity}
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
                        >
                          <TrashIcon className="w-4 h-4 mr-1" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4 mt-8 lg:mt-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>

              {/* Promo Code */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promo Code
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  />
                  <button
                    onClick={applyPromoCode}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Apply
                  </button>
                </div>
                {promoDiscount > 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    Code applied! You saved ${promoDiscount.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({totalItems} tickets)</span>
                  <span className="font-medium">${totalAmount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service fees</span>
                  <span className="font-medium">${fees.toFixed(2)}</span>
                </div>

                {promoDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Promo discount</span>
                    <span className="font-medium text-green-600">-${promoDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-gray-900">
                      ${(finalTotal - promoDiscount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Features */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Secure Checkout</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• 256-bit SSL encryption</li>
                  <li>• Money-back guarantee</li>
                  <li>• Verified ticket authenticity</li>
                </ul>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleProceedToCheckout}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center flex items-center justify-center space-x-2"
              >
                <LockClosedIcon className="w-5 h-5" />
                <span>Secure Checkout</span>
              </button>

              {/* Payment Methods */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-600 mb-2">We accept</p>
                <div className="flex justify-center space-x-2">
                  <div className="w-8 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">💳</div>
                  <div className="w-8 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">🅿️</div>
                  <div className="w-8 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">🍎</div>
                  <div className="w-8 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">🌐</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;