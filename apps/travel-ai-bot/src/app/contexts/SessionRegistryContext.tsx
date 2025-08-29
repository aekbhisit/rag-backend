"use client";

import React, { createContext, useContext } from 'react';
import { useSessionRegistry } from '../hooks/useSessionRegistry';

// Create context with the session registry hook return type
const SessionRegistryContext = createContext<ReturnType<typeof useSessionRegistry> | null>(null);

export const SessionRegistryProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const sessionRegistry = useSessionRegistry();
  
  return (
    <SessionRegistryContext.Provider value={sessionRegistry}>
      {children}
    </SessionRegistryContext.Provider>
  );
};

export const useSessionRegistryContext = () => {
  const context = useContext(SessionRegistryContext);
  if (!context) {
    throw new Error('useSessionRegistryContext must be used within a SessionRegistryProvider');
  }
  return context;
}; 