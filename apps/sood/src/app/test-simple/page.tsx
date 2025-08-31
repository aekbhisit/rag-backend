'use client';

import { useState, useEffect } from 'react';

export default function SimpleTestPage() {
  const [message, setMessage] = useState('Loading...');
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('[SimpleTest] Component mounted - JavaScript is working!');
    setMessage('JavaScript is working! ✅');
    
    const timer = setInterval(() => {
      setCount(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Simple Test Page</h1>
        
        <div className="space-y-4">
          <div>
            <strong>Status:</strong> {message}
          </div>
          
          <div>
            <strong>Counter:</strong> {count} seconds
          </div>
          
          <div>
            <strong>Test Results:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>✅ Page loads</li>
              <li>✅ React component renders</li>
              <li>✅ useState works</li>
              <li>✅ useEffect works</li>
              <li>✅ setInterval works</li>
              <li>✅ Console.log works (check browser console)</li>
            </ul>
          </div>
          
          <button 
            onClick={() => setMessage(`Button clicked at ${new Date().toLocaleTimeString()}`)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test Button Click
          </button>
          
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <strong>Instructions:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Open browser developer tools (F12)</li>
              <li>Go to Console tab</li>
              <li>Look for &quot;[SimpleTest] Component mounted&quot; message</li>
              <li>Watch the counter increment every second</li>
              <li>Click the button to test interactivity</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
} 