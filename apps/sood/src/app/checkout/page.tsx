"use client";

import React, { useState } from 'react';
import { useCart } from '@/app/contexts/CartContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Breadcrumb, { breadcrumbConfigs } from '@/app/components/Breadcrumb';
import { 
  CreditCardIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  CalendarIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple' | 'google';
  name: string;
  icon: string;
  lastFour?: string;
}

const CheckoutPage: React.FC = () => {
  const { items, totalAmount, fees, finalTotal, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  
  const [billingInfo, setBillingInfo] = useState({
    firstName: user?.name.split(' ')[0] || '',
    lastName: user?.name.split(' ')[1] || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });

  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
    saveCard: false
  });

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('new-card');

  const paymentMethods: PaymentMethod[] = [
    { id: 'new-card', type: 'card', name: 'New Credit/Debit Card', icon: '💳' },
    { id: 'paypal', type: 'paypal', name: 'PayPal', icon: '🅿️' },
    { id: 'apple', type: 'apple', name: 'Apple Pay', icon: '🍎' },
    { id: 'google', type: 'google', name: 'Google Pay', icon: '🌐' }
  ];

  const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setBillingInfo(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentInfo(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setPaymentInfo(prev => ({ ...prev, cardNumber: formatted }));
  };

  const processPayment = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsProcessing(false);
    setOrderComplete(true);
    
    // Clear cart after successful order
    setTimeout(() => {
      clearCart();
      router.push('/member/orders');
    }, 3000);
  };

  if (items.length === 0 && !orderComplete) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Using the new reusable Header component */}
        <Header />
        
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Breadcrumb */}
            <div className="mb-4">
              <Breadcrumb items={breadcrumbConfigs.checkout} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Secure Checkout</h1>
          </div>
        </div>
        
        <div className="flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <Link href="/marketplace" className="text-blue-600 hover:text-blue-500">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Using the new reusable Header component */}
        <Header />
        
        <div className="flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Complete!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your purchase. Your tickets will be delivered to your email shortly.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">Order Total: <span className="font-bold">${finalTotal.toFixed(2)}</span></p>
            </div>
            <p className="text-sm text-gray-500">Redirecting to your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Using the new reusable Header component */}
      <Header />
      
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Breadcrumb items={breadcrumbConfigs.checkout} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Secure Checkout</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* Step 1: Billing Information */}
              <div className="mb-8">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    1
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Billing Information</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={billingInfo.firstName}
                      onChange={handleBillingChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={billingInfo.lastName}
                      onChange={handleBillingChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={billingInfo.email}
                      onChange={handleBillingChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={billingInfo.phone}
                      onChange={handleBillingChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Payment Method */}
              <div>
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    2
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
                </div>

                {/* Payment Method Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="relative">
                      <input
                        type="radio"
                        id={method.id}
                        name="paymentMethod"
                        value={method.id}
                        checked={selectedPaymentMethod === method.id}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="sr-only"
                      />
                      <label
                        htmlFor={method.id}
                        className={`block w-full p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedPaymentMethod === method.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{method.icon}</span>
                          <span className="font-medium text-gray-900">{method.name}</span>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                {/* Credit Card Form */}
                {selectedPaymentMethod === 'new-card' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={paymentInfo.cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                        <input
                          type="text"
                          name="expiryDate"
                          value={paymentInfo.expiryDate}
                          onChange={handlePaymentChange}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                        <input
                          type="text"
                          name="cvv"
                          value={paymentInfo.cvv}
                          onChange={handlePaymentChange}
                          placeholder="123"
                          maxLength={4}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
                      <input
                        type="text"
                        name="nameOnCard"
                        value={paymentInfo.nameOnCard}
                        onChange={handlePaymentChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                        required
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="saveCard"
                        name="saveCard"
                        checked={paymentInfo.saveCard}
                        onChange={(e) => setPaymentInfo(prev => ({ ...prev, saveCard: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="saveCard" className="ml-2 block text-sm text-gray-700">
                        Save this card for future purchases
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-5 mt-8 lg:mt-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>

              {/* Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start space-x-3">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm">{item.title}</h3>
                      <div className="flex items-center text-gray-600 text-xs mt-1">
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                        <span className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service fees</span>
                  <span className="font-medium">${fees.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Security Info */}
              <div className="bg-green-50 rounded-lg p-4 mt-6 mb-6">
                <div className="flex items-center space-x-2">
                  <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Your payment is secure</span>
                </div>
                <ul className="text-xs text-green-700 mt-2 space-y-1">
                  <li>• 256-bit SSL encryption</li>
                  <li>• PCI DSS compliant</li>
                  <li>• Money-back guarantee</li>
                </ul>
              </div>

              {/* Place Order Button */}
              <button
                onClick={processPayment}
                disabled={isProcessing}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <LockClosedIcon className="w-5 h-5" />
                    <span>Complete Order - ${finalTotal.toFixed(2)}</span>
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                By completing your order, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;