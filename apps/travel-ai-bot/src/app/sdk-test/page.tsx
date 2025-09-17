"use client";

import React, { Suspense } from 'react';
import { SDKIntegrationExample } from '@/app/components/chat/SDKIntegrationExample';

export default function SDKTestPage() {
  return (
    <div className="h-screen bg-gray-50">
      <div className="h-full">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading SDK Test...</p>
            </div>
          </div>
        }>
          <SDKIntegrationExample />
        </Suspense>
      </div>
    </div>
  );
}

