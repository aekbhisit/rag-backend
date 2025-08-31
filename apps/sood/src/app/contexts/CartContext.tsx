"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  id: string;
  title: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  section?: string;
  row?: string;
  seat?: string;
  seller: string;
  quantity: number;
  verified: boolean;
  maxQuantity: number;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  fees: number;
  finalTotal: number;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (id: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('ticketCart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ticketCart', JSON.stringify(items));
  }, [items]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        // Update quantity if item already exists and doesn't exceed max
        const newQuantity = Math.min(existingItem.quantity + 1, existingItem.maxQuantity);
        return prevItems.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: newQuantity }
            : cartItem
        );
      } else {
        // Add new item with quantity 1
        return [...prevItems, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id
          ? { ...item, quantity: Math.min(quantity, item.maxQuantity) }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const isInCart = (id: string) => {
    return items.some(item => item.id === id);
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  // Calculate fees (service fee + processing fee)
  const serviceFeePerTicket = 15;
  const processingFeePercent = 0.029; // 2.9%
  const serviceFees = totalItems * serviceFeePerTicket;
  const processingFees = totalAmount * processingFeePercent;
  const fees = serviceFees + processingFees;
  
  const finalTotal = totalAmount + fees;

  const value: CartContextType = {
    items,
    totalItems,
    totalAmount,
    fees,
    finalTotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isInCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};