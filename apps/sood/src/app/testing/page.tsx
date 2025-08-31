"use client";

import React, { useState, useEffect } from 'react';
import { ActionProvider } from '@/botActionFramework';
import ActionPlayground from './ActionPlayground';
import MultiChannelTester from '@/app/components/MultiChannelTester';
import APIEndpointTester from '@/app/components/APIEndpointTester';
import MultiChannelInterface from '@/app/components/MultiChannelInterface';

/**
 * Testing page for the Bot Action Framework and Multi-Channel System
 * This page provides a UI for testing actions and channel routing without the voice integration
 */
export default function TestingPage() {
  // Generate a test session ID - avoid hydration mismatch
  const [testSessionId, setTestSessionId] = useState<string>('');
  
  // Set session ID after component mounts to avoid hydration mismatch
  useEffect(() => {
    setTestSessionId(`test-session-${Date.now()}`);
  }, []);
  
  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">Testing Playground</h1>
      
      {/* Integrated Chat App (Phases 6 & 7) */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-slate-700">
          🚀 Integrated Chat App (Phases 6 & 7) - NEW!
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-4">
            Complete integrated application with configuration management and app integration.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-700 text-sm">
              <strong>Note:</strong> The integrated app is available as a separate page. 
              <a href="/chat" className="underline ml-1 text-blue-800 hover:text-blue-900">
                Visit the Chat Application →
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Multi-Channel Interface (Phases 4 & 5) */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-slate-700">Multi-Channel Interface (Phases 4 & 5)</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-4">
            Complete multi-channel communication interface with UI components and enhanced communication hook.
          </p>
          {testSessionId ? (
            <MultiChannelInterface 
              sessionId={testSessionId}
              onMessageSent={(message) => console.log('Message sent:', message)}
              onResponseReceived={(response) => console.log('Response received:', response)}
              initialChannel="normal"
            />
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-600">Initializing session...</p>
            </div>
          )}
        </div>
      </section>

      {/* API Endpoint Tester */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-slate-700">API Endpoints (Phase 3)</h2>
        <APIEndpointTester />
      </section>

      {/* Multi-Channel Communication Tester */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-slate-700">Multi-Channel Communication System (Phases 1-2)</h2>
        {testSessionId ? (
          <MultiChannelTester 
            sessionId={testSessionId}
            language="en-US"
            sessionStatus="DISCONNECTED"
          />
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600">Initializing session...</p>
          </div>
        )}
      </section>
      
      {/* Bot Action Framework Tester */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-slate-700">Bot Action Framework</h2>
        <ActionProvider>
          <ActionPlayground />
        </ActionProvider>
      </section>
    </div>
  );
} 