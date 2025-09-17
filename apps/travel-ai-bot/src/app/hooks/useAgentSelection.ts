import { useState, useEffect, useMemo, useCallback } from "react";
import { AgentConfig } from "@/app/types";
import { useDbAgentSets } from "@/app/hooks/useDbAgentSets";

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

export function useAgentSelection(): UseAgentSelectionReturn {
  console.log('[useAgentSelection] Hook called');
  const { agentSets: dbAgentSets } = useDbAgentSets();
  const effectiveSets: Record<string, AgentConfig[]> = useMemo(() => {
    return Object.keys(dbAgentSets || {}).length > 0 ? dbAgentSets : { default: [] };
  }, [dbAgentSets]);
  const defaultAgentSetKey = 'default';

  // Compute default state based on DB sets
  const defaultState = useMemo(() => {
    console.log('[useAgentSelection] Computing default state...');
    const setKey = defaultAgentSetKey;
    const set = effectiveSets[setKey] || [];
    const firstAgentName = set[0]?.name || "";
    return {
      agentSetKey: setKey,
      selectedAgentConfigSet: set.length ? set : null,
      selectedAgentName: firstAgentName
    } as any;
  }, [effectiveSets]);

  const [selectedAgentName, setSelectedAgentName] = useState<string>(defaultState.selectedAgentName);
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(defaultState.selectedAgentConfigSet);
  const [agentSetKey, setAgentSetKey] = useState<string>(defaultState.agentSetKey);
  const [isHydrated, setIsHydrated] = useState(false);

  console.log('[useAgentSelection] Initial state set:', {
    selectedAgentName: defaultState.selectedAgentName,
    agentSetKey: defaultState.agentSetKey,
    hasConfigSet: !!defaultState.selectedAgentConfigSet
  });

  // Hydration + URL effect
  useEffect(() => {
    console.log('[useAgentSelection] Hydration effect running...');
    setIsHydrated(true);
    const { agentConfig, agent } = getURLParams();
    const setKey = agentConfig && effectiveSets[agentConfig] ? agentConfig : defaultAgentSetKey;
    const set = effectiveSets[setKey] || [];
    const agentName = agent && set.find(a => a.name === agent) ? agent : (set[0]?.name || "");
    setAgentSetKey(setKey);
    setSelectedAgentConfigSet(set.length ? set : null);
    setSelectedAgentName(agentName);
  }, [effectiveSets]);

  // Listen for URL changes (back/forward navigation) - only after hydration
  useEffect(() => {
    if (!isHydrated) return;
    const handlePopState = () => {
      console.log('[useAgentSelection] URL changed - updating state');
      const { agentConfig, agent } = getURLParams();
      const setKey = agentConfig && effectiveSets[agentConfig] ? agentConfig : agentSetKey;
      const set = effectiveSets[setKey] || [];
      const agentName = agent && set.find(a => a.name === agent) ? agent : (set[0]?.name || "");
      setAgentSetKey(setKey);
      setSelectedAgentConfigSet(set.length ? set : null);
      setSelectedAgentName(agentName);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isHydrated, effectiveSets, agentSetKey]);

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSetKey = e.target.value;
    const set = effectiveSets[newSetKey] || [];
    const firstAgentName = set[0]?.name || "";
    setAgentSetKey(newSetKey);
    setSelectedAgentConfigSet(set.length ? set : null);
    setSelectedAgentName(firstAgentName);
    if (isHydrated) {
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", newSetKey);
      url.searchParams.set("agent", firstAgentName);
      window.history.pushState({}, "", url.toString());
    }
  };

  const handleSelectedAgentChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentName = e.target.value;
    console.log('[useAgentSelection] Agent change:', { newAgentName });
    setSelectedAgentName(newAgentName);
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