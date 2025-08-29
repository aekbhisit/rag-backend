"use client";

import React, { useState, useEffect } from 'react';
import { useActionContext } from '@/botActionFramework';

/**
 * Component for monitoring action execution and framework state
 */
export default function MonitoringPanel() {
  const actionContext = useActionContext();
  const [context, setContext] = useState<any>({});
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  
  // Update context and history on changes
  useEffect(() => {
    // Update every 500ms
    const intervalId = setInterval(() => {
      // Get latest context
      const currentContext = actionContext.getContext();
      setContext(currentContext);
      
      // Get action history from context if available
      if (currentContext.lastActionType && currentContext.lastActionResult) {
        setActionHistory(prev => {
          // Create new history item
          const newItem = {
            timestamp: new Date().toLocaleTimeString(),
            actionType: currentContext.lastActionType,
            success: currentContext.lastActionResult?.success,
            message: currentContext.lastActionResult?.message || '',
            data: currentContext.lastActionResult?.data || null,
            error: currentContext.lastActionResult?.error || null,
          };
          
          // Create a simple signature for comparison to avoid duplicates
          const actionSignature = `${newItem.actionType}-${newItem.message}`;
          
          // Check if we already have this item in history
          const isDuplicate = prev.length > 0 && 
            actionSignature === `${prev[0].actionType}-${prev[0].message}`;
            
          return isDuplicate ? prev : [newItem, ...prev.slice(0, 9)];
        });
      }
    }, 500);
    
    return () => clearInterval(intervalId);
  }, [actionContext]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Current action status */}
      <div className="mb-4">
        <h3 className="text-md font-medium mb-2 text-slate-700">Action Status</h3>
        <div className="p-2 border rounded bg-gray-50">
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2 text-slate-700">Status:</span>
            <span className={`inline-block w-3 h-3 rounded-full ${
              actionContext.isActionPending ? 'bg-yellow-500' : 'bg-green-500'
            }`}></span>
            <span className="ml-2 text-sm text-slate-700">
              {actionContext.isActionPending ? 'Executing...' : 'Ready'}
            </span>
          </div>
          
          {actionContext.lastAction.type && (
            <div className="mt-2 text-sm">
              <div><span className="font-medium">Last Action:</span> {actionContext.lastAction.type}</div>
              <div>
                <span className="font-medium">Result:</span> 
                <span className={actionContext.lastAction.result?.success ? 'text-green-600' : 'text-red-600'}>
                  {actionContext.lastAction.result?.success ? 'Success' : 'Failed'}
                </span>
              </div>
              {actionContext.lastAction.result?.message && (
                <div><span className="font-medium">Message:</span> {actionContext.lastAction.result.message}</div>
              )}
              {actionContext.lastAction.result?.error && (
                <div className="text-red-600"><span className="font-medium">Error:</span> {actionContext.lastAction.result.error}</div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Context viewer */}
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-md font-medium mb-2 text-slate-700">Current Context</h3>
        <div className="p-2 border rounded bg-gray-50">
          <pre className="text-xs font-mono whitespace-pre-wrap text-slate-800">
            {JSON.stringify(context, null, 2)}
          </pre>
        </div>
      </div>
      
      {/* Action history */}
      <div className="flex-grow overflow-hidden">
        <h3 className="text-md font-medium mb-2 text-slate-700">Action History</h3>
        <div className="border rounded h-full overflow-auto">
          {actionHistory.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No actions executed yet
            </div>
          ) : (
            <div className="divide-y">
              {actionHistory.map((item, index) => (
                <div key={index} className="p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-slate-700">{item.actionType}</span>
                    <span className="text-xs text-gray-500">{item.timestamp}</span>
                  </div>
                  <div className="mt-1 flex items-center">
                    <span className={`text-xs px-1.5 py-0.5 rounded-sm ${
                      item.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.success ? 'Success' : 'Failed'}
                    </span>
                    {item.message && (
                      <span className="text-xs ml-2 text-slate-700">{item.message}</span>
                    )}
                  </div>
                  {(item.data || item.error) && (
                    <div className="mt-1 text-xs font-mono bg-gray-100 p-1 rounded overflow-x-auto">
                      {item.error ? (
                        <span className="text-red-600">{item.error}</span>
                      ) : (
                        <span className="text-slate-700">{JSON.stringify(item.data)}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 