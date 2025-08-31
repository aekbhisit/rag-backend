"use client";

import React from 'react';
import { CheckCircleIcon, ClockIcon, TruckIcon, TicketIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface OrderStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming' | 'cancelled';
  timestamp?: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface OrderTrackerProps {
  orderStatus: 'confirmed' | 'processing' | 'delivered' | 'cancelled' | 'completed';
  orderDate: string;
  deliveryMethod: 'electronic' | 'physical' | 'pickup';
}

const OrderTracker: React.FC<OrderTrackerProps> = ({ orderStatus, orderDate, deliveryMethod }) => {
  const getOrderSteps = (): OrderStep[] => {
    const baseSteps: OrderStep[] = [
      {
        id: 'confirmed',
        title: 'Order Confirmed',
        description: 'Your order has been confirmed and payment processed',
        status: 'completed',
        timestamp: orderDate,
        icon: CheckCircleIcon
      },
      {
        id: 'processing',
        title: 'Processing',
        description: 'Seller is preparing your tickets',
        status: orderStatus === 'confirmed' ? 'current' : orderStatus === 'processing' || orderStatus === 'delivered' || orderStatus === 'completed' ? 'completed' : 'upcoming',
        timestamp: orderStatus === 'processing' || orderStatus === 'delivered' || orderStatus === 'completed' ? new Date(Date.now() + 3600000).toISOString() : undefined,
        icon: ClockIcon
      }
    ];

    if (deliveryMethod === 'electronic') {
      baseSteps.push({
        id: 'delivered',
        title: 'Tickets Delivered',
        description: 'Digital tickets sent to your email',
        status: orderStatus === 'delivered' || orderStatus === 'completed' ? 'completed' : orderStatus === 'processing' ? 'current' : 'upcoming',
        timestamp: orderStatus === 'delivered' || orderStatus === 'completed' ? new Date(Date.now() + 7200000).toISOString() : undefined,
        icon: TicketIcon
      });
    } else if (deliveryMethod === 'physical') {
      baseSteps.push({
        id: 'shipped',
        title: 'Tickets Shipped',
        description: 'Physical tickets sent via mail',
        status: orderStatus === 'delivered' || orderStatus === 'completed' ? 'completed' : orderStatus === 'processing' ? 'current' : 'upcoming',
        timestamp: orderStatus === 'delivered' || orderStatus === 'completed' ? new Date(Date.now() + 7200000).toISOString() : undefined,
        icon: TruckIcon
      });
    } else {
      baseSteps.push({
        id: 'ready',
        title: 'Ready for Pickup',
        description: 'Tickets ready at venue box office',
        status: orderStatus === 'delivered' || orderStatus === 'completed' ? 'completed' : orderStatus === 'processing' ? 'current' : 'upcoming',
        timestamp: orderStatus === 'delivered' || orderStatus === 'completed' ? new Date(Date.now() + 7200000).toISOString() : undefined,
        icon: TicketIcon
      });
    }

    if (orderStatus === 'cancelled') {
      return baseSteps.map((step, index) => ({
        ...step,
        status: index === 0 ? 'completed' : 'cancelled'
      }));
    }

    return baseSteps;
  };

  const steps = getOrderSteps();

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'current':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'cancelled':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-400 bg-gray-100 border-gray-200';
    }
  };

  const getLineColor = (currentIndex: number, steps: OrderStep[]) => {
    if (currentIndex === steps.length - 1) return '';
    
    const currentStep = steps[currentIndex];
    const nextStep = steps[currentIndex + 1];
    
    if (currentStep.status === 'completed' && (nextStep.status === 'completed' || nextStep.status === 'current')) {
      return 'bg-green-500';
    } else if (currentStep.status === 'cancelled' || nextStep.status === 'cancelled') {
      return 'bg-red-300';
    }
    return 'bg-gray-300';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Status</h3>
      
      <div className="relative">
        {steps.map((step, index) => {
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="relative flex items-start">
              {/* Vertical line */}
              {index < steps.length - 1 && (
                <div className={`absolute left-4 top-8 w-0.5 h-16 ${getLineColor(index, steps)}`}></div>
              )}
              
              {/* Step content */}
              <div className="flex items-start space-x-4 pb-8">
                {/* Icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${getStepColor(step.status)}`}>
                  {step.status === 'cancelled' ? (
                    <XCircleIcon className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-900' :
                    step.status === 'current' ? 'text-blue-900' :
                    step.status === 'cancelled' ? 'text-red-900' :
                    'text-gray-500'
                  }`}>
                    {step.title}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    step.status === 'completed' ? 'text-green-700' :
                    step.status === 'current' ? 'text-blue-700' :
                    step.status === 'cancelled' ? 'text-red-700' :
                    'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                  {step.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(step.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Additional info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Delivery Method:</span>
          <span className="font-medium text-gray-900 capitalize">
            {deliveryMethod === 'electronic' ? 'Email Delivery' : 
             deliveryMethod === 'physical' ? 'Physical Mail' : 
             'Venue Pickup'}
          </span>
        </div>
        
        {orderStatus === 'completed' && (
          <div className="mt-2 text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✅ Order Completed
            </span>
          </div>
        )}
        
        {orderStatus === 'cancelled' && (
          <div className="mt-2 text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              ❌ Order Cancelled
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracker;