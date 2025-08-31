"use client";

import React, { useState } from 'react';

interface APITestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  responseTime: number;
  data?: any;
  error?: string;
}

export default function APIEndpointTester() {
  const [testResults, setTestResults] = useState<APITestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');

  const apiEndpoints = [
    {
      name: 'Staff Messages',
      endpoint: '/api/staff/messages',
      tests: [
        {
          name: 'Send to Staff',
          method: 'POST',
          body: {
            action: 'send_to_staff',
            sessionId: 'test-session-' + Date.now(),
            customerMessage: 'Hello, I need help with my account',
            language: 'en-US'
          }
        },
        {
          name: 'Get Messages',
          method: 'GET',
          params: '?sessionId=test-session-123'
        }
      ]
    },
    {
      name: 'Staff Availability',
      endpoint: '/api/staff/availability',
      tests: [
        {
          name: 'Get All Staff',
          method: 'GET',
          params: ''
        },
        {
          name: 'Get English Speaking Staff',
          method: 'GET',
          params: '?language=en-US'
        },
        {
          name: 'Find Best Match',
          method: 'POST',
          body: {
            action: 'find_best_match',
            language: 'en-US',
            expertise: 'technical_support',
            priority: 'expertise'
          }
        }
      ]
    },
    {
      name: 'Channel Health',
      endpoint: '/api/channels/health',
      tests: [
        {
          name: 'System Health Check',
          method: 'GET',
          params: ''
        },
        {
          name: 'Check Normal Channel',
          method: 'POST',
          body: {
            action: 'check_specific',
            channel: 'normal'
          }
        },
        {
          name: 'Force Health Check',
          method: 'POST',
          body: {
            action: 'force_health_check'
          }
        }
      ]
    },
    {
      name: 'Analytics Usage',
      endpoint: '/api/analytics/usage',
      tests: [
        {
          name: 'Get Usage Stats',
          method: 'GET',
          params: '?period=24h'
        },
        {
          name: 'Track Message',
          method: 'POST',
          body: {
            action: 'track_message',
            data: {
              sessionId: 'test-session-' + Date.now(),
              channel: 'normal',
              responseTime: 1500,
              success: true,
              language: 'en-US'
            }
          }
        },
        {
          name: 'Get Real-time Stats',
          method: 'POST',
          body: {
            action: 'get_real_time_stats'
          }
        }
      ]
    }
  ];

  const addTestResult = (result: APITestResult) => {
    setTestResults(prev => [result, ...prev].slice(0, 50)); // Keep last 50 results
  };

  const runSingleTest = async (endpoint: string, test: any) => {
    const startTime = Date.now();
    
    try {
      const url = endpoint + (test.params || '');
      const options: RequestInit = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      const response = await fetch(url, options);
      const responseTime = Date.now() - startTime;
      const data = await response.json();

      const result: APITestResult = {
        endpoint: `${test.method} ${url}`,
        method: test.method,
        status: response.status,
        success: response.ok,
        responseTime,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : data.error || `HTTP ${response.status}`
      };

      addTestResult(result);
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: APITestResult = {
        endpoint: `${test.method} ${endpoint}`,
        method: test.method,
        status: 0,
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      addTestResult(result);
      return result;
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    
    try {
      for (const endpointGroup of apiEndpoints) {
        for (const test of endpointGroup.tests) {
          await runSingleTest(endpointGroup.endpoint, test);
          // Add small delay between tests
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } finally {
      setIsRunningTests(false);
    }
  };

  const runEndpointTests = async (endpointName: string) => {
    const endpointGroup = apiEndpoints.find(ep => ep.name === endpointName);
    if (!endpointGroup) return;

    setIsRunningTests(true);
    
    try {
      for (const test of endpointGroup.tests) {
        await runSingleTest(endpointGroup.endpoint, test);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } finally {
      setIsRunningTests(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusColor = (success: boolean, status: number) => {
    if (success) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🔌 API Endpoint Tester</h3>
      
      {/* Test Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={runAllTests}
            disabled={isRunningTests}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunningTests ? '🔄 Running Tests...' : '🚀 Run All Tests'}
          </button>
          
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Clear Results
          </button>
        </div>

        {/* Individual Endpoint Testing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Individual Endpoint:
          </label>
          <div className="flex gap-2">
            <select
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Select an endpoint...</option>
              {apiEndpoints.map(ep => (
                <option key={ep.name} value={ep.name}>{ep.name}</option>
              ))}
            </select>
            <button
              onClick={() => selectedEndpoint && runEndpointTests(selectedEndpoint)}
              disabled={isRunningTests || !selectedEndpoint}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Test
            </button>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">
          Test Results ({testResults.length})
        </h4>
        
        {testResults.length === 0 ? (
          <p className="text-gray-500 text-sm">No test results yet. Run some tests to see results here.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`font-mono text-sm ${getStatusColor(result.success, result.status)}`}>
                      {result.method} {result.status}
                    </span>
                    <span className="text-gray-600 text-xs">
                      {result.responseTime}ms
                    </span>
                    {result.success ? (
                      <span className="text-green-600 text-xs">✅ Success</span>
                    ) : (
                      <span className="text-red-600 text-xs">❌ Failed</span>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-700 mb-2 font-mono">
                  {result.endpoint}
                </div>
                
                {result.error && (
                  <div className="text-sm text-red-600 mb-2">
                    Error: {result.error}
                  </div>
                )}
                
                {result.data && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                      View Response Data
                    </summary>
                    <pre className="mt-2 p-2 bg-white border rounded text-gray-700 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Endpoints Documentation */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Available API Endpoints</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apiEndpoints.map(ep => (
            <div key={ep.name} className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-medium text-gray-800">{ep.name}</h5>
              <p className="text-sm text-gray-600 font-mono">{ep.endpoint}</p>
              <div className="mt-2 text-xs text-gray-500">
                {ep.tests.length} test{ep.tests.length !== 1 ? 's' : ''} available
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 