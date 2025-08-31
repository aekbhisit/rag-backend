import { useState, useEffect, useMemo, useCallback } from "react";
import { AgentConfig } from "@/app/types";
import { allAgentSets, defaultAgentSetKey } from "@/app/agents";

interface UseAgentSelectionReturn {
  selectedAgentName: string;
  setSelectedAgentName: React.Dispatch<React.SetStateAction<string>>;
  selectedAgentConfigSet: AgentConfig[] | null;
  setSelectedAgentConfigSet: React.Dispatch<React.SetStateAction<AgentConfig[] | null>>;
  agentSetKey: string;
  setAgentSetKey: React.Dispatch<React.SetStateAction<string>>;
  handleAgentChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleSelectedAgentChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

// Helper function to get URL parameters (only on client)
const getURLParams = () => {
  if (typeof window === 'undefined') return { agentConfig: null, agent: null };
  
  const urlParams = new URLSearchParams(window.location.search);
  return {
    agentConfig: urlParams.get("agentConfig"),
    agent: urlParams.get("agent")
  };
};

// Get default state (consistent between server and client) - memoized
let defaultStateCache: any = null;
const getDefaultState = () => {
  if (defaultStateCache) {
    return defaultStateCache;
  }
  
  const agents = allAgentSets[defaultAgentSetKey];
  defaultStateCache = {
    agentSetKey: defaultAgentSetKey,
    selectedAgentConfigSet: agents,
    selectedAgentName: agents[0]?.name || ""
  };
  
  return defaultStateCache;
};

// Helper function to get initial state from URL or defaults (client-only)
const getInitialStateFromURL = () => {
  const { agentConfig, agent } = getURLParams();
  
  let finalAgentConfig = agentConfig;
  if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
    finalAgentConfig = defaultAgentSetKey;
  }

  const agents = allAgentSets[finalAgentConfig];
  const agentKeyToUse = agent && agents.find(a => a.name === agent) 
    ? agent 
    : agents[0]?.name || "";

  return {
    agentSetKey: finalAgentConfig,
    selectedAgentConfigSet: agents,
    selectedAgentName: agentKeyToUse
  };
};

export function useAgentSelection(): UseAgentSelectionReturn {
  console.log('[useAgentSelection] Hook called');
  
  // Always start with default state to ensure server/client consistency
  const defaultState = useMemo(() => {
    console.log('[useAgentSelection] Computing default state...');
    return getDefaultState();
  }, []);
  
  const [selectedAgentName, setSelectedAgentName] = useState<string>(defaultState.selectedAgentName);
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(defaultState.selectedAgentConfigSet);
  const [agentSetKey, setAgentSetKey] = useState<string>(defaultState.agentSetKey);
  const [isHydrated, setIsHydrated] = useState(false);
  
  console.log('[useAgentSelection] Initial state set:', {
    selectedAgentName: defaultState.selectedAgentName,
    agentSetKey: defaultState.agentSetKey,
    hasConfigSet: !!defaultState.selectedAgentConfigSet
  });

  // Hydration effect - only runs on client after hydration
  useEffect(() => {
    console.log('[useAgentSelection] Hydration effect running...');
    setIsHydrated(true);
    
    // Now that we're hydrated, check URL and update state if needed
    const urlState = getInitialStateFromURL();
    
    // Only update if URL state is different from default
    if (urlState.agentSetKey !== defaultState.agentSetKey || 
        urlState.selectedAgentName !== defaultState.selectedAgentName) {
      console.log('[useAgentSelection] Updating state from URL after hydration:', urlState);
      
      // Batch all state updates together to prevent multiple re-renders
      setAgentSetKey(urlState.agentSetKey);
      setSelectedAgentConfigSet(urlState.selectedAgentConfigSet);
      setSelectedAgentName(urlState.selectedAgentName);
    } else {
      console.log('[useAgentSelection] URL state matches default, no update needed');
    }
  }, []); // Only run once after hydration
  
  // Listen for URL changes (back/forward navigation) - only after hydration
  useEffect(() => {
    if (!isHydrated) return;
    
    const handlePopState = () => {
      console.log('[useAgentSelection] URL changed - updating state');
      const { agentConfig, agent } = getURLParams();
      
      if (agentConfig && allAgentSets[agentConfig]) {
        const agents = allAgentSets[agentConfig];
        const agentKeyToUse = agent && agents.find(a => a.name === agent) 
          ? agent 
          : agents[0]?.name || "";
          
        // Batch state updates for better performance
        setAgentSetKey(agentConfig);
        setSelectedAgentConfigSet(agents);
        setSelectedAgentName(agentKeyToUse);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isHydrated]);
  
  // Handler for changing agent set - memoized with useCallback to prevent recreation
  const handleAgentChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentConfig = e.target.value;
    const newAgents = allAgentSets[newAgentConfig];
    const newAgentName = newAgents[0]?.name || "";
    
    console.log('[useAgentSelection] Agent set change:', { newAgentConfig, newAgentName });
    
    // Batch state updates using React 18's automatic batching
    setAgentSetKey(newAgentConfig);
    setSelectedAgentConfigSet(newAgents);
    setSelectedAgentName(newAgentName);
    
    // Update URL without reload (only if hydrated)
    if (isHydrated) {
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", newAgentConfig);
      url.searchParams.delete("agent"); // Reset to first agent in set
      window.history.pushState({}, "", url.toString());
    }
  }, [isHydrated]);

  // Handler for selecting a specific agent from the set - memoized with useCallback
  const handleSelectedAgentChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentName = e.target.value;
    console.log('[useAgentSelection] Agent change:', { newAgentName });
    
    setSelectedAgentName(newAgentName);
    
    // Update URL without reload (only if hydrated)
    if (isHydrated) {
      const url = new URL(window.location.toString());
      url.searchParams.set("agent", newAgentName);
      window.history.pushState({}, "", url.toString());
    }
  }, [isHydrated]);

  return {
    selectedAgentName,
    setSelectedAgentName,
    selectedAgentConfigSet,
    setSelectedAgentConfigSet,
    agentSetKey,
    setAgentSetKey,
    handleAgentChange,
    handleSelectedAgentChange,
  };
} 