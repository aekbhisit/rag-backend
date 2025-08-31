"use client";

import React, { useEffect, useRef } from 'react';
import { initializeBotActionFramework, useActionContext } from '@/botActionFramework';
import ActionControlPanel from './components/ActionControlPanel';
import MonitoringPanel from './components/MonitoringPanel';
import MockEnvironment from './components/MockEnvironment';
import { registerTestHandlers } from './handlers/testHandlers';

/**
 * Main component for the action testing playground
 * Combines control panel, monitoring, and mock environment
 */
export default function ActionPlayground() {
  // Get action context
  const actionContext = useActionContext();
  
  // Track if framework is already initialized
  const frameworkInitialized = useRef(false);
  
  // Store stable reference to updateContext function
  const updateContextRef = useRef(actionContext.updateContext);
  
  // Update ref when actionContext changes
  useEffect(() => {
    updateContextRef.current = actionContext.updateContext;
  }, [actionContext]);
  
  // Initialize the framework and register test handlers (only once)
  useEffect(() => {
    if (frameworkInitialized.current) return;
    
    // Initialize the framework
    initializeBotActionFramework();
    
    // Register test handlers
    registerTestHandlers();
    
    // Update context with initial state using stable ref
    updateContextRef.current({
      currentPage: 'testing',
      testingMode: true
    });
    
    frameworkInitialized.current = true;
    
    console.log('[Testing] Bot Action Framework initialized for testing');
  }, []); // Empty dependency array to prevent infinite loop
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left panel - Action control */}
      <div className="col-span-1 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-4 text-slate-800">Control Panel</h2>
        <ActionControlPanel />
      </div>
      
      {/* Center panel - Mock environment */}
      <div className="col-span-1 md:col-span-1 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-4 text-slate-800">Mock Environment</h2>
        <MockEnvironment />
      </div>
      
      {/* Right panel - Monitoring */}
      <div className="col-span-1 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-4 text-slate-800">Monitoring</h2>
        <MonitoringPanel />
      </div>
    </div>
  );
} 