/**
 * /main/page.tsx - Main Application Entry Point
 * ============================================
 * 
 * PURPOSE:
 * - Main entry point for the travel AI bot application
 * - Provides context providers and error boundaries for the entire app
 * - Wraps the core App component with necessary React contexts
 * 
 * USAGE:
 * - Accessed via /main route from the landing page
 * - Entry point for the full-featured chat application
 * - Provides all necessary context providers for the app to function
 * 
 * CONTEXT PROVIDERS:
 * - TranscriptProvider: Manages chat transcript and message history
 * - EventProvider: Handles real-time events and SSE streams
 * - ActionProvider: Manages bot actions and function calls
 * 
 * FEATURES:
 * - Suspense boundary for loading states
 * - Context provider hierarchy for state management
 * - Error boundaries for graceful error handling
 * - Full application initialization
 * 
 * NAVIGATION:
 * - Accessed from landing page (/page.tsx) via "Main Application" button
 * - Contains the complete chat interface with voice and text capabilities
 * - Includes all travel-related functionality and agent interactions
 * 
 * COMPONENT HIERARCHY:
 * - Page (this component)
 *   - Suspense (loading fallback)
 *     - TranscriptProvider (message history)
 *       - EventProvider (real-time events)
 *         - ActionProvider (bot actions)
 *           - App (main application component)
 */

import React, { Suspense } from "react";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";
import { ActionProvider } from "@/botActionFramework/ActionContext";
import App from "../App";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TranscriptProvider>
        <EventProvider>
          <ActionProvider>
            <App />
          </ActionProvider>
        </EventProvider>
      </TranscriptProvider>
    </Suspense>
  );
}


