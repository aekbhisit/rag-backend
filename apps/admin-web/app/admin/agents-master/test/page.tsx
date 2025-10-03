'use client';

import React from 'react';
import { BACKEND_URL } from '../../../../components/config';

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Agents Master Test Page</h1>
      <p className="mb-4">This is a test page to verify the basic functionality.</p>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Environment Variables</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p><strong>BACKEND_URL:</strong> {process.env.NEXT_PUBLIC_BACKEND_URL || 'Not set'}</p>
            <p><strong>DEFAULT_TENANT_ID:</strong> {process.env.NEXT_PUBLIC_TENANT_ID || 'Not set'}</p>
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Local Storage</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p><strong>tenantId:</strong> {typeof window !== 'undefined' ? localStorage.getItem('tenantId') || 'Not set' : 'Server side'}</p>
            <p><strong>userId:</strong> {typeof window !== 'undefined' ? localStorage.getItem('userId') || 'Not set' : 'Server side'}</p>
            <p><strong>userEmail:</strong> {typeof window !== 'undefined' ? localStorage.getItem('userEmail') || 'Not set' : 'Server side'}</p>
            <p><strong>isAuthenticated:</strong> {typeof window !== 'undefined' ? localStorage.getItem('isAuthenticated') || 'Not set' : 'Server side'}</p>
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">API Test</h2>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('http://localhost:3001/api/admin/agents-master/conversations', {
                  headers: {
                    'X-Tenant-ID': '00000000-0000-0000-0000-000000000000',
                    'X-User-ID': 'test-user',
                  }
                });
                const data = await response.json();
                alert(`API Response: ${JSON.stringify(data, null, 2)}`);
              } catch (error) {
                alert(`API Error: ${error}`);
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test API Call
          </button>
        </div>
      </div>
    </div>
  );
}
